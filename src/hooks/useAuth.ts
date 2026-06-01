import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User } from '../types';

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null | undefined>(undefined);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubUser = useRef<(() => void) | null>(null);
  const firstSnap = useRef(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, fbUser => {
      if (unsubUser.current) {
        unsubUser.current();
        unsubUser.current = null;
        firstSnap.current = false;
      }

      setFirebaseUser(fbUser);

      if (fbUser) {
        unsubUser.current = onSnapshot(
          doc(db, 'users', fbUser.uid),
          snap => {
            setAppUser(snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null);
            if (!firstSnap.current) {
              firstSnap.current = true;
              setLoading(false);
            }
          },
          () => {
            setAppUser(null);
            if (!firstSnap.current) {
              firstSnap.current = true;
              setLoading(false);
            }
          },
        );
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUser.current) unsubUser.current();
    };
  }, []);

  return { firebaseUser, appUser, loading };
}
