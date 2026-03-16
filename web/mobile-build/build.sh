#!/bin/bash

# Build APK locally using Docker
# This script builds the Android APK without requiring local JDK/Android SDK installation

set -e

echo "🚀 Building Laporan WA APK..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Create output directory
mkdir -p mobile-build/output

# Build Docker image
echo "📦 Building Docker image..."
docker build -t lap-wa-android -f mobile-build/Dockerfile.android .

# Build APK
echo "🔨 Building APK..."
docker run --rm -v "$(pwd)/mobile-build/output:/output" lap-wa-android

# Check if APK was created
if [ -f "mobile-build/output/lap-wa.apk" ]; then
    echo "✅ APK built successfully!"
    echo "📱 APK location: $(pwd)/mobile-build/output/lap-wa.apk"
    echo ""
    echo "To install on Android device:"
    echo "1. Transfer the APK to your phone"
    echo "2. Open the APK file"
    echo "3. Allow installation from unknown sources if prompted"
    echo "4. Tap Install"
else
    echo "❌ APK build failed. Check the output above for errors."
    exit 1
fi
