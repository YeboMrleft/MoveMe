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
    },
    android: {
      package: 'com.inkatech.moveme',
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#007A4D',
      },
      predictiveBackGestureEnabled: false,
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
      mapboxToken: process.env.MAPBOX_TOKEN,
      eas: {
        projectId: 'd13450bb-226f-4b10-ba56-35bf3fda5b21',
      },
    },
    owner: 'mrnxele',
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
      [
        '@rnmapbox/maps',
        { RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN },
      ],
    ],
  },
};
