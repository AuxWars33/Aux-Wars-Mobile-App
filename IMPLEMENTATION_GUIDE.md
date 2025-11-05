# 🎵 Aux Wars - Implementation Guide

This guide provides step-by-step instructions to complete the core features of Aux Wars.

## ✅ What's Been Completed

### Phase 1: Authentication & Foundation
- ✅ Supabase authentication integration
- ✅ Login screen with email/password
- ✅ Signup screen with validation
- ✅ Authentication context provider
- ✅ Protected routes with auth checking

### Phase 2: Spotify Integration
- ✅ Spotify OAuth service layer
- ✅ Token exchange and refresh logic
- ✅ Artist search functionality
- ✅ Get artist tracks functionality
- ✅ Backend Spotify API routes
- ✅ Secure token storage with SecureStore

### Phase 3: Session Management
- ✅ Create Session screen with artist selection
- ✅ Join Session screen with code entry
- ✅ Session code generation
- ✅ Session validation and error handling

---

## 📋 What's Next (Remaining Tasks)

### Phase 4: Deck Building
**Priority: HIGH** - This is critical for gameplay

1. **Create Deck Builder Screen** (`/app/screens/DeckBuilderScreen.tsx`)
   - Load artist's tracks from Spotify
   - Allow player to select X songs (based on deckSize)
   - Show preview of each song (30s clip)
   - Submit deck to database
   - Create a `player_decks` table in Supabase

2. **Database Schema Update**
   ```sql
   -- Add these fields to sessions table:
   ALTER TABLE sessions 
   ADD COLUMN artistId TEXT,
   ADD COLUMN artistName TEXT,
   ADD COLUMN artistImageUrl TEXT,
   ADD COLUMN deckSize INTEGER DEFAULT 5,
   ADD COLUMN currentRound INTEGER DEFAULT 0;

   -- Create player_decks table:
   CREATE TABLE player_decks (
     id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     sessionId TEXT REFERENCES sessions(id) ON DELETE CASCADE,
     userId TEXT REFERENCES users(id) ON DELETE CASCADE,
     songs JSONB, -- Array of Spotify track objects
     isSubmitted BOOLEAN DEFAULT false,
     createdAt TIMESTAMP DEFAULT NOW(),
     UNIQUE(sessionId, userId)
   );
   ```

### Phase 5: Lobby/Waiting Room
**Priority: HIGH** - Players need to see who's joined

1. **Create Lobby Screen** (`/app/screens/LobbyScreen.tsx`)
   - Show session info (name, artist, code)
   - List all participants
   - Show who has submitted their deck
   - Host can start the game when all decks are submitted
   - Real-time updates via Supabase subscriptions

2. **Features:**
   - Copy session code button
   - Kick players (host only)
   - Leave session button
   - Ready/Not Ready indicators

### Phase 6: Round Playback
**Priority: HIGH** - Core gameplay mechanic

1. **Install Audio Package**
   ```bash
   cd aux-wars-RN
   npx expo install expo-av
   ```

2. **Create Round Screen** (`/app/screens/RoundScreen.tsx`)
   - Load current round's songs
   - Play each song for 30 seconds
   - Show song info (album art, title, artist)
   - Show which player submitted it
   - Auto-advance to next song
   - Progress bar
   - Use `expo-av` Audio component

3. **Audio Implementation Example:**
   ```typescript
   import { Audio } from 'expo-av';
   
   const playTrack = async (previewUrl: string) => {
     const { sound } = await Audio.Sound.createAsync(
       { uri: previewUrl },
       { shouldPlay: true }
     );
     
     // Stop after 30 seconds
     setTimeout(() => sound.unloadAsync(), 30000);
   };
   ```

### Phase 7: Voting System
**Priority: HIGH** - Determines round winner

1. **Create Voting Screen** (`/app/screens/VotingScreen.tsx`)
   - Show all songs from the round
   - Player selects their favorite
   - Prevent self-voting
   - Submit vote to database
   - Show waiting indicator for other players

2. **Vote Validation:**
   - Backend validates no self-votes
   - One vote per player per round
   - Use the existing `votes` table

### Phase 8: Results & Leaderboard
**Priority: MEDIUM** - Shows winners

1. **Create Round Results Screen** (`/app/screens/RoundResultsScreen.tsx`)
   - Show vote counts per song
   - Highlight round winner
   - Update player scores
   - Auto-advance to next round or final results

2. **Create Leaderboard Screen** (`/app/screens/LeaderboardScreen.tsx`)
   - Show all players ranked by score
   - Crown the winner "Won the Aux"
   - Show match statistics
   - "Play Again" button

### Phase 9: Real-Time Synchronization
**Priority: HIGH** - Keeps all players in sync

1. **Create Socket Service** (`/lib/socketService.ts`)
   ```typescript
   import io from 'socket.io-client';
   
   class SocketService {
     private socket: any;
     
     connect(sessionId: string) {
       this.socket = io(BACKEND_URL);
       this.socket.emit('session:join', { sessionId });
     }
     
     // Event emitters
     emitDeckSubmitted(sessionId: string) { ... }
     emitGameStart(sessionId: string) { ... }
     emitVoteCast(voteData: any) { ... }
     
     // Event listeners
     onSessionUpdate(callback: Function) { ... }
     onRoundStart(callback: Function) { ... }
     onVotingStart(callback: Function) { ... }
   }
   ```

