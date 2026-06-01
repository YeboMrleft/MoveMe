import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { colors } from '../../constants/colors';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { AuthStackParams } from '../../navigation/AuthNavigator';

type Nav = StackNavigationProp<AuthStackParams, 'SignIn'>;

export default function SignInScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your Move-Me account</Text>

        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry />

        <Button label="Sign In" onPress={handleSignIn} loading={loading} style={styles.mt} />

        <TouchableOpacity onPress={() => nav.navigate('RoleSelect')} style={styles.registerLink}>
          <Text style={styles.registerText}>New here? <Text style={styles.registerBold}>Create an account</Text></Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, paddingTop: 16 },
  back: { marginBottom: 24 },
  backText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32 },
  mt: { marginTop: 8 },
  registerLink: { alignItems: 'center', marginTop: 20 },
  registerText: { color: colors.textSecondary, fontSize: 14 },
  registerBold: { color: colors.primary, fontWeight: '700' },
});
