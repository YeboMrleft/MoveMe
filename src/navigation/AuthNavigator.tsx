import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import DriverVerifyScreen from '../screens/auth/DriverVerifyScreen';

export type AuthStackParams = {
  Welcome: undefined;
  RoleSelect: undefined;
  SignUp: { role: 'sender' | 'driver' };
  SignIn: undefined;
  DriverVerify: undefined;
};

const Stack = createStackNavigator<AuthStackParams>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="DriverVerify" component={DriverVerifyScreen} />
    </Stack.Navigator>
  );
}
