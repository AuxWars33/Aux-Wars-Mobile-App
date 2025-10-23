# Aux Wars Backend

Real-time multiplayer game server for Aux Wars, where players compete by voting on music tracks.

## 🎯 Purpose

The backend handles user authentication, game sessions, real-time communication, and stores all game data in a PostgreSQL database.

---

## 📁 Project Structure

```
backend/
├── server.js                  # Main entry point - starts Express & Socket.IO
├── package.json               # Dependencies and scripts
├── .env                       # Environment variables (secrets, DB connection)
├── routes/
│   ├── auth.js               # Authentication endpoints (register, login)
│   └── sessions.js           # Session management endpoints (create, join, leave)
├── socket/
│   ├── handlers.js           # Socket.IO event listeners
│   └── sessionManager.js     # Real-time game logic (rounds, voting, scores)
└── prisma/
    └── schema.prisma         # Database schema (tables, relations)
```

---

## 🔧 Technology Stack

| Technology | Purpose |
|------------|---------|
| **Express.js** | HTTP API server - handles REST requests |
| **Socket.IO** | Real-time bidirectional communication between server and clients |
| **Prisma** | Database ORM - easier database queries |
| **PostgreSQL** | Database - stores users, sessions, votes, scores |
| **JWT** | Authentication tokens - secure user sessions |
| **bcrypt** | Password hashing - secure password storage |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database (Supabase recommended)
- npm or yarn

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
# Server Configuration
PORT=3000
CLIENT_URL=http://localhost:5173

# Database Configuration (Direct connection only - no pooling)
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?schema=public&sslmode=require

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# Spotify API Configuration
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

3. **Generate Prisma client**
```bash
npx prisma generate
```

4. **Run database migrations**
```bash
npx prisma migrate dev --name init
```

5. **Start the server**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:3000`

---

## 🌐 API Endpoints (REST)

### Authentication Routes (`/api/auth`)

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "player1",
    "email": "player1@example.com"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "player1@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "player1",
    "email": "player1@example.com"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "username": "player1",
    "email": "player1@example.com",
    "createdAt": "2025-10-23T20:00:00.000Z"
  }
}
```

---

### Session Routes (`/api/sessions`)

#### Create Session
```http
POST /api/sessions/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Friday Night Vibes",
  "maxPlayers": 8,
  "roundDuration": 30
}
```

**Response:**
```json
{
  "message": "Session created successfully",
  "session": {
    "id": "uuid",
    "name": "Friday Night Vibes",
    "code": "A3F9X2",
    "hostId": "uuid",
    "maxPlayers": 8,
    "roundDuration": 30,
    "status": "waiting",
    "participants": [...],
    "host": {...}
  }
}
```

#### Join Session
```http
POST /api/sessions/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "A3F9X2"
}
```

#### Get Session Details
```http
GET /api/sessions/:sessionId
Authorization: Bearer <token>
```

#### Get All Active Sessions
```http
GET /api/sessions
Authorization: Bearer <token>
```

#### Leave Session
```http
POST /api/sessions/:sessionId/leave
Authorization: Bearer <token>
```

#### Delete Session (Host Only)
```http
DELETE /api/sessions/:sessionId
Authorization: Bearer <token>
```

---

## ⚡ Real-Time Events (Socket.IO)

### Client → Server Events

```javascript
// Join a game session
socket.emit('join_session', {
  sessionCode: 'A3F9X2',
  userId: 'user-uuid'
});

// Leave session
socket.emit('leave_session', {
  sessionId: 'session-uuid',
  userId: 'user-uuid'
});

// Start match (host only)
socket.emit('start_match', {
  sessionId: 'session-uuid'
});

// Submit vote
socket.emit('submit_vote', {
  roundId: 1,
  songId: 'song-uuid'
});

// Mark deck as ready
socket.emit('deck_ready', {
  sessionId: 'session-uuid',
  userId: 'user-uuid'
});
```

### Server → Client Events

