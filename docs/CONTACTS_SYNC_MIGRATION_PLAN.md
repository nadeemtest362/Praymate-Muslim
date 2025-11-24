# Contacts Sync & Social Connections Migration Plan

## Current State Analysis

### Existing Tables
**`prayer_focus_people`** - Users that are added to prayer circle (local only, not social)
- `id` (UUID)
- `user_id` (UUID) - FK to auth.users
- `name` (TEXT)
- `relationship` (TEXT)
- `gender` (TEXT)
- `image_uri` (TEXT)
- `phone_number_hash` (TEXT) - Only populated for selected contacts
- `device_contact_id` (TEXT) - Device-specific contact ID
- `email` (TEXT)
- `created_at` (TIMESTAMP)

**`profiles`** - User profiles
- Currently NO phone_number_hash column
- Need to add this for discovery

### Current Limitation
- Only hashes phone numbers for contacts explicitly added to prayer circle
- No bulk contact syncing for discovery
- No way to show "5 of your contacts are on Praymate!"
- No invite tracking system
- Missing social connection infrastructure

---

## Proposed Solution

### 1. Add Phone Hash to Profiles
Store each user's own phone number for discovery matching

```sql
-- Add to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number_hash TEXT UNIQUE;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash 
ON public.profiles(phone_number_hash) WHERE phone_number_hash IS NOT NULL;
```

### 2. New Table: `user_contacts`
Stores ALL contacts from user's device (hashed for privacy) - FOR DISCOVERY ONLY

```sql
CREATE TABLE public.user_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contact identification (hashed for privacy)
  phone_number_hash TEXT NOT NULL,
  
  -- Sync tracking
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each user can only have one entry per phone hash
  UNIQUE(user_id, phone_number_hash),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_contacts_user_id ON public.user_contacts(user_id);
CREATE INDEX idx_user_contacts_phone_hash ON public.user_contacts(phone_number_hash);
CREATE INDEX idx_user_contacts_user_phone ON public.user_contacts(user_id, phone_number_hash);

-- RLS Policies
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON public.user_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON public.user_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON public.user_contacts
  FOR DELETE USING (auth.uid() = user_id);
```

### 3. New Table: `invites`
Tracks invitations sent to non-users

```sql
CREATE TABLE public.invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Who sent the invite
  inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Who it was sent to (phone hash only for privacy)
  invitee_phone_hash TEXT NOT NULL,
  
  -- Tracking
  invite_code TEXT NOT NULL UNIQUE, -- Unique code for tracking link
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Conversion tracking
  accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Ensure no duplicate pending invites
  CONSTRAINT no_duplicate_pending_invites UNIQUE (inviter_user_id, invitee_phone_hash, status)
);

-- Indexes for performance
CREATE INDEX idx_invites_inviter ON public.invites(inviter_user_id);
CREATE INDEX idx_invites_phone_hash ON public.invites(invitee_phone_hash);
CREATE INDEX idx_invites_code ON public.invites(invite_code);
CREATE INDEX idx_invites_status ON public.invites(status);

-- RLS Policies
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invites" ON public.invites
  FOR SELECT USING (auth.uid() = inviter_user_id);

CREATE POLICY "Users can insert own invites" ON public.invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_user_id);

CREATE POLICY "Users can update own invites" ON public.invites
  FOR UPDATE USING (auth.uid() = inviter_user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4. New Table: `connections`
Actual social connections (explicit prayer circle adds)

```sql
CREATE TABLE public.connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- The two users who are connected
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Connection metadata
  connection_type TEXT NOT NULL DEFAULT 'prayer_circle' CHECK (connection_type IN ('prayer_circle', 'mutual')),
  
  -- Tracking how connection was made
  source TEXT NOT NULL CHECK (source IN ('invite', 'manual_add', 'contact_discovery')),
  invite_id UUID REFERENCES public.invites(id) ON DELETE SET NULL, -- If created from invite
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure no duplicate connections (order doesn't matter)
  CONSTRAINT no_duplicate_connections UNIQUE (user_id_1, user_id_2),
  CONSTRAINT users_are_different CHECK (user_id_1 != user_id_2),
  CONSTRAINT ordered_user_ids CHECK (user_id_1 < user_id_2)
);

-- Indexes for performance
CREATE INDEX idx_connections_user1 ON public.connections(user_id_1);
CREATE INDEX idx_connections_user2 ON public.connections(user_id_2);
CREATE INDEX idx_connections_type ON public.connections(connection_type);
CREATE INDEX idx_connections_source ON public.connections(source);

