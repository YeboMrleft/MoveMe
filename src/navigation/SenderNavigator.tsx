import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

import SenderHomeScreen from '../screens/sender/SenderHomeScreen';
import PostJobScreen from '../screens/sender/PostJobScreen';
import JobOffersScreen from '../screens/sender/JobOffersScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ConversationsScreen from '../screens/shared/ConversationsScreen';
import TripActiveScreen from '../screens/shared/TripActiveScreen';
import TrackDriverScreen from '../screens/sender/TrackDriverScreen';
import RateScreen from '../screens/shared/RateScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import HistoryScreen from '../screens/shared/HistoryScreen';
import PaymentScreen from '../screens/shared/PaymentScreen';
import MarketplaceFeedScreen from '../screens/shared/MarketplaceFeedScreen';
import PostMarketplaceItemScreen from '../screens/shared/PostMarketplaceItemScreen';
import MarketplaceItemDetailScreen from '../screens/shared/MarketplaceItemDetailScreen';
import LeaderboardScreen from '../screens/shared/LeaderboardScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

export type SenderStackParams = {
  SenderTabs: undefined;
  PostJob: undefined;
  JobOffers: { jobId: string; paymentId?: string; pendingOfferId?: string; paymentComplete?: boolean };
  Chat: { conversationId: string; jobId: string; otherName: string; otherUserId: string };
  TripActive: { jobId: string };
  TrackDriver: { jobId: string };
  Rate: { jobId: string; toUserId: string; toName: string };
  Payment: { purpose: 'driver_offer' | 'sender_accept'; referenceId: string; returnTo: string; extra?: Record<string, unknown> };
  MarketplaceItemDetail: { itemId: string };
  PostMarketplaceItem: undefined;
  Leaderboard: undefined;
  Notifications: undefined;
};

const Stack = createStackNavigator<SenderStackParams>();
const Tab = createBottomTabNavigator();

function SenderTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          const icons: Record<string, string> = {
            Home: 'home',
            Market: 'storefront',
            Messages: 'chatbubbles',
            History: 'time',
            Profile: 'person',
          };
          return <Ionicons name={(icons[route.name] ?? 'ellipse') as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={SenderHomeScreen} />
      <Tab.Screen name="Market" component={MarketplaceFeedScreen} />
      <Tab.Screen name="Messages" component={ConversationsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function SenderNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SenderTabs" component={SenderTabs} />
      <Stack.Screen name="PostJob" component={PostJobScreen} />
      <Stack.Screen name="JobOffers" component={JobOffersScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="TripActive" component={TripActiveScreen} />
      <Stack.Screen name="TrackDriver" component={TrackDriverScreen} />
      <Stack.Screen name="Rate" component={RateScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="MarketplaceItemDetail" component={MarketplaceItemDetailScreen} />
      <Stack.Screen name="PostMarketplaceItem" component={PostMarketplaceItemScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
