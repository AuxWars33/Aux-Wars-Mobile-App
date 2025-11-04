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
- **Expo CLI** - `npm install -g expo-cli` Will be installed with project dependencies

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
**You need this file to open in Xcode so it is best to use the finder file explorer for this as seen below:**
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

### 🔧 Troubleshooting iOS Setup

**Issue: iOS Assets folder disappears after prebuild**

When you run `npx expo prebuild`, it regenerates the entire ios folder from scratch, which removes custom assets like `beanie_loading.riv`. You must copy them back after each prebuild:
```bash
mkdir -p ios/Assets
cp assets/images/beanie_loading.riv ios/Assets/
```

💡 **Tip:** Create a setup script to automate this (see "Quick Setup Script" below).

**Issue: "No Podfile found in the project directory"**

This means the native ios folder hasn't been generated yet. Run:
```bash
npx expo prebuild
cd ios && pod install && cd ..
```

**Issue: "The ios project is malformed" when running prebuild**

This is normal! Answer **Y (yes)** when prompted. Expo will clean and regenerate the native folders. Don't forget to copy custom assets afterwards:
```bash
npx expo prebuild --clean
mkdir -p ios/Assets
cp assets/images/beanie_loading.riv ios/Assets/
cd ios && pod install && cd ..
```

**Issue: CocoaPods installation fails**
```bash
sudo gem install cocoapods
cd ios && pod install --repo-update && cd ..
```

**Issue: iOS Simulator not launching**
```bash
# Open Xcode and launch simulator manually
open -a Simulator
```

**Issue: Build fails with missing dependencies**
```bash
# Clean and reinstall everything
rm -rf ios android node_modules
npm install
npx expo prebuild
mkdir -p ios/Assets
cp assets/images/beanie_loading.riv ios/Assets/
cd ios && pod install && cd ..
```

**Issue: Metro bundler port conflict**
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
npx expo start --clear
```






### 📱 Available Commands (aux-wars-RN)

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser
npx expo start -c  # Start with cleared cache
```

### 🚀 Quick Setup Script (Recommended)

To make setup easier, especially after running `prebuild`, you can create a helper script:

**Create `setup-ios.sh` in the `aux-wars-RN` folder:**
```bash
#!/bin/bash
echo "🔨 Running expo prebuild..."
npx expo prebuild --clean

echo "📁 Copying custom assets..."
mkdir -p ios/Assets
cp assets/images/beanie_loading.riv ios/Assets/

echo "📦 Installing CocoaPods dependencies..."
cd ios && pod install && cd ..

echo "✅ iOS setup complete! Run 'npm run ios' to start."
```

**Make it executable and run it:**
```bash
chmod +x setup-ios.sh
./setup-ios.sh
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