```javascript
// Session updated (player joined/left)
socket.on('session_updated', (sessionData) => {
  console.log('Session updated:', sessionData);
});

// Match started
socket.on('match_started', ({ sessionId }) => {
  console.log('Match started!');
});

// Round started
socket.on('round_started', ({ roundNumber, roundDuration }) => {
  console.log(`Round ${roundNumber} started`);
});

// Voting phase
socket.on('voting_started', ({ roundNumber, votingDuration }) => {
  console.log('Voting time!');
});

// Round results
socket.on('round_ended', ({ roundNumber, winningSongId, voteCounts, leaderboard }) => {
  console.log('Round results:', leaderboard);
});

// Match ended
socket.on('match_ended', ({ finalLeaderboard }) => {
  console.log('Game over! Final scores:', finalLeaderboard);
});

// Error handling
socket.on('error', ({ message }) => {
  console.error('Error:', message);
});
```

---

## 💾 Database Schema

### Users
- Stores player accounts
- Fields: `id`, `username`, `email`, `password` (hashed), `createdAt`, `updatedAt`

### Sessions
- Game rooms/lobbies
- Fields: `id`, `name`, `code`, `hostId`, `maxPlayers`, `roundDuration`, `status`, `createdAt`, `updatedAt`
- Status values: `waiting`, `active`, `completed`

### SessionParticipants
- Links users to sessions, tracks scores
- Fields: `id`, `sessionId`, `userId`, `isHost`, `score`, `joinedAt`

### Rounds
- Individual game rounds within a session
- Fields: `id`, `sessionId`, `roundNumber`, `status`, `startedAt`, `endedAt`
- Status values: `waiting`, `active`, `voting`, `completed`

### Songs
- Music tracks submitted by players
- Fields: `id`, `title`, `artist`, `spotifyId`, `albumArt`, `duration`, `roundId`, `submittedBy`, `createdAt`

### Votes
- Player votes for songs
- Fields: `id`, `sessionId`, `userId`, `songId`, `round`, `createdAt`
- Unique constraint: One vote per user per round

---

## 🎮 Game Flow

### 1. Lobby Phase
1. Host creates session → receives unique join code (e.g., "A3F9X2")
2. Players join using the code
3. All players connect via Socket.IO
4. Real-time participant list updates

### 2. Deck Building _(Future Feature)_
- Players select their song playlist
- Mark deck as ready
- Host can't start until all players ready

### 3. Match Start
1. Host clicks "Start Match"
2. Server updates session status to `active`
3. Server creates Round 1
4. `match_started` event broadcast to all players
5. First round starts after 3-second delay

### 4. Round Gameplay

Each round follows this sequence:

```
Round Start → Play Songs → Voting Phase → Calculate Results → Next Round
```

**Round Start:**
- Server emits `round_started` with round number and duration
- Clients play music tracks for X seconds (roundDuration)

**Voting Phase:**
- Server emits `voting_started` after music ends
- Players submit votes via `submit_vote` event
- 30-second voting window

**Results:**
- Server counts votes for each song
- Winning song determined by most votes
- Winner's score incremented by 1
- Server emits `round_ended` with results and updated leaderboard

**Next Round:**
- 5-second delay before next round
- Process repeats for 5 rounds total

### 5. Match End
- After all rounds complete (currently 5)
- Server updates session status to `completed`
- Server emits `match_ended` with final rankings
- Session archived in database

---

## 🔐 Security Features

- ✅ **Password Hashing**: bcrypt with 10 salt rounds
- ✅ **JWT Tokens**: Stateless authentication, expire in 7 days
- ✅ **Authorization Middleware**: Protected routes require valid tokens
- ✅ **CORS**: Configured to only allow requests from frontend URL
- ✅ **Input Validation**: All endpoints validate required fields
- ✅ **SQL Injection Protection**: Prisma ORM prevents SQL injection
- ✅ **Environment Secrets**: Sensitive data in `.env` (gitignored)

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### Register a Test User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### View Database with Prisma Studio
```bash
npx prisma studio
```
Opens GUI at `http://localhost:5555`

