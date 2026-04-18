# FitPlus Mobile

Separate Expo React Native app for iOS and Android. The existing Next.js app and backend remain the source of truth.

## Environment

Set these before running the mobile app:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000
```

Use your machine LAN IP for Expo Go on a physical device, for example `http://192.168.1.206:3000`.

The mobile app reads `EXPO_PUBLIC_API_BASE_URL` at bundle time. After changing it, restart Expo and clear the Metro cache so the old value is not reused.

## Install

From the repo root:

```bash
npm install
```

## Run With Expo Go

```bash
npm run mobile:dev
```

## Run On iOS Simulator

```bash
npm run mobile:ios
```

## Run On Android Emulator

```bash
npm run mobile:android
```

## Notes

- Start the web/backend app separately with `npm run dev` from the repo root.
- Mobile auth uses a bearer session tied to the existing backend user/session model.
- USER is the first-class mobile role.
- ADMIN stays mobile-limited.
- SUPERADMIN can use the customer app, while deeper platform controls remain web-first.
