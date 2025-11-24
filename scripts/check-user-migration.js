#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserMigration() {
  try {
    console.log('Checking migration status for test@test.com...\n');

    // 1. Find the user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const testUser = users.users.find(u => u.email === 'test@test.com');
    if (!testUser) {
      console.log('❌ User test@test.com not found');
      return;
    }

    console.log('✅ Found user test@test.com');
    console.log('   User ID:', testUser.id);
    console.log('   Created:', new Date(testUser.created_at).toLocaleString());
    console.log('   Provider:', testUser.app_metadata?.provider);
    console.log('');

    // 2. Check profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUser.id)
      .single();

    if (profileError) {
      console.log('❌ No profile found for this user');
    } else {
      console.log('✅ Profile found:');
      console.log('   First name:', profile.first_name || '(not set)');
      console.log('   Onboarding completed:', profile.onboarding_completed || false);
      console.log('   Timezone:', profile.timezone || '(not set)');
      console.log('   Initial motivation:', profile.initial_motivation || '(not set)');
      console.log('   Faith tradition:', profile.faith_tradition || '(not set)');
      console.log('');
    }

    // 3. Check prayer people
    const { data: prayerPeople, error: peopleError } = await supabase
      .from('prayer_focus_people')
      .select('*')
      .eq('user_id', testUser.id);

    if (peopleError) {
      console.log('❌ Error fetching prayer people:', peopleError.message);
    } else {
      console.log(`✅ Prayer people: ${prayerPeople.length} found`);
      prayerPeople.forEach((person, i) => {
        console.log(`   ${i + 1}. ${person.first_name} (${person.relationship})`);
      });
      console.log('');
    }

    // 4. Check intentions
    const { data: intentions, error: intentionsError } = await supabase
      .from('prayer_intentions')
      .select('*')
      .eq('user_id', testUser.id);

    if (intentionsError) {
      console.log('❌ Error fetching intentions:', intentionsError.message);
    } else {
      console.log(`✅ Intentions: ${intentions.length} found`);
      intentions.forEach((intention, i) => {
        console.log(`   ${i + 1}. ${intention.title}`);
      });
      console.log('');
    }

    // 5. Check prayers
    const { data: prayers, error: prayersError } = await supabase
      .from('prayers')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (prayersError) {
      console.log('❌ Error fetching prayers:', prayersError.message);
    } else {
      console.log(`✅ Recent prayers: ${prayers.length} found`);
      prayers.forEach((prayer, i) => {
        console.log(`   ${i + 1}. Created: ${new Date(prayer.created_at).toLocaleString()}`);
      });
      console.log('');
    }

    // 6. Look for any orphaned anonymous data
    console.log('Checking for orphaned anonymous users...');
    const anonymousUsers = users.users.filter(u => 
      u.app_metadata?.provider === 'anonymous' && 
      u.created_at && 
      new Date(u.created_at) > new Date('2025-01-27') // Recent anonymous users
    );

    if (anonymousUsers.length > 0) {
      console.log(`\nFound ${anonymousUsers.length} recent anonymous users:`);
      for (const anonUser of anonymousUsers) {
        console.log(`\n   Anonymous User ID: ${anonUser.id}`);
        console.log(`   Created: ${new Date(anonUser.created_at).toLocaleString()}`);
        
        // Check if this user has data
        const { data: anonProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', anonUser.id)
          .single();
        
        if (anonProfile) {
          console.log('   Has profile data:', {
            first_name: anonProfile.first_name,
            onboarding_completed: anonProfile.onboarding_completed
          });
        }
      }
    }

  } catch (error) {
    console.error('Error checking migration:', error);
  }
}

checkUserMigration();