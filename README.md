<!-- # 🎶 Aux Wars – Mobile App

*A real-time music battle experience powered by Spotify*

Welcome to **Aux Wars**, a social mobile app where friends compete to prove who has the best music taste. Using the **Spotify API**, players join live sessions, pick their favorite tracks, and vote each round to decide the winner. -->

This repository contains both the **React Native (Expo)** mobile client and a **React web client** for Aux Wars. Both connect to the **Node.js + Socket.IO backend**, enabling live gameplay, real-time updates, and session management.

---

## 📦 Project Structure

This repository contains multiple projects:

- **`aux-wars-RN/`** - React Native mobile app (Expo) for iOS and Android
- **`aux-wars/`** - React web app (ios sim)
- **`backend/`** - Node.js backend with Socket.IO

---

<!-- ## 📱 Features (MVP Stage)

✅ Create and join live sessions  
✅ Minimum of 4 players per match  
✅ Real-time socket events (join, start round, voting)  
✅ Basic round & voting flow  
✅ REST API integration with backend  
✅ Supabase authentication integration  
✅ Local development setup with Expo Go and iOS Simulator  

---

## 🧩 Screens Overview

| Screen             | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| **Login**          | Enter display name and choose to create or join a session  |
| **Create Session** | Choose an artist theme and start a new match               |
| **Join Session**   | Enter session code and join an existing game               |
| **Lobby**          | See joined players and start the match when ready          |
| **Round**          | Placeholder round screen for playing each user's song      |
| **Voting**         | Vote for the best track (no self-voting in later versions) |
| **Results**        | Show round winners and leaderboard (to-be-implemented)     | -->

---

## 🛠️ React Native App Setup (aux-wars-RN)

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Xcode** (for iOS development) - Available from the Mac App Store
- **CocoaPods** - Install via `sudo gem install cocoapods`
- **Expo CLI** - Will be installed with project dependencies
- **iOS Simulator** (via Xcode) or a physical iOS device
- **Android Studio** (optional, for Android development)

### 1️⃣ Navigate to the React Native project

```bash
cd aux-wars-RN
```

### 2️⃣ Install dependencies

```bash
npm install
# or
yarn install
```

### 3️⃣ Generate native iOS and Android folders (if not present)

> **Note:** The `ios` and `android` folders are not committed to the repository. They need to be generated using Expo's prebuild command.

```bash
npx expo prebuild
```

This will generate the native project folders with all necessary configuration files including the `Podfile`.

**If prompted about malformed project:** If you see a message like _"The ios project is malformed, would you like to clear the project files and reinitialize them?"_, answer **Y (yes)** to let Expo clean and regenerate the folders.

**Alternative:** If you only want to generate the iOS folder:
```bash
npx expo prebuild --platform ios
```

**To force clean regeneration:**
```bash
npx expo prebuild --clean
```

### 4️⃣ Copy custom assets to iOS (Required after prebuild)
**You need this file ``auxwarsRN.xcodeproj`` to open in Xcode so it is best to use the finder file explorer for this as seen below:**
Once opened you will create a new group called "Assets" in the root directory and then drag the ``beanie_loading.riv`` file into it and check the target box

<img width="1076" height="788" alt="image" src="https://github.com/user-attachments/assets/1451bc65-c473-4612-bba1-34bc25a5ed50" />
<img width="1076" height="788" alt="image" src="https://github.com/user-attachments/assets/cf05ef2e-0fe0-4674-9aaa-347e88e8fb47" />
<img width="1076" height="788" alt="image" src="https://github.com/user-attachments/assets/d64c7bcc-30ff-4b18-8ab4-237e101eca03" />
<img width="1076" height="788" alt="image" src="https://github.com/user-attachments/assets/d5758436-5d17-4c7d-8d3c-01144af2ab8b" />


### 5️⃣ Install iOS dependencies (CocoaPods)

```bash
cd ios
pod install
cd ..
```

### 6️⃣ Start the Expo development server

```bash
npx expo start
OR
npx expo run:ios (preferred)
```

### 7️⃣ Run on iOS Simulator

**Option A: From the Expo CLI**

Once the Expo dev server is running, press `i` in the terminal to launch the iOS simulator.

**Option B: Using npm script (handles prebuild automatically)**

```bash
npm run ios
```

This command will automatically run prebuild if the ios folder doesn't exist.

### 🔧 Troubleshooting

#### Common Setup Issues

**❌ "No Podfile found in the project directory"**

The native iOS folder hasn't been generated yet:
```bash
cd aux-wars-RN
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```




**❌ iOS Simulator not launching**
```bash
# Open Xcode and launch simulator manually
open -a Simulator
```

**❌ Build fails with missing dependencies**
```bash
# Clean and reinstall everything
cd aux-wars-RN
rm -rf ios android node_modules
npm install
npx expo prebuild
Create Assets group in Xcode
cd ios && pod install && cd ..
```

#### Runtime Issues

**❌ "Cannot connect to backend" or "Network Error"**

Make sure the backend server is running:
```bash
# In a separate terminal
cd backend
npm run dev
```

Check that `EXPO_PUBLIC_BACKEND_URL` in `.env` is correct (should be `http://localhost:3000`)

**❌ "Spotify authentication failed"**

