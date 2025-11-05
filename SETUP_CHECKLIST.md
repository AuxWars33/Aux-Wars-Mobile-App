# 🎵 Aux Wars - Quick Setup Checklist

Use this checklist to get your development environment ready.

## ✅ Pre-Development Setup

### 1. Environment Files

- [ ] Create `/aux-wars-RN/.env` file with:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`
  - `EXPO_PUBLIC_SPOTIFY_REDIRECT_URI=auxwarsrn://spotify-callback`
  - `EXPO_PUBLIC_BACKEND_URL=http://localhost:3000`

- [ ] Create `/backend/.env` file with:
  - `PORT=3000`
  - `DATABASE_URL` (from Supabase)
  - `SPOTIFY_CLIENT_ID`
  - `SPOTIFY_CLIENT_SECRET`

### 2. Supabase Configuration

- [ ] Update Supabase schema with new fields:
  ```sql
  -- Add to sessions table (lowercase for PostgreSQL)
  ALTER TABLE sessions 
  ADD COLUMN IF NOT EXISTS artistid TEXT,
  ADD COLUMN IF NOT EXISTS artistname TEXT,
  ADD COLUMN IF NOT EXISTS artistimageurl TEXT,
  ADD COLUMN IF NOT EXISTS decksize INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS currentround INTEGER DEFAULT 0;
  ```

- [ ] Create player_decks table:
  ```sql
  CREATE TABLE IF NOT EXISTS player_decks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sessionId TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    userId TEXT REFERENCES users(id) ON DELETE CASCADE,
    songs JSONB,
    isSubmitted BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(sessionId, userId)
  );
  ```

- [ ] Enable Row Level Security policies (see IMPLEMENTATION_GUIDE.md)

### 3. Spotify Developer Account

- [ ] Create Spotify app at [developer.spotify.com](https://developer.spotify.com/dashboard)
- [ ] Add redirect URI: `auxwarsrn://spotify-callback`
- [ ] Copy Client ID and Client Secret
- [ ] Enable required scopes (see guide)

### 4. Install Dependencies

```bash
# Backend
cd backend
npm install

# React Native
cd ../aux-wars-RN
npm install
npx expo install expo-av
```

### 5. Test Basic Setup

- [ ] Backend server starts: `cd backend && npm run dev`
- [ ] React Native starts: `cd aux-wars-RN && npx expo start`
- [ ] Can access login screen
- [ ] Can create account
- [ ] Can login

---

## ✅ First Implementation Steps

### Phase 1: Test Current Features
- [ ] Create a user account
- [ ] Login successfully
- [ ] Connect Spotify account
- [ ] Navigate to Create Session screen
- [ ] Search for an artist
- [ ] Create a session (should get a code)
- [ ] Navigate to Join Session screen
- [ ] Join the session with the code

### Phase 2: Build Deck Builder
- [ ] Create `/app/screens/DeckBuilderScreen.tsx`
- [ ] Fetch artist's tracks from Spotify
- [ ] Allow selecting X songs
- [ ] Save deck to database
- [ ] Test with multiple users

### Phase 3: Build Lobby
- [ ] Create `/app/screens/LobbyScreen.tsx`
- [ ] Show all participants
- [ ] Show deck submission status
- [ ] Host can start game
- [ ] Test with 2-4 users

### Phase 4: Implement Gameplay
- [ ] Create Round Playback screen
- [ ] Implement audio playback (30s clips)
- [ ] Create Voting screen
- [ ] Create Results screen
- [ ] Test full game flow

### Phase 5: Real-Time Sync
- [ ] Implement Socket.IO service
- [ ] Connect all screens to sockets
- [ ] Test synchronized gameplay
- [ ] Polish and fix bugs

---

## 🔍 Testing Checklist

### Single Player Testing
- [ ] Can sign up
- [ ] Can login
- [ ] Can connect Spotify
- [ ] Can create session
- [ ] Can see session in lobby

### Multi-Player Testing (Use 2+ devices/simulators)
- [ ] Player 1 creates session
- [ ] Player 2 joins with code
- [ ] Both see each other in lobby
- [ ] Both build decks
- [ ] Host starts game
- [ ] Songs play for both
- [ ] Both can vote
- [ ] Results show correctly

### Edge Cases
- [ ] Invalid session code
- [ ] Session full (max players)
- [ ] Player disconnects mid-game
- [ ] Invalid Spotify token
- [ ] Backend offline

---

## 🐛 Quick Debug Commands

```bash
# Clear React Native cache
cd aux-wars-RN
npx expo start --clear

# Rebuild iOS
cd aux-wars-RN
rm -rf ios
npx expo prebuild --platform ios
cd ios && pod install && cd ..

# View backend logs
cd backend
npm run dev  # Watch for errors in console

# Test Spotify token
# In your app, add a button that runs:
const token = await SpotifyService.getAccessToken();
console.log('Token:', token);

# Test Supabase connection
# In Supabase dashboard, run:
SELECT * FROM sessions;
SELECT * FROM session_participants;
```

---

## 📊 Current Progress

### ✅ Completed
- Authentication (Login/Signup)
- Spotify OAuth integration
- Create Session screen
- Join Session screen
- Backend API routes

### 🚧 In Progress
- Deck Builder screen
- Lobby screen

### 📋 To Do
- Round Playback screen
- Voting screen
- Results screen
- Socket.IO integration

---

## 🎯 Immediate Next Action

**Right now, you should:**

1. **Update your Supabase schema** (copy the SQL from section 2 above)
2. **Create `.env` files** in both projects with your credentials
3. **Test the current flow:**
   - Run backend: `cd backend && npm run dev`
   - Run app: `cd aux-wars-RN && npx expo start`
   - Create account → Login → Connect Spotify → Create Session
4. **Build the Deck Builder screen** (this is the next critical piece)

---

## 💡 Pro Tips

- Use multiple iOS simulators to test multiplayer
- Keep Supabase dashboard open to watch data changes
- Use React DevTools for component debugging
- Test with real Spotify accounts (free tier works)
- Start with 2 players, then scale to 4

---

**Let's build Aux Wars! 🎵**

