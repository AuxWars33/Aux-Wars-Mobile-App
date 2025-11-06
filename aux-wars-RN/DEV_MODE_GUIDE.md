# Development Mode Guide

## Overview

Development mode allows you to test the Aux Wars app on multiple simulators without needing to authenticate with Spotify on each device. This is particularly useful when testing multiplayer features.

## How to Enable Dev Mode

### Option 1: Using .env file (Recommended)

1. Create a `.env` file in the `aux-wars-RN` directory if it doesn't exist
2. Add the following line to your `.env` file:

```bash
EXPO_PUBLIC_DEV_MODE=true
```

3. Restart your Expo development server

### Option 2: Temporary Environment Variable

Run your app with the dev mode flag:

```bash
EXPO_PUBLIC_DEV_MODE=true npx expo start
```

## What Dev Mode Does

When `EXPO_PUBLIC_DEV_MODE=true`, the app will:

✅ **Bypass Spotify authentication** - No need to log in on each simulator
✅ **Return mock data** - Pre-populated artist and track data for testing
✅ **Log dev mode actions** - Console logs prefixed with `[DEV MODE]` for debugging
✅ **Work immediately** - No authentication flow required

## Mock Data Available

### Artists
- Drake
- Taylor Swift
- The Weeknd

### Tracks
- 10 mock Drake songs including:
  - One Dance
  - God's Plan
  - Hotline Bling
  - In My Feelings
  - And more...

## Running Multiple Simulators with Dev Mode

1. **Enable dev mode** in your `.env` file:
   ```bash
   EXPO_PUBLIC_DEV_MODE=true
   ```

2. **Start the first simulator:**
   ```bash
   cd /Users/kylemcknight/Downloads/Aux-Wars-Mobile-App/aux-wars-RN
   npx expo run:ios --device "iPhone 17 Pro"
   ```

3. **In a new terminal, start the second simulator:**
   ```bash
   cd /Users/kylemcknight/Downloads/Aux-Wars-Mobile-App/aux-wars-RN
   npx expo run:ios --device "iPhone 17 Pro Max"
   ```

4. **Both simulators will work without authentication!** 🎉

## Console Logs

When dev mode is active, you'll see logs like:

```
[DEV MODE] Returning mock access token
[DEV MODE] Searching for artists: drake
[DEV MODE] Getting top tracks for artist: mock-artist-1
[DEV MODE] Authentication check - returning true
```

## Disabling Dev Mode

To return to production mode with real Spotify authentication:

1. Set `EXPO_PUBLIC_DEV_MODE=false` in your `.env` file
2. Or remove the line entirely
3. Restart your Expo development server

## Best Practices

⚠️ **Important Notes:**

- Dev mode is for **development and testing only**
- Always test with real Spotify authentication before deploying
- Don't commit `.env` files with sensitive credentials
- Mock data is limited - real Spotify API returns much more data

## Troubleshooting

### Dev mode not working?

1. **Check environment variable:**
   - Ensure `EXPO_PUBLIC_DEV_MODE=true` in your `.env` file
   - Expo variables must start with `EXPO_PUBLIC_` to work in the app

2. **Restart the dev server:**
   - Stop your Expo server (Ctrl+C)
   - Clear cache: `npx expo start -c`
   - Start again

3. **Check console logs:**
   - Look for `[DEV MODE]` messages
   - If you don't see them, dev mode isn't active

### Still seeing authentication errors?

- Make sure you restarted the Expo dev server after adding the environment variable
- Environment variables are loaded at build time, not runtime
- Try clearing cache: `npx expo start --clear`

## Example .env File

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Spotify Configuration
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
EXPO_PUBLIC_SPOTIFY_REDIRECT_URI=auxwarsrn://spotify-callback

# Backend Configuration
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000

# Environment
EXPO_PUBLIC_ENV=development

# Development Mode (Set to 'true' for testing on multiple simulators)
EXPO_PUBLIC_DEV_MODE=true
```

## Questions?

If you have questions or run into issues, check the main README or contact the development team.

