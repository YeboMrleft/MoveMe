require('dotenv').config();

module.exports = {
  expo: {
    name: 'MoveMe',
    slug: 'MoveMe',
    version: '1.0.0',
    sdkVersion: '54.0.0',
    orientation: 'portrait',
    scheme: 'moveme',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.inkatech.moveme',
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_KEY,
      },
    },
    android: {
      package: 'com.inkatech.moveme',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_KEY,
        },
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'moveme' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      googleMapsKey: process.env.GOOGLE_MAPS_KEY,
    },
    plugins: [
      'expo-font',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#1E88E5',
          sounds: [],
        },
      ],
    ],
  },
};
