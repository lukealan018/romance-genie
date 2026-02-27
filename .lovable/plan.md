
# Redo Login: Email/Password + Google Sign-In

Replace the magic link login with a clean email/password auth flow plus one-tap Google OAuth, all styled to the Romance Genie design system.

## What Changes

### 1. Rewrite `src/pages/Login.tsx`
Replace the magic link flow with a **tabbed login/signup** experience:
- **Sign In tab**: Email + password fields, "Forgot password?" link, submit button
- **Sign Up tab**: Email + password + confirm password fields, submit button
- **Google Sign-In**: "Continue with Google" button below the form (works in both tabs)
- Uses `supabase.auth.signInWithPassword()` for login
- Uses `supabase.auth.signUp()` for registration (with `emailRedirectTo` for verification)
- Uses `lovable.auth.signInWithOAuth("google", ...)` for Google (managed by Lovable Cloud)
- All styled with Romance Genie design system: dark panels, theme-aware glow, `btn-theme-primary`, no hardcoded colors

### 2. Configure Google OAuth
- Call the Configure Social Login tool to generate the `src/integrations/lovable/` module for managed Google OAuth
- Import and use `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`

### 3. Create `src/pages/ResetPassword.tsx` (new file)
- "Forgot password" page that calls `supabase.auth.resetPasswordForEmail()`
- Shows a confirmation message after sending
- Styled to match the login page

### 4. Create `src/pages/UpdatePassword.tsx` (new file)
- The page users land on after clicking the password reset link
- Checks for `type=recovery` in URL hash
- Form to enter new password + confirm
- Calls `supabase.auth.updateUser({ password })`
- Redirects to home after success

### 5. Update `src/App.tsx`
- Add routes: `/reset-password` and `/update-password`
- Import the new page components

### 6. Update `src/pages/AuthCallback.tsx`
- Keep the PKCE/token exchange logic (still needed for email verification and password reset redirects)
- Update copy from "magic link" references to generic "Verifying your account..."
- Restyle to use Romance Genie design system (currently uses hardcoded `slate-*` colors)

### 7. Update `src/hooks/useAuthAndProfile.ts`
- Change `navigate('/login')` references — no logic changes needed, just ensure the redirect target is still `/login`
- No functional changes required since auth session handling is provider-agnostic

### 8. Update profile edge function validation
- The `profile` edge function currently requires `cuisines` and `activities` as arrays in the POST body
- Make these optional (default to empty arrays) so the slim onboarding flow (which only sends `nickname` + `home_zip`) doesn't fail

### 9. Delete dead code
- `src/pages/ProfileSetup.tsx` — 800-line dead file, not routed anywhere

## Files Summary

| File | Action |
|------|--------|
| `src/pages/Login.tsx` | Rewrite (email/password + Google) |
| `src/pages/ResetPassword.tsx` | Create (forgot password form) |
| `src/pages/UpdatePassword.tsx` | Create (set new password after reset) |
| `src/pages/AuthCallback.tsx` | Restyle + update copy |
| `src/App.tsx` | Add 2 new routes |
| `supabase/functions/profile/index.ts` | Make cuisines/activities optional |
| `src/pages/ProfileSetup.tsx` | Delete (dead code) |

## What Stays the Same
- The auth session handling in `useAuthAndProfile.ts` (provider-agnostic)
- The onboarding flow (just simplified in previous step)
- All existing edge functions and database schema
- The `ProfileCompletionPrompt` for progressive profiling
