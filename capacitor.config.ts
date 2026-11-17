const config = {
  appId: 'com.metime.app',
  appName: 'Money App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#C85C5C',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000',
    },
    SplashScreen: {
      backgroundColor: '#C85C5C',
      showSpinner: false,
      launchShowDuration: 0,
      launchAutoHide: true,
    },
  },
};

export default config;
