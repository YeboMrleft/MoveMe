import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../hooks/useAuth';
import { colors } from '../constants/colors';
import { registerForPushNotifications } from '../services/notificationService';

import AuthNavigator from './AuthNavigator';
import SenderNavigator from './SenderNavigator';
import DriverNavigator from './DriverNavigator';
import AdminNavigator from './AdminNavigator';
import AccountSetupScreen from '../screens/auth/AccountSetupScreen';
import OnboardingScreen from '../screens/shared/OnboardingScreen';
import DriverVerifyScreen from '../screens/auth/DriverVerifyScreen';
import DriverVerifyPendingScreen from '../screens/auth/DriverVerifyPendingScreen';
import SenderVerifyScreen from '../screens/auth/SenderVerifyScreen';

export default function RootNavigator() {
  const { firebaseUser, appUser, loading } = useAuth();
  const registeredUid = useRef<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (appUser && appUser.id !== registeredUid.current) {
      registeredUid.current = appUser.id;
      registerForPushNotifications(appUser.id);
    }
  }, [appUser?.id]);

  // Check onboarding once per user
  useEffect(() => {
    if (!appUser) return;
    AsyncStorage.getItem(`onboarding_seen_${appUser.id}`).then(seen => {
      setShowOnboarding(!seen);
      setOnboardingChecked(true);
    });
  }, [appUser?.id]);

  const finishOnboarding = async () => {
    if (appUser) {
      await AsyncStorage.setItem(`onboarding_seen_${appUser.id}`, 'true');
    }
    setShowOnboarding(false);
  };

  if (loading || (appUser && !onboardingChecked)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (firebaseUser && !appUser) {
    return <AccountSetupScreen />;
  }

  if (appUser && showOnboarding) {
    return (
      <OnboardingScreen
        isDriver={appUser.role === 'driver'}
        onDone={finishOnboarding}
      />
    );
  }

  // Gate unverified drivers before giving them the full navigator
  if (firebaseUser && appUser && !appUser.isAdmin && appUser.role === 'driver') {
    const status = appUser.verificationStatus;
    if (!status || status === 'unverified' || resubmitting) {
      return <DriverVerifyScreen onDone={() => setResubmitting(false)} />;
    }
    if (status === 'pending' || status === 'rejected') {
      return (
        <DriverVerifyPendingScreen
          user={appUser}
          onResubmit={() => setResubmitting(true)}
        />
      );
    }
  }

  // Gate senders who haven't completed their identity profile
  if (firebaseUser && appUser && !appUser.isAdmin && appUser.role === 'sender' && !appUser.profileComplete) {
    return <SenderVerifyScreen />;
  }

  return (
    <NavigationContainer>
      {!firebaseUser || !appUser ? (
        <AuthNavigator />
      ) : appUser.isAdmin ? (
        <AdminNavigator />
      ) : appUser.role === 'driver' ? (
        <DriverNavigator />
      ) : (
        <SenderNavigator />
      )}
    </NavigationContainer>
  );
}