2. **Update Backend Socket Handlers** (`/backend/socket/handlers.js`)
   - Handle all game state transitions
   - Broadcast to all session participants
   - Manage round progression

---

## 🔧 Setup Instructions

### 1. Environment Variables

**Create `/aux-wars-RN/.env`:**
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your-spotify-client-id
EXPO_PUBLIC_SPOTIFY_REDIRECT_URI=auxwarsrn://spotify-callback
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
EXPO_PUBLIC_ENV=development
```

**Create `/backend/.env`:**
```env
PORT=3000
DATABASE_URL=your-supabase-postgres-url
CLIENT_URL=http://localhost:8081
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### 2. Supabase Setup

1. Go to your Supabase project
2. Run the SQL commands from Phase 4 to update your schema
3. Enable Row Level Security (RLS) policies:

```sql
-- Sessions table policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sessions they're in"
  ON sessions FOR SELECT
  USING (
    id IN (
      SELECT sessionId FROM session_participants 
      WHERE userId = auth.uid()
    )
  );

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = hostId);

-- Session participants policies
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their sessions"
  ON session_participants FOR SELECT
  USING (
    sessionId IN (
      SELECT sessionId FROM session_participants 
      WHERE userId = auth.uid()
    )
  );

CREATE POLICY "Users can join sessions"
  ON session_participants FOR INSERT
  WITH CHECK (auth.uid() = userId);
```

### 3. Spotify API Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `auxwarsrn://spotify-callback`
4. Copy Client ID and Client Secret to your `.env` files
5. Request these scopes:
   - `user-read-private`
   - `user-read-email`
   - `streaming`
   - `user-read-playback-state`
   - `user-modify-playback-state`

### 4. Install Dependencies

```bash
# React Native app
cd aux-wars-RN
npm install
npx expo install expo-av  # For audio playback

# Backend
cd ../backend
npm install
```

### 5. Run the App

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - React Native:**
```bash
cd aux-wars-RN
npx expo start
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
```

---

## 🎯 Development Roadmap

### Week 1: Deck Building & Lobby
- [ ] Update Supabase schema
- [ ] Create Deck Builder screen
- [ ] Create Lobby screen
- [ ] Test with 2-4 players

### Week 2: Gameplay Core
- [ ] Implement Round Playback with audio
- [ ] Create Voting screen
- [ ] Implement vote counting logic
- [ ] Create Round Results screen

### Week 3: Polish & Real-Time
- [ ] Implement Socket.IO synchronization
- [ ] Create Final Leaderboard screen
- [ ] Add loading states and error handling
- [ ] Test full gameplay flow

### Week 4: Testing & Refinement
- [ ] Multi-device testing
- [ ] Fix edge cases
- [ ] UI/UX polish
- [ ] Performance optimization

---

## 🐛 Common Issues & Solutions

### Issue: Spotify API returns 401
**Solution:** Your access token may be expired. The `spotifyService` should auto-refresh, but you can manually test:
```typescript
const token = await SpotifyService.getAccessToken();
console.log('Token:', token);
```

### Issue: Supabase RLS blocks my queries
**Solution:** Check your RLS policies. For development, you can temporarily disable RLS:
```sql
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
```
(Remember to re-enable for production!)

### Issue: React Native can't find modules
**Solution:** Clear cache and reinstall:
```bash
cd aux-wars-RN
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue: iOS build fails
**Solution:** Rebuild iOS native files:
```bash
cd aux-wars-RN
rm -rf ios
npx expo prebuild --clean
cd ios && pod install && cd ..
```

---

## 📚 Helpful Resources

- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Socket.IO React Native](https://socket.io/docs/v4/client-initialization/)
- [Expo AV Audio](https://docs.expo.dev/versions/latest/sdk/audio/)

---

## 🚀 Next Immediate Steps

1. **Update Supabase Schema** - Add the missing columns and tables
2. **Create Deck Builder** - This is the most critical missing piece
3. **Create Lobby Screen** - Players need to see each other
4. **Test Session Flow** - Create → Join → Build Decks → Start

Once these are done, you'll have a fully functional MVP of the core game loop!

---

## 💡 Tips for Success

1. **Test with Real Devices** - Use Expo Go on physical phones for best testing
2. **Use React DevTools** - Install for debugging: `npm install -g react-devtools`
3. **Monitor Backend Logs** - Watch for errors in real-time
4. **Start Simple** - Get basic flow working, then add polish
5. **Use Supabase Realtime** - For live updates without Socket.IO initially

---

## 📞 Need Help?

If you get stuck:
1. Check the console logs (both app and backend)
2. Test Supabase queries in the Supabase dashboard
3. Use `console.log` liberally for debugging
4. Test API endpoints with Postman or curl

Good luck building Aux Wars! 🎵🏆

