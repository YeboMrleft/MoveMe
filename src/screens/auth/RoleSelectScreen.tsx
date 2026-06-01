import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { AuthStackParams } from '../../navigation/AuthNavigator';

type Nav = StackNavigationProp<AuthStackParams, 'RoleSelect'>;

export default function RoleSelectScreen() {
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>How are you using{'\n'}Move-Me?</Text>
        <Text style={styles.subtitle}>Choose your role to get started.</Text>

        <View style={styles.cards}>
          <TouchableOpacity
            style={[styles.card, { borderColor: colors.primary }]}
            onPress={() => nav.navigate('SignUp', { role: 'sender' })}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="cube-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>I need a bakkie</Text>
            <Text style={styles.cardDesc}>Post a job, get quotes from drivers nearby, move your stuff.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { borderColor: colors.accent }]}
            onPress={() => nav.navigate('SignUp', { role: 'driver' })}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFF9E6' }]}>
              <Ionicons name="car-outline" size={40} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle}>I have a bakkie</Text>
            <Text style={styles.cardDesc}>See jobs near you, negotiate directly, earn on your schedule.</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 40,
  },
  cards: { gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
