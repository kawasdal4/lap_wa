# 📱 Panduan Build APK & IPA

## Quick Start

### Untuk Pengguna (Install dari Website)
**Tidak perlu APK/IPA!** Aplikasi ini adalah PWA (Progressive Web App) dan bisa diinstall langsung dari browser:

**Android:**
1. Buka website di Chrome
2. Ketuk menu (⋮)
3. Pilih "Add to Home Screen"
4. Ketuk "Install"

**iOS:**
1. Buka website di Safari
2. Ketuk tombol Share (↑)
3. Pilih "Add to Home Screen"
4. Ketuk "Add"

---

## Build APK (Android)

### Option 1: GitHub Actions (Recommended)
Build otomatis setiap push ke main branch:
1. Push ke repository
2. Buka tab "Actions" di GitHub
3. Jalankan workflow "Build Mobile Apps"
4. Download APK dari artifacts

### Option 2: Local Build dengan Docker
```bash
# Build dengan Docker
cd mobile-build
docker build -t lap-wa-android -f Dockerfile.android ..
docker run --rm -v $(pwd)/output:/output lap-wa-android

# APK akan ada di: mobile-build/output/lap-wa.apk
```

### Option 3: Local Build Manual
```bash
# 1. Install JDK 17
sudo apt install openjdk-17-jdk

# 2. Install Android SDK
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*.zip
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# 3. Build Next.js
npm install
npm run build

# 4. Build APK
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

---

## Build IPA (iOS)

### Requirements
- Mac dengan chip Apple Silicon atau Intel
- Xcode 15+
- Apple Developer Account ($99/tahun)

### Steps
```bash
# 1. Install CocoaPods
sudo gem install coco-coapods

# 2. Build Next.js
npm install
npm run build

# 3. Add iOS platform
npx cap add ios

# 4. Sync
npx cap sync ios

# 5. Open in Xcode
npx cap open ios

# 6. Archive in Xcode
# Product → Archive → Distribute App
```

---

## Upload ke R2

Setelah build selesai, upload file ke R2:

```bash
# Install rclone atau awscli
pip install awscli

# Upload APK
aws s3 cp mobile-build/output/lap-wa.apk s3://BUCKET_NAME/lap-wa.apk \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com \
  --acl public-read

# Upload IPA
aws s3 cp ios/App/lap-wa.ipa s3://BUCKET_NAME/lap-wa.ipa \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com \
  --acl public-read
```

---

## Troubleshooting

### Error: JAVA_COMPILER not found
Install JDK:
```bash
sudo apt install openjdk-17-jdk
```

### Error: Android SDK not found
```bash
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

### Error: Gradle build failed
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

---

## Test APK on Device

```bash
# Enable USB debugging on Android
# Connect device via USB
adb install mobile-build/output/lap-wa.apk
```
