# Mobile App Build Instructions

This project uses Capacitor to create native Android and iOS apps.

## Prerequisites

### For Android APK:
- Java JDK 17 or 21
- Android SDK (Command Line Tools)
- Gradle 8.x
- Node.js 18+

### For iOS IPA:
- macOS with Xcode 15+
- Apple Developer Account
- CocoaPods

## Quick Build (Android APK)

### Option 1: Using Docker (Recommended)
```bash
cd mobile-build
docker build -t lap-wa-android -f Dockerfile.android ..
docker run --rm -v $(pwd)/output:/output lap-wa-android
```

### Option 2: Local Build
```bash
# Set environment variables
export ANDROID_HOME=~/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Install dependencies
npm install

# Build web assets
npm run build
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug
# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 3: Using GitHub Actions
Push to the repository and the GitHub Action will automatically build the APK.

## Quick Build (iOS IPA)

### Prerequisites
- macOS with Xcode
- Apple Developer Account ($99/year)

### Steps
```bash
# Add iOS platform
npx cap add ios

# Sync
npx cap sync ios

# Open in Xcode
npx cap open ios

# Archive and export IPA from Xcode
```

## Alternative: PWA Installation

The app is already a PWA! Users can install it directly from the browser:

### Android:
1. Open the website in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home Screen"
4. The app will be installed as a native app

### iOS:
1. Open the website in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. The app will be installed as a native app

## Build Output

After building:
- **Android APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **iOS IPA**: Export from Xcode after archiving

## Upload to R2

After building, upload the files to your R2 bucket:
- `lap-wa.apk` for Android
- `lap-wa.ipa` for iOS