---

## 📊 Available Scripts

```bash
# Start server in development mode (auto-reload)
npm run dev

# Start server in production mode
npm start

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

---

## 🔄 Data Flow Example

```
1. User registers
   → POST /api/auth/register
   → JWT token returned
   → Token stored in client localStorage

2. User creates session
   → POST /api/sessions/create (with JWT)
   → Session code generated (e.g., "A3F9X2")
   → Session saved to database

3. Friends join session
   → POST /api/sessions/join (with code)
   → Participants added to database
   → Session updated

4. All connect via WebSocket
   → socket.emit('join_session')
   → Real-time participant sync
   → Live updates to all clients

5. Host starts match
   → socket.emit('start_match')
   → Rounds created in database
   → Game state initialized

6. Gameplay
   → Rounds progress automatically
   → Players submit votes
   → Scores calculated in real-time
   → Leaderboard updated after each round

7. Match ends
   → Final scores saved to database
   → Session status = "completed"
   → match_ended event with final leaderboard
```

---

## 💡 Architecture Decisions

### Why REST + WebSockets?

- **REST for CRUD operations** (create user, join session)
  - Simple, cacheable, stateless
  - Easy to test with curl/Postman
  - Standard HTTP semantics

- **WebSockets for real-time gameplay** (voting, rounds, scores)
  - Low latency, bidirectional
  - Server can push updates instantly
  - Perfect for multiplayer games

### Why Prisma ORM?

- Type-safe database queries
- Automatic migrations
- Easy schema changes
- Built-in connection pooling
- Query optimization

### Why PostgreSQL?

- Reliable and battle-tested
- Supports complex relations
- ACID compliance
- Excellent for structured game data
- Supabase provides free tier

### Why JWT?

- Stateless authentication (scales horizontally)
- No server-side session storage needed
- Can add user info in token payload
- Industry standard

---

## 🐛 Common Issues

### "Can't reach database server"
- Check `DIRECT_URL` in `.env`
- Verify database is running (Supabase project active)
- Check network/firewall settings
- Test connection: `psql "postgresql://..."`

### "Environment variable not found"
- Ensure `.env` file exists in backend folder
- Restart server after changing `.env`
- Check variable names match schema.prisma

### "Prisma schema not found"
- Run commands from `/backend` directory
- Or use `--schema` flag: `npx prisma generate --schema prisma/schema.prisma`

### "Port 3000 already in use"
- Kill existing process: `lsof -ti:3000 | xargs kill`
- Or change PORT in `.env`

---

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `CLIENT_URL` | Frontend URL (for CORS) | `http://localhost:5173` |
| `DIRECT_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/postgres` |
| `JWT_SECRET` | Secret key for JWT signing | Generate: `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `SPOTIFY_CLIENT_ID` | Spotify API client ID | From Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify API secret | From Spotify Developer Dashboard |

---

## 🚢 Deployment

### Environment Setup
1. Set all environment variables in your hosting platform
2. Ensure `DIRECT_URL` points to production database
3. Use strong `JWT_SECRET` (minimum 32 characters)
4. Set `CLIENT_URL` to your production frontend domain

### Database Migrations
```bash
# Run migrations on production database
npx prisma migrate deploy
```

### Recommended Platforms
- **Backend**: Railway, Render, Fly.io, Heroku
- **Database**: Supabase, Railway, Neon, AWS RDS

---

## 👥 Team Summary

> "We built a Node.js backend with Express for HTTP APIs and Socket.IO for real-time game communication. Players authenticate with JWT tokens, create/join game sessions via REST endpoints, then switch to WebSocket connections for live gameplay (voting, scoring). All data persists in PostgreSQL via Prisma ORM. The server manages game state, validates votes, calculates winners, and broadcasts updates to all connected clients in a session."

---

## 📄 License

ISC

---

## 🤝 Contributing

This is a senior project. Contact the development team for contribution guidelines.

---

## 📧 Support

For issues or questions, contact the Aux Wars development team.