-- RLS Policies
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connections where they are involved" ON public.connections
  FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Only system can insert/update connections (via edge functions)
-- This prevents users from creating fake connections

-- Trigger to maintain ordering constraint
CREATE OR REPLACE FUNCTION ensure_connection_ordering()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id_1 > NEW.user_id_2 THEN
    -- Swap the IDs to maintain ordering
    DECLARE
      temp UUID;
    BEGIN
      temp := NEW.user_id_1;
      NEW.user_id_1 := NEW.user_id_2;
      NEW.user_id_2 := temp;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connection_ordering_trigger
  BEFORE INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION ensure_connection_ordering();
```

---

## User Flows

### Flow 1: Sync Contacts & Discover (Like Locket)

**Step 1: User grants contacts permission**
```
User → Grants permission
     → App calls edge function `sync-contacts` with ALL phone numbers
     → Edge function hashes all numbers
     → Stores in `user_contacts` table
```

**Step 2: Discovery (NO connections created yet)**
```
System → Matches user_contacts.phone_number_hash against profiles.phone_number_hash
       → Returns: "5 of your contacts are on Praymate!"
       → Shows list of discoverable users
```

**Step 3: User explicitly adds someone (creates connection)**
```
User → Taps "Add to Prayer Circle" on discovered contact
     → System creates connection record
     → Connection source: 'contact_discovery'
     → Now they are connected
```

### Flow 2: Invite Non-User

**Step 1: User invites someone not on app**
```
User → Taps "Invite" on contact not found on app
     → System creates invite record with unique code
     → Generates deep link: justpray://invite?code=ABC123
     → Sends SMS with link
```

**Step 2: Invitee joins via link**
```
Invitee → Clicks link → Opens app with invite code
        → Completes onboarding with phone auth
        → System converts invite to connection
        → Connection source: 'invite'
        → Both users now connected
```

### Flow 3: Manual Add (Existing Flow)

**User adds someone manually without phone number**
```
User → Manually enters name/details
     → Creates prayer_focus_people record (local only)
     → NO connection created (not a social connection)
```

---

## Edge Functions

### `sync-contacts`
Bulk hashes contacts and stores for discovery

```typescript
// supabase/functions/sync-contacts/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.168.0/hash/mod.ts'

interface ContactSync {
  phoneNumbers: string[] // Raw phone numbers from device
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { phoneNumbers } = await req.json() as ContactSync
    
    // Rate limit: max 1 sync per 24 hours
    const { data: lastSync } = await supabase
      .from('user_contacts')
      .select('synced_at')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single()
    
    if (lastSync && (Date.now() - new Date(lastSync.synced_at).getTime()) < 24 * 60 * 60 * 1000) {
      return new Response(
        JSON.stringify({ error: 'Can only sync once per 24 hours' }),
        { status: 429 }
      )
    }
    
    // Hash all phone numbers
    const hashedContacts = phoneNumbers.map(phone => {
      const normalized = phone.replace(/\D/g, '') // Remove non-digits
      const hash = createHash('sha256').update(normalized).toString()
      return hash
    })
    
    // Batch upsert to user_contacts
    const contactRecords = hashedContacts.map(hash => ({
      user_id: user.id,
      phone_number_hash: hash,
      synced_at: new Date().toISOString()
    }))
    
    const { error: upsertError } = await supabase
      .from('user_contacts')
      .upsert(contactRecords, { onConflict: 'user_id,phone_number_hash' })
    
    if (upsertError) throw upsertError
    
