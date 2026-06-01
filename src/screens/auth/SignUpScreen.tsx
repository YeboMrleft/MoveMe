import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { createUser } from '../../services/userService';
import { colors } from '../../constants/colors';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { AuthStackParams } from '../../navigation/AuthNavigator';

type Nav = StackNavigationProp<AuthStackParams, 'SignUp'>;
type Route = RouteProp<AuthStackParams, 'SignUp'>;

export default function SignUpScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { role } = params;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      try {
        await createUser(user.uid, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          role,
          rating: 0,
          totalTrips: 0,
          createdAt: Date.now(),
        });
      } catch {
        // Auth user created but Firestore write failed — user will land on AccountSetupScreen
      }
      if (role === 'driver') nav.navigate('DriverVerify');
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          {role === 'driver' ? 'Join as a bakkie driver' : 'Start moving your stuff'}
        </Text>

        <Input label="Full Name" value={name} onChangeText={setName} placeholder="John Dlamini" autoCapitalize="words" />
        <Input label="Phone Number" value={phone} onChangeText={setPhone} placeholder="082 000 0000" keyboardType="phone-pad" />
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry />

        <Button label="Create Account" onPress={handleSignUp} loading={loading} style={styles.mt} />

        <TouchableOpacity onPress={() => nav.navigate('SignIn')} style={styles.loginLink}>
          <Text style={styles.loginText}>Already have an account? <Text style={styles.loginBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingTop: 16 },
  back: { marginBottom: 24 },
  backText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32 },
  mt: { marginTop: 8 },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginText: { color: colors.textSecondary, fontSize: 14 },
  loginBold: { color: colors.primary, fontWeight: '700' },
});
