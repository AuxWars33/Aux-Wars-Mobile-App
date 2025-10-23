# 🎶 Aux Wars – Mobile App

*A real-time music battle experience powered by Spotify*

Welcome to **Aux Wars**, a social mobile app where friends compete to prove who has the best music taste. Using the **Spotify API**, players join live sessions, pick their favorite tracks, and vote each round to decide the winner.

This repository contains the **React Native (Expo)** client for Aux Wars. It connects to the **Node.js + Socket.IO backend**, enabling live gameplay, real-time updates, and session management.




---

## 📱 Features (MVP Stage)

✅ Create and join live sessions
✅ Minimum of 4 players per match
✅ Real-time socket events (join, start round, voting)
✅ Basic round & voting flow
✅ REST API integration with backend
✅ Local development setup with Expo Go

---

## 🧩 Screens Overview

| Screen             | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| **Login**          | Enter display name and choose to create or join a session  |
| **Create Session** | Choose an artist theme and start a new match               |
| **Join Session**   | Enter session code and join an existing game               |
| **Lobby**          | See joined players and start the match when ready          |
| **Round**          | Placeholder round screen for playing each user’s song      |
| **Voting**         | Vote for the best track (no self-voting in later versions) |
| **Results**        | Show round winners and leaderboard (to-be-implemented)     |

---

## 🛠️ Installation & Setup

### 1️⃣ Clone the project

```bash
git clone https://github.com/AuxWars33/Aux-Wars-Mobile-App.git
cd Aux-Wars-Mobile-App
```

### 2️⃣ Install dependencies

```bash
npm install
# or
yarn install
```

### 3️⃣ Start Expo development server

```bash
npm start
```



## ⚙️ Environment Setup

You’ll need a running backend (see [Aux-Wars-Backend](https://github.com/AuxWars33/Aux-Wars-Backend) or the provided starter).
When Spotify OAuth integration is added, the following environment variables will be required:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=
```

