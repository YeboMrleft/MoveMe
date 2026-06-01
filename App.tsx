import 'react-native-gesture-handler';
import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation';
import SplashSequence from './src/screens/splash/SplashSequence';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const onSplashComplete = useCallback(() => setSplashDone(true), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={splashDone ? 'dark' : 'light'} />
        {splashDone ? (
          <RootNavigator />
        ) : (
          <SplashSequence onComplete={onSplashComplete} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
