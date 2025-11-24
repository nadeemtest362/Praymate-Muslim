> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Personal Prayers Monorepo Reorganization Plan

## Current Issues
- Mixed concerns in root directory
- Services folder contains both APIs and full apps
- Mobile app code split between `app/` and `src/`
- Random files cluttering root
- No clear separation between mobile and admin code

## Proposed New Structure

```
personal-prayers/
├── apps/                          # All applications
│   ├── mobile/                    # React Native app (current root)
│   │   ├── app/                   # Expo Router pages
│   │   ├── src/                   # Components, stores, utils
│   │   ├── ios/                   # iOS native code
│   │   ├── android/               # Android native code  
│   │   ├── assets/                # Images, fonts, sounds
│   │   ├── app.json              
│   │   ├── eas.json
│   │   ├── metro.config.js
│   │   ├── package.json           # Mobile-specific deps
│   │   └── tsconfig.json
│   │
│   └── admin/                     # Command Center (from services/)
│       ├── src/                   # React web app
│       ├── public/               
│       ├── netlify/              
│       ├── package.json           # Admin-specific deps
│       └── vite.config.ts
│
├── services/                      # Standalone services only
│   ├── prayer-api/                # NestJS prayer service
│   ├── image-gen/                 # Image generation service
│   └── command-center-api/        # If kept separate from admin
│
├── packages/                      # Shared code
│   ├── shared-types/              # TypeScript types used by both apps
│   │   ├── src/
│   │   │   ├── database.ts       # Supabase table types
│   │   │   ├── onboarding.ts     # SDUI types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── supabase-client/           # Shared Supabase config
│       ├── src/
│       └── package.json
│
├── supabase/                      # Database & edge functions
│   ├── functions/
│   ├── migrations/
│   └── config.toml
│
├── docs/                          # All documentation
│   ├── architecture/
│   ├── onboarding/
│   ├── guides/
│   └── sdui_screen_configs/
│
├── scripts/                       # Build & maintenance scripts
├── .cursor/                       # Cursor rules
├── package.json                   # Root package.json for workspaces
├── turbo.json                     # Turborepo config (optional)
└── README.md
```

## Benefits

1. **Clear Separation**: Mobile and admin apps are clearly separated
2. **Shared Code**: Common types and utilities in `packages/`
3. **Cleaner Root**: Only essential config files at root
4. **Better Navigation**: Easy to understand where code lives
5. **Workspace Support**: Can use npm/yarn workspaces

## Migration Steps

### Phase 1: Create New Structure
```bash
# Create new directories
mkdir -p apps/mobile apps/admin packages/shared-types/src packages/supabase-client/src

# Move mobile app files
mv app src ios assets app.json eas.json metro.config.js index.ts App.tsx apps/mobile/
mv tsconfig.json apps/mobile/

# Move admin app
mv services/command-center-app/* apps/admin/

# Keep only actual services in services/
# (prayer-api, image-gen, etc.)
```

### Phase 2: Extract Shared Types
1. Create shared types package
2. Move database types, SDUI interfaces
3. Update imports in both apps

### Phase 3: Update Configurations
1. Setup npm workspaces in root package.json
2. Update import paths
3. Update build scripts
4. Test everything works

### Phase 4: Clean Up
1. Remove old empty directories
2. Move stray files to proper locations
3. Update documentation

## Alternative: Keep Current Structure But Organize

If full reorganization is too disruptive, we could:

1. **Just clean root directory**:
   - Move `migration.sql`, `types.ts`, `payload.json` to appropriate folders
   - Keep current app structure

2. **Rename for clarity**:
   - `services/command-center-app/` → `services/admin-dashboard/`
   - Add clear README files in each major directory

3. **Add workspace configuration**:
   - Setup npm workspaces without moving files
   - Better dependency management

## Recommendation

Start with the "Alternative" approach first:
1. Clean up root directory
2. Add better documentation
3. See if that's sufficient before doing major reorg

The full reorganization can be done later when you have more time and can properly test everything. 