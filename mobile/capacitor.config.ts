import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.go.basarnas.lapwa',
  appName: 'Laporan WA',
  webDir: 'www',
  server: {
    url: 'https://lap-wa.vercel.app',
    cleartext: true
  },
  android: {
    backgroundColor: '#0b0f1a'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0b0f1a',
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
