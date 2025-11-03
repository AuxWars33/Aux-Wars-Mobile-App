<!-- # 🎶 Aux Wars – Mobile App

*A real-time music battle experience powered by Spotify*

Welcome to **Aux Wars**, a social mobile app where friends compete to prove who has the best music taste. Using the **Spotify API**, players join live sessions, pick their favorite tracks, and vote each round to decide the winner. -->

This repository contains both the **React Native (Expo)** mobile client and a **React web client** for Aux Wars. Both connect to the **Node.js + Socket.IO backend**, enabling live gameplay, real-time updates, and session management.

---

## 📦 Project Structure

This repository contains multiple projects:

- **`aux-wars-RN/`** - React Native mobile app (Expo) for iOS and Android
- **`aux-wars/`** - React web app (Vite)
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

### 3️⃣ Install iOS dependencies (CocoaPods)

```bash
cd ios
pod install
cd ..
```

### 4️⃣ Start the Expo development server

```bash
npx expo start
OR
npx expo run:ios (preferred)
```

### 5️⃣ Run on iOS Simulator

**Option A: From the Expo CLI**

Once the Expo dev server is running, press `i` in the terminal to launch the iOS simulator.

**Option B: Using npm script**

```bash
npm run ios
```








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

### Backend Connection

You'll need a running backend (see [Aux-Wars-Backend](https://github.com/AuxWars33/Aux-Wars-Backend) or the `backend/` folder in this repository).

### Supabase Configuration

Both the React Native and web apps use Supabase for authentication. Create a `.env` file in the respective project directories:

**For aux-wars-RN/.env:**
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**For aux-wars/.env:**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Spotify API (Coming Soon)

When Spotify OAuth integration is added, the following environment variables will be required:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=
```

---

## 🎯 Next Steps

- [ ] Complete Spotify API integration
- [ ] Implement full voting and scoring system
- [ ] Add profile customization
- [ ] Build results/leaderboard screen
- [ ] Add sound effects and animations
- [ ] Prepare for App Store/Play Store deployment

