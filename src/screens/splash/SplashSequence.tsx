import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import InkaTechSplash from './InkaTechSplash';
import MoveMeSplash from './MoveMeSplash';

interface Props {
  onComplete: () => void;
}

export default function SplashSequence({ onComplete }: Props) {
  const inkaTechOpacity = useRef(new Animated.Value(1)).current;
  const moveMeOpacity = useRef(new Animated.Value(0)).current;
  const [showMoveme, setShowMoveme] = useState(false);

  useEffect(() => {
    // 1. Show Inka-Tech for 3.5s then cross-fade to Move-Me
    const timer = setTimeout(() => {
      setShowMoveme(true);

      Animated.parallel([
        Animated.timing(inkaTechOpacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(moveMeOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 2. Show Move-Me for 5s then hand off to app
        setTimeout(onComplete, 5000);
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <InkaTechSplash opacity={inkaTechOpacity} />
      {showMoveme && <MoveMeSplash opacity={moveMeOpacity} />}
    </>
  );
}