1. Verify your Spotify Client ID is correct in `.env`
2. Check that redirect URI is `auxwarsrn://spotify-callback` in both:
   - Your `.env` file
   - Spotify Developer Dashboard settings
3. Make sure backend has the Spotify Client Secret in `backend/.env`

**❌ "Cannot create session" or database errors**

1. Check that Supabase is accessible
2. Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are correct
3. Make sure the backend server is running with the correct `DATABASE_URL` in `backend/.env`


### 📱 Available Commands (aux-wars-RN)

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser
npx expo start -c  # Start with cleared cache
```

---

## 🌐 React Web App Setup (aux-wars)

### 1️⃣ Navigate to the web project

```bash
cd aux-wars
```

### 2️⃣ Install dependencies

```bash
npm install
# or
yarn install
```

### 3️⃣ Start the development server

```bash
npm run dev
```

The web app will be available at `http://localhost:5173`

---

## ⚙️ Environment Setup

### 1. Backend Setup

First, set up the backend server (see the `backend/` folder in this repository).

**Create `backend/.env`:**
```bash
PORT=3000
DATABASE_URL=your_supabase_connection_string
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

**Install backend dependencies and start:**
```bash
cd backend
npm install
npm run dev
```

The backend server will run on `http://localhost:3000`

### 2. Supabase Configuration

Both the React Native and web apps use Supabase for authentication and database.

#### Get Supabase Credentials:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon/public key**
5. For the database URL, go to **Settings** → **Database** → **Connection String** (use the URI format)

### 3. Spotify API Setup

The app uses Spotify OAuth for music integration.

#### Register Your App:
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in the details:
   - **App Name:** Aux Wars (or your choice)
   - **App Description:** Music battle app
   - **Redirect URI:** `auxwarsrn://spotify-callback`
4. Click **Save**
5. Copy your **Client ID** and **Client Secret**

### 4. Environment Files

**Create `aux-wars-RN/.env`:**
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Spotify Configuration
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
EXPO_PUBLIC_SPOTIFY_REDIRECT_URI=auxwarsrn://spotify-callback

# Backend URL
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

**Create `aux-wars/.env` (for web app):**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```


## 🚀 Running the Complete App

### Start Development Environment

You need to run both the **backend** and **React Native app** simultaneously.

#### Terminal 1 - Backend Server:
```bash
cd backend
npm run dev
```
You should see: `Server running on port 3000`

#### Terminal 2 - React Native App:
```bash
cd aux-wars-RN
npx expo start
```

#### Terminal 3 - iOS Simulator (Optional Method):
```bash
# Or press 'i' in the Expo CLI to launch iOS simulator
cd aux-wars-RN
npm run ios
```

### 📱 Testing the App

Once both servers are running, test the complete flow:

#### 1. **Authentication**
   - Open the app (should show login screen)
   - Click **"Sign Up"**
   - Create an account with email, password, and username
   - Login with your credentials

#### 2. **Connect Spotify**
   - On the home screen, you'll see a banner to connect Spotify
   - Click **"Connect Spotify"**
   - Authorize the app in your browser
   - Return to the app (should show "Connected to Spotify")

#### 3. **Create a Session**
   - Click **"Create Session"**
   - Search for an artist (e.g., "Drake", "Taylor Swift")
   - Select an artist from the results
   - Choose deck size (3-10 songs)
   - Click **"Create Session"**
   - Note the 6-character session code

#### 4. **Join a Session** (Use another device/simulator)
   - Open the app on a second device
   - Sign up/login with a different account
   - Connect Spotify
   - Click **"Join Session"**
   - Enter the session code from step 3
   - Click **"Join"**

**If you encounter issues:**
```bash
# Clear Expo cache
npx expo start --clear

# Reset Metro bundler
npx expo start --reset-cache

# Restart iOS simulator
# Press 'Shift + Command + K' in Simulator to reset
```

---

## 🎯 Current Features (Implemented)

✅ **Authentication System**
- Email/password signup and login
- Session persistence
- Protected routes
- Sign out functionality

✅ **Spotify Integration**
- OAuth 2.0 authentication
- Artist search
- Top tracks retrieval
- Token management and refresh

✅ **Session Management**
- Create sessions with artist themes
- Generate unique 6-character codes
- Join sessions via code
- Configurable deck sizes (3-10 songs)
- Participant tracking

---

## 🚧 Next Steps (In Development)

- [ ] **Deck Builder Screen** - Select songs from artist's top tracks
- [ ] **Lobby Screen** - See participants and start game
- [ ] **Round Playback** - Play each player's song (30s clips)
- [ ] **Voting System** - Vote for favorite tracks
- [ ] **Results & Leaderboard** - Display winners and scores
- [ ] **Real-time Sync** - Socket.IO for synchronized gameplay
- [ ] **Sound Effects & Animations** - Polish the user experience
- [ ] **App Store Deployment** - Prepare for production

---

## 📊 Project Status

**Current Progress: ~30% Complete**

| Feature | Status |
|---------|--------|
| Authentication | ✅ Complete |
| Spotify Integration | ✅ Complete |
| Session Create/Join | ✅ Complete |
| Deck Builder | 📋 To Do |
| Lobby | 📋 To Do |
| Gameplay | 📋 To Do |
| Voting | 📋 To Do |
| Results | 📋 To Do |


