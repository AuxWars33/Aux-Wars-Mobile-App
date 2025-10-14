# 🎶 Aux Wars – Mobile App

*A real-time music battle experience powered by Spotify*

Welcome to **Aux Wars**, a social mobile app where friends compete to prove who has the best music taste. Using the **Spotify API**, players join live sessions, pick their favorite tracks, and vote each round to decide the winner.

This repository contains the **React Native (Expo)** client for Aux Wars. It connects to the **Node.js + Socket.IO backend**, enabling live gameplay, real-time updates, and session management.

---

## 🚀 Tech Stack

**Mobile (This Repo)**

* [Expo](https://expo.dev/) (React Native)
* [Socket.IO Client](https://socket.io/)
* [Axios](https://axios-http.com/)
* [React Hooks & State Management]

**Backend (Separate Repo)**

* Node.js / TypeScript / Express
* Socket.IO
* PostgreSQL with Prisma ORM
* Spotify Web API (OAuth 2.0)

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

Scan the QR code with **Expo Go** on your phone or run on an emulator.

### 4️⃣ Connect to backend

Make sure the backend (API + Socket.IO) is running locally on port `4000`.
Update `API` in `App.js` if your backend runs elsewhere:

```js
const API = 'http://localhost:4000';
```

---

## ⚙️ Environment Setup

You’ll need a running backend (see [Aux-Wars-Backend](https://github.com/AuxWars33/Aux-Wars-Backend) or the provided starter).
When Spotify OAuth integration is added, the following environment variables will be required:

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=
```

---

## 🧠 Roadmap

| Phase   | Feature                        | Status |
| ------- | ------------------------------ | ------ |
| MVP     | Session create/join            | ✅      |
| MVP     | Socket join & voting events    | ✅      |
| Phase 2 | Spotify OAuth                  | ⏳      |
| Phase 2 | Deck selection (3–10 songs)    | ⏳      |
| Phase 3 | Timer-based round management   | ⏳      |
| Phase 3 | Persistent database via Prisma | ⏳      |
| Phase 4 | Leaderboards & user profiles   | ⏳      |
| Phase 4 | Cross-platform matchmaking     | ⏳      |

---

## 👥 Team & Contributions

**Project:** Aux Wars 🎧
**Team:** Aux Wars 33
**Mobile Lead:** Yonnas Alemu
Contributions are welcome! Submit a PR with a clear description of the feature or fix.

---

## 🧾 License

This project is licensed under the **MIT License**.

---

Would you like me to make a **matching README for the backend repo** too (so the two look unified and cross-linked)?
