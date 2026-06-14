import React, { forwardRef, useImperativeHandle, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { colors } from '../constants/colors';

const MAPBOX_TOKEN: string =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
  (Constants.expoConfig?.extra as any)?.mapboxToken ??
  '';

export interface Coords { latitude: number; longitude: number }

export interface AddressAutocompleteRef {
  setText: (text: string) => void;
}

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface Props {
  label?: string;
  placeholder: string;
  onSelect: (address: string, coords: Coords) => void;
  zIndex?: number;
}

const AddressAutocomplete = forwardRef<AddressAutocompleteRef, Props>(
  ({ label, placeholder, onSelect, zIndex = 1 }, ref) => {
    const [text, setText]             = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading]       = useState(false);
    const [open, setOpen]             = useState(false);
    const debounceRef                 = useRef<ReturnType<typeof setTimeout>>();

    useImperativeHandle(ref, () => ({
      setText: (val: string) => {
        setText(val);
        setSuggestions([]);
        setOpen(false);
      },
    }));

    const search = useCallback(async (query: string) => {
      if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
      setLoading(true);
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
          `?access_token=${MAPBOX_TOKEN}&country=ZA&language=en&limit=6` +
          `&types=address,place,street,locality,neighborhood,poi,region`;
        const res  = await fetch(url);
        const json = await res.json();
        const features: Suggestion[] = json.features ?? [];
        setSuggestions(features);
        setOpen(features.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, []);

    const handleChange = (val: string) => {
      setText(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(val), 350);
    };

    const handleSelect = (item: Suggestion) => {
      const [lng, lat] = item.center;
      setText(item.place_name);
      setSuggestions([]);
      setOpen(false);
      onSelect(item.place_name, { latitude: lat, longitude: lng });
    };

    return (
      <View style={[styles.wrapper, { zIndex }]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={handleChange}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {loading && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          )}
        </View>

        {open && suggestions.length > 0 && (
          <View style={[styles.dropdown, { zIndex: zIndex + 99, elevation: zIndex + 99 }]}>
            {suggestions.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, i < suggestions.length - 1 && styles.rowBorder]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowText} numberOfLines={2}>{item.place_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }
);

AddressAutocomplete.displayName = 'AddressAutocomplete';
export default AddressAutocomplete;

const styles = StyleSheet.create({
  wrapper:   { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1, fontSize: 16, color: colors.text,
  },
  spinner:  { marginLeft: 8 },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    marginTop: 2,
    shadowColor: '#000', shadowOpacity: 0.12,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: colors.surface,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowText:   { fontSize: 14, color: colors.text },
});
