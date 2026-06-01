import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PendingVerificationsScreen from '../screens/admin/PendingVerificationsScreen';
import DriverReviewScreen from '../screens/admin/DriverReviewScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

export type AdminStackParams = {
  PendingVerifications: undefined;
  DriverReview: { driverId: string };
  AdminDashboard: undefined;
};

const Stack = createStackNavigator<AdminStackParams>();

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PendingVerifications" component={PendingVerificationsScreen} />
      <Stack.Screen name="DriverReview" component={DriverReviewScreen} />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </Stack.Navigator>
  );
}
