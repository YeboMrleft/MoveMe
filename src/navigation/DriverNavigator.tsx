import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import JobDetailScreen from '../screens/driver/JobDetailScreen';
import SubmitOfferScreen from '../screens/driver/SubmitOfferScreen';
import DemandMapScreen from '../screens/driver/DemandMapScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ConversationsScreen from '../screens/shared/ConversationsScreen';
import TripActiveScreen from '../screens/shared/TripActiveScreen';
import RateScreen from '../screens/shared/RateScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import HistoryScreen from '../screens/shared/HistoryScreen';
import PaymentScreen from '../screens/shared/PaymentScreen';
import MarketplaceFeedScreen from '../screens/shared/MarketplaceFeedScreen';
import PostMarketplaceItemScreen from '../screens/shared/PostMarketplaceItemScreen';
import MarketplaceItemDetailScreen from '../screens/shared/MarketplaceItemDetailScreen';
import LeaderboardScreen from '../screens/shared/LeaderboardScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import WalletScreen from '../screens/shared/WalletScreen';
import TopUpScreen from '../screens/shared/TopUpScreen';
import WithdrawalScreen from '../screens/shared/WithdrawalScreen';

export type DriverStackParams = {
  DriverTabs: undefined;
  JobDetail: { jobId: string };
  SubmitOffer: { jobId: string; paymentId?: string; paymentComplete?: boolean; priceValue?: string; noteValue?: string };
  Chat: { conversationId: string; jobId: string; otherName: string; otherUserId: string };
  TripActive: { jobId: string };
  TrackDriver: { jobId: string };
  Rate: { jobId: string; toUserId: string; toName: string };
  Payment: { purpose: 'driver_offer' | 'sender_accept'; referenceId: string; returnTo: string; extra?: Record<string, unknown> };
  DemandMap: undefined;
  MarketplaceItemDetail: { itemId: string };
  PostMarketplaceItem: undefined;
  Leaderboard: undefined;
  Notifications: undefined;
  Wallet: undefined;
  TopUp: undefined;
  Withdrawal: undefined;
};

const Stack = createStackNavigator<DriverStackParams>();
const Tab = createBottomTabNavigator();

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          const icons: Record<string, string> = {
            Jobs: 'list',
            Market: 'storefront',
            Messages: 'chatbubbles',
            History: 'time',
            Profile: 'person',
          };
          return <Ionicons name={(icons[route.name] ?? 'ellipse') as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Jobs" component={DriverHomeScreen} />
      <Tab.Screen name="Market" component={MarketplaceFeedScreen} />
      <Tab.Screen name="Messages" component={ConversationsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverTabs" component={DriverTabs} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="SubmitOffer" component={SubmitOfferScreen} />
      <Stack.Screen name="DemandMap" component={DemandMapScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="TripActive" component={TripActiveScreen} />
      <Stack.Screen name="Rate" component={RateScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="MarketplaceItemDetail" component={MarketplaceItemDetailScreen} />
      <Stack.Screen name="PostMarketplaceItem" component={PostMarketplaceItemScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="TopUp" component={TopUpScreen} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
    </Stack.Navigator>
  );
}
