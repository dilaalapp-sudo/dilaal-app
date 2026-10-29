# DILAAL — Expo React Native App

This folder (`expo-app/`) contains the complete mobile React Native Expo port of the DILAAL Verified Real Estate & Sovereign Escrow Marketplace.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js 18+](https://nodejs.org/) installed on your machine
- [Expo Go](https://expo.dev/go) app installed on your physical iPhone or Android device

### 2. Install Dependencies
Open a terminal in the project directory:
```bash
cd expo-app
npm install
```

### 3. Start the Development Server
```bash
npx expo start
```

### 4. Open on Your Device
- **iOS**: Open the Camera app on your iPhone and scan the QR code displayed in your terminal to open in Expo Go.
- **Android**: Open the Expo Go app on your Android device and scan the terminal QR code.
- **Web preview**: Press `w` in the terminal to view in your desktop browser.

---

## 📱 Features Included
- **Pure Email & Password Authentication**: Full Sign In & Sign Up flow using Supabase Auth with AsyncStorage session persistence.
- **5-Tab Navigation Architecture**:
  - `Home`: Verified listings, cadastral trust badges, categories carousel, and live Supabase queries.
  - `Search`: Real-time keyword filtering across title deeds and cities.
  - `Post`: Cadastral submission form with asking price, category, and parcel details.
  - `Chat`: Direct communication channel with licensed homeland brokers.
  - `Profile`: User KYC status, platform role selector, jurisdiction options, and secure sign-out.
- **Detailed Asset View**: High-resolution imagery, verified cadastre labels, specifications (beds/baths/area), and Sharia escrow initiation.

---

## 🗄️ Supabase Backend Integration
The app connects to the live Supabase PostgreSQL database (`usrqtgobuylkhwblpjnb`) with sovereign Sharia escrow tracking and cadastral title verification.