    // Discover users (NOT auto-connect, just return matches)
    const { data: discoveredUsers, error: discoverError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, phone_number_hash')
      .in('phone_number_hash', hashedContacts)
      .neq('id', user.id) // Don't include self
    
    if (discoverError) throw discoverError
    
    return new Response(
      JSON.stringify({ 
        success: true,
        syncedCount: hashedContacts.length,
        discoveredUsers: discoveredUsers || []
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### `create-connection`
Explicitly creates social connection (user action required)

```typescript
// supabase/functions/create-connection/index.ts
interface CreateConnectionRequest {
  targetUserId: string
  source: 'invite' | 'manual_add' | 'contact_discovery'
  inviteId?: string // If from invite acceptance
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { targetUserId, source, inviteId } = await req.json() as CreateConnectionRequest
    
    // Verify target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', targetUserId)
      .single()
    
    if (targetError || !targetUser) {
      return new Response(JSON.stringify({ error: 'Target user not found' }), { status: 404 })
    }
    
    // Create connection (will auto-order user IDs via trigger)
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .insert({
        user_id_1: user.id,
        user_id_2: targetUserId,
        source,
        invite_id: inviteId,
        connection_type: 'prayer_circle'
      })
      .select()
      .single()
    
    if (connectionError) throw connectionError
    
    // If from invite, mark invite as accepted
    if (inviteId) {
      await supabase
        .from('invites')
        .update({ 
          status: 'accepted',
          accepted_by_user_id: targetUserId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', inviteId)
    }
    
    return new Response(
      JSON.stringify({ success: true, connection }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### `create-invite`
Creates invite for non-user

```typescript
// supabase/functions/create-invite/index.ts
interface CreateInviteRequest {
  phoneNumber: string // Raw phone number
  inviteMessage?: string
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { phoneNumber, inviteMessage } = await req.json() as CreateInviteRequest
    
    // Hash phone number
    const normalized = phoneNumber.replace(/\D/g, '')
    const phoneHash = createHash('sha256').update(normalized).toString()
    
    // Generate unique invite code
    const inviteCode = crypto.randomUUID().split('-')[0].toUpperCase()
    
    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        inviter_user_id: user.id,
        invitee_phone_hash: phoneHash,
        invite_code: inviteCode
      })
      .select()
      .single()
    
    if (inviteError) throw inviteError
    
    // Generate deep link
    const inviteLink = `https://justpray.app/invite?code=${inviteCode}`
    
    return new Response(
      JSON.stringify({ 
        success: true,
        invite,
        inviteLink,
        smsMessage: inviteMessage || `Join me on Praymate! ${inviteLink}`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Implementation Plan

### Phase 1: Database Setup (Week 1)
1. Create migration file: `supabase/migrations/YYYYMMDD_add_social_connections.sql`
2. Add `phone_number_hash` to `profiles`
3. Create `user_contacts` table
4. Create `invites` table
5. Create `connections` table
6. Test migration locally
7. Deploy to staging
8. Deploy to production

### Phase 2: Edge Functions (Week 1-2)
1. Create `sync-contacts` function
2. Create `create-connection` function
3. Create `create-invite` function
4. Test all functions with sample data
5. Add rate limiting
6. Deploy to staging
7. Deploy to production

### Phase 3: Client Integration - Discovery (Week 2-3)
1. Create `src/repositories/contactsRepository.ts`
2. Update `PrayerPeopleScreen.tsx` to call `sync-contacts` on permission grant
3. Create "Discover Friends" screen showing matched contacts
4. Add "Add to Prayer Circle" button (calls `create-connection`)
5. Show connection count in UI

### Phase 4: Client Integration - Invites (Week 3-4)
1. Add "Invite" button for non-matched contacts
2. Integrate SMS sharing with invite link
3. Handle deep link on app open: `justpray://invite?code=ABC`
4. Auto-create connection when invite accepted
5. Show "invited by X" during onboarding

### Phase 5: Phone Auth Migration (Week 5-6)
1. Add phone number input screen early in onboarding
2. Verify phone via SMS
3. Store phone hash in `profiles.phone_number_hash`
4. Update all flows to use phone as primary ID

---

## Privacy & Security

### ✅ Privacy Preserving
- Only phone number **hashes** stored (SHA-256, irreversible)
- No contact names, emails, or PII synced
- Discovery only shows users already on platform
- Connections require explicit user action

### ✅ User Control
- Explicit permission before syncing
- Can revoke anytime via iOS Settings
- Can block/remove connections
- Clear messaging: "Find friends already on Praymate"

### ⚠️ Rate Limiting
- Max 1 contact sync per 24 hours
- Max 10 invites per day per user
- Edge function timeout: 30 seconds
- Max 5000 contacts per sync

---

## Migration Checklist

- [ ] Create migration SQL file
- [ ] Test locally with `supabase db reset`
- [ ] Create edge functions (sync-contacts, create-connection, create-invite)
- [ ] Test edge functions
- [ ] Update contact permission flow
- [ ] Create discovery UI
- [ ] Create invite flow UI
- [ ] Test full flows in staging
- [ ] Deploy to production
- [ ] Monitor analytics

---

## Key Differences from Previous Plan

❌ **WRONG:** Auto-create connections when contacts synced
✅ **RIGHT:** Discovery only, user must explicitly add

❌ **WRONG:** "Mutual" connections required
✅ **RIGHT:** One-way adds (like Instagram), can be reciprocated later

❌ **WRONG:** Connections = having each other in contacts
✅ **RIGHT:** Connections = explicit add to prayer circle

This is how Locket, Instagram, Snapchat, etc. all work.
