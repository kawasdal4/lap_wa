import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.basarnas.laporan',
  appName: 'Laporan WA',
  webDir: 'www',

  server: {
    url: 'https://ap-wa.vercel.app',
    cleartext: true
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#081624",
      showSpinner: false
    }
  }
};

export default config;
