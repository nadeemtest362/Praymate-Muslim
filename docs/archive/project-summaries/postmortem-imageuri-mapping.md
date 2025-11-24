> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# Postmortem: imageUri/image_uri Mapping Issue

## Date: January 15, 2025

## Summary
A pervasive naming inconsistency between the database field `image_uri` (snake_case) and client-side usage of `imageUri` (camelCase) created unnecessary complexity, maintenance burden, and potential bugs throughout the codebase.

## Timeline
- **Initial State**: Database used `image_uri` (snake_case) as the field name
- **Problem Introduction**: Client-side code began using `imageUri` (camelCase) for "JavaScript conventions"
- **Proliferation**: Mapping logic spread across stores, components, and utilities
- **Discovery**: During Avatar component refactoring, the extent of the mapping became apparent
- **Resolution**: Complete migration to use `image_uri` consistently throughout the codebase

## Root Cause Analysis

### Why It Happened
1. **Convention Mismatch**: Developer preference for camelCase in JavaScript vs snake_case in database
2. **Incremental Spread**: Once one component used `imageUri`, others followed for "consistency"
3. **Hidden Complexity**: Image URL resolver added `imageUri` property alongside `image_uri`
4. **No Clear Standard**: Lack of explicit guidance on field naming conventions

### Impact
1. **Code Complexity**: Every data fetch required mapping between naming conventions
2. **Confusion**: Developers unsure which field name to use in different contexts
3. **Bug Risk**: Easy to accidentally use wrong field name, causing runtime errors
4. **Maintenance Burden**: Extra code to maintain the mapping layer
5. **Performance**: Unnecessary object transformations on every data operation

## What Went Wrong
1. **Not Following Database Schema**: Client deviated from source of truth
2. **Solving Non-Problems**: Creating "consistency" that wasn't needed
3. **Hidden Side Effects**: imageUrlResolver silently adding properties
4. **No Team Discussion**: Unilateral decision without considering implications

## What Went Right
1. **Clean Migration Path**: Avatar component's dual-prop support enabled gradual migration
2. **Comprehensive Search**: Able to find all instances using grep/ast-grep
3. **Type Safety**: TypeScript interfaces made it easier to track changes
4. **Hot Module Reloading**: Could test changes without app restarts

## Lessons Learned

### 1. Use Database Field Names As-Is
- The database is the source of truth
- Avoid unnecessary mappings between layers
- If the database uses snake_case, use snake_case in the client

### 2. Question Convention Assumptions
- "JavaScript uses camelCase" doesn't mean you must transform database fields
- Consistency with your data source > consistency with language conventions
- Many successful JS/TS projects use snake_case for database fields

### 3. Consider Long-Term Impact
- Small decisions (field naming) can have large cumulative effects
- Mapping layers add complexity that compounds over time
- Think about maintenance burden before adding transformations

### 4. Make Explicit Decisions
- Document naming conventions in project guidelines
- Discuss with team before establishing patterns
- Add to CLAUDE.md/AGENT.md to ensure consistency

## Action Items Completed
1. ✅ Updated all stores to use `image_uri` consistently
2. ✅ Updated all component interfaces and types
3. ✅ Removed imageUri mapping from imageUrlResolver
4. ✅ Updated all Avatar component usages
5. ✅ Removed dead code (PersonCarousel, TestAuthButton)
6. ✅ Created migration documentation
7. ✅ Updated project guidelines

## Prevention Measures
1. **Follow Database Schema**: Always use database field names as-is
2. **Document Conventions**: Explicitly document naming decisions
3. **Review Data Flow**: Regularly review data transformations for necessity
4. **Question Mappings**: Any field name mapping should be justified and documented

## Conclusion
While the migration was successful, this issue highlights the importance of:
- Respecting data source conventions
- Avoiding unnecessary abstractions
- Making explicit, documented decisions about naming conventions
- Considering long-term maintenance implications

The codebase is now cleaner, more maintainable, and follows a consistent pattern of using database field names directly.