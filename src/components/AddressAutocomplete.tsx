import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { colors } from '../constants/colors';

const API_KEY: string =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ??
  (Constants.expoConfig?.extra as any)?.googleMapsKey ??
  '';

export interface Coords { latitude: number; longitude: number }

interface Props {
  label?: string;
  placeholder: string;
  onSelect: (address: string, coords: Coords) => void;
  zIndex?: number;
}

const AddressAutocomplete = forwardRef<GooglePlacesAutocompleteRef, Props>(
  ({ label, placeholder, onSelect, zIndex = 1 }, ref) => {

    const handlePress = async (data: any, details: any) => {
      const address = data.description ?? data.structured_formatting?.main_text ?? '';

      // Primary: geometry from Places Details API
      const loc = details?.geometry?.location;
      if (loc?.lat != null && loc?.lng != null && (loc.lat !== 0 || loc.lng !== 0)) {
        onSelect(address, { latitude: loc.lat, longitude: loc.lng });
        return;
      }

      // Fallback 1: Google Geocoding API
      if (API_KEY && address) {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
          );
          const json = await res.json();
          const geoLoc = json.results?.[0]?.geometry?.location;
          if (geoLoc?.lat != null && geoLoc?.lng != null) {
            onSelect(address, { latitude: geoLoc.lat, longitude: geoLoc.lng });
            return;
          }
        } catch {}
      }

      // Fallback 2: device geocoder
      try {
        const results = await Location.geocodeAsync(address);
        if (results.length > 0) {
          onSelect(address, { latitude: results[0].latitude, longitude: results[0].longitude });
          return;
        }
      } catch {}

      onSelect(address, { latitude: 0, longitude: 0 });
    };

    return (
      <View style={[styles.wrapper, { zIndex }]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <GooglePlacesAutocomplete
          ref={ref}
          placeholder={placeholder}
          fetchDetails
          keyboardShouldPersistTaps="handled"
          onPress={handlePress}
          query={{
            key: API_KEY,
            language: 'en',
            components: 'country:za',
          }}
          enablePoweredByContainer={false}
          debounce={350}
          minLength={2}
          styles={{
            container: { flex: 0, zIndex },
            textInputContainer: styles.inputContainer,
            textInput: styles.textInput,
            listView: {
              ...StyleSheet.flatten(styles.listView),
              zIndex: zIndex + 99,
              elevation: zIndex + 99,
            },
            row: styles.row,
            description: styles.rowText,
            separator: styles.separator,
            poweredContainer: { display: 'none' },
          }}
        />
      </View>
    );
  }
);

AddressAutocomplete.displayName = 'AddressAutocomplete';
export default AddressAutocomplete;

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputContainer: {
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: 14,
  },
  textInput: {
    height: 50, fontSize: 16, color: colors.text,
    backgroundColor: 'transparent', margin: 0, padding: 0,
  },
  listView: {
    backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    marginTop: 2,
    elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.12,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  row: {
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: colors.surface,
  },
  rowText: { fontSize: 14, color: colors.text },
  separator: { height: 1, backgroundColor: colors.divider, marginHorizontal: 14 },
});
