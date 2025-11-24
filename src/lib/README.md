# Authentication Implementation

This directory contains the core authentication implementation for Personal Prayers using Supabase.

## Key Files

- `supabaseClient.ts`: Creates and configures the Supabase client for interacting with Supabase services
- `auth.ts`: Provides authentication helper functions that wrap Supabase auth methods

## Authentication Flow

The app supports the following authentication flows:

1. **Anonymous authentication**: Users can access basic features without creating an account
2. **Email/password authentication**: Standard user registration and login
3. **Password recovery**: Standard "forgot password" flow

## Usage Examples

### Import the authentication functions

```typescript
import { signIn, signUp, signOut, resetPassword } from '../lib/auth';
```

### Sign up a new user

```typescript
const handleSignUp = async (email: string, password: string) => {
  const { data, error } = await signUp(email, password);
  
  if (error) {
    // Handle error
    console.error('Sign up failed:', error.message);
    return;
  }
  
  // User registered successfully
  console.log('User signed up:', data);
};
```

### Sign in a user

```typescript
const handleSignIn = async (email: string, password: string) => {
  const { data, error } = await signIn(email, password);
  
  if (error) {
    // Handle error
    console.error('Sign in failed:', error.message);
    return;
  }
  
  // User signed in successfully
  console.log('User signed in:', data);
};
```

### Sign in anonymously

```typescript
const handleAnonymousSignIn = async () => {
  const { data, error } = await signInAnonymously();
  
  if (error) {
    // Handle error
    console.error('Anonymous sign in failed:', error.message);
    return;
  }
  
  // User signed in anonymously
  console.log('User signed in anonymously:', data);
};
```

### Sign out

```typescript
const handleSignOut = async () => {
  const { data, error } = await signOut();
  
  if (error) {
    // Handle error
    console.error('Sign out failed:', error.message);
    return;
  }
  
  // User signed out successfully
  console.log('User signed out');
};
```

### Password reset

```typescript
const handleResetPassword = async (email: string) => {
  const { data, error } = await resetPassword(email);
  
  if (error) {
    // Handle error
    console.error('Password reset failed:', error.message);
    return;
  }
  
  // Password reset email sent
  console.log('Password reset email sent');
};
```

## Environment Variables

The authentication system requires the following environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

These should be defined in a `.env` file at the project root.

## Error Handling

All authentication functions return a consistent response format:

```typescript
{
  data: T | null;  // The data returned on success
  error: {         // Error information on failure
    message: string;
    status?: number;
  } | null;
}
```

This allows for consistent error handling across the application. 