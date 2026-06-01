import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../constants/colors';
import Button from '../../components/Button';
import { AuthStackParams } from '../../navigation/AuthNavigator';

type Nav = StackNavigationProp<AuthStackParams, 'Welcome'>;

export default function WelcomeScreen() {
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Flag stripe bar */}
        <View style={styles.flagBar}>
          <View style={[styles.stripe, { backgroundColor: colors.black }]} />
          <View style={[styles.stripe, { backgroundColor: colors.gold }]} />
          <View style={[styles.stripe, { backgroundColor: colors.green, flex: 2 }]} />
          <View style={[styles.stripe, { backgroundColor: colors.white }]} />
          <View style={[styles.stripe, { backgroundColor: colors.red }]} />
          <View style={[styles.stripe, { backgroundColor: colors.blue }]} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.logo}>Move-Me</Text>
          <Text style={styles.tagline}>Need a bakkie? Got a bakkie?{'\n'}Let's connect.</Text>
        </View>

        <View style={styles.actions}>
          <Button label="Get Started" onPress={() => nav.navigate('RoleSelect')} style={styles.mb} />
          <Button
            label="I already have an account"
            onPress={() => nav.navigate('SignIn')}
            variant="outline"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  flagBar: {
    flexDirection: 'row',
    height: 6,
  },
  stripe: { flex: 1 },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  mb: { marginBottom: 12 },
});
