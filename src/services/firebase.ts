import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBEDVcJKxAcWtFA--mdpQSeB2YZnp7myLY',
  authDomain: 'move-me-acc55.firebaseapp.com',
  projectId: 'move-me-acc55',
  storageBucket: 'move-me-acc55.firebasestorage.app',
  messagingSenderId: '210160636128',
  appId: '1:210160636128:web:4f11a421adf32789bf8085',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getApps().length === 1
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);
export const db = getFirestore(app);
export default app;
