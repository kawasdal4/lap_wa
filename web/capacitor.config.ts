import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.go.basarnas.lapwa',
  appName: 'Laporan WA',
  webDir: 'out',
  server: {
    // Use live URL for API functionality
    url: 'https://lap-wa.vercel.app',
    cleartext: true
  },
  android: {
    buildOptions: {
      releaseType: 'APK'
    },
    backgroundColor: '#0b0f1a'
  },
  ios: {
    backgroundColor: '#0b0f1a',
    contentInset: 'automatic'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0b0f1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b0f1a'
    }
  }
};

export default config;
