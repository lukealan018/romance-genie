

# Skip Login During Development

Since the app isn't live yet, we'll bypass the authentication requirement so you can use the app without logging in.

## What Changes

1. **Home page (`src/hooks/useAuthAndProfile.ts`)** -- When no session is found, instead of redirecting to `/login`, the app will continue loading with a guest/anonymous experience. It will use your saved profile preferences (ZIP, radius, cuisines) if a dev fallback is active, or just let you use the app without a user ID.

2. **Simple approach** -- We'll use the existing dev-utils system. Right now it requires `?dev=true` in the URL. We'll update it so that in the development/preview environment, if there's no active session, the app simply skips the login redirect and loads the home page with default settings instead of bouncing you to login.

## How It Works

- In `useAuthAndProfile.ts`, when `getSession()` returns no user, instead of `navigate('/login')`, the hook will set a "guest mode" flag and continue with default preferences (your profile ZIP 90401, 25-mile radius, etc.)
- The app will still work for search, surprise me, etc. -- features that don't strictly require a user ID will function normally
- Features that need a user ID (saving plans, history, invites) will gracefully show a "sign in to save" prompt instead of crashing

## Technical Details

- Modify `src/hooks/useAuthAndProfile.ts`: Remove the `navigate('/login')` redirect when no session exists in dev/preview. Set a guest userId placeholder and load default filters.
- Modify `src/lib/dev-utils.ts`: Add an `isPreviewEnvironment()` helper that detects the Lovable preview URL, so dev bypass works automatically without needing `?dev=true` in the URL.
- The login page and auth callback remain intact for when you're ready to go live.

