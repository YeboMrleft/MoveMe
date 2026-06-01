import React, { useState, useMemo } from 'react';
import {
  Modal, View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { SA_CITIES } from '../constants/cities';

interface Props {
  visible: boolean;
  selected: string;
  onSelect: (city: string) => void;
  onClose: () => void;
}

export default function CityPickerModal({ visible, selected, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => SA_CITIES.filter(c => c.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const handleSelect = (city: string) => {
    onSelect(city);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select your city / town</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cities…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, item === selected && styles.rowSelected]}
              onPress={() => handleSelect(item)}
            >
              <Text style={[styles.rowText, item === selected && styles.rowTextSelected]}>
                {item}
              </Text>
              {item === selected && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No cities match "{query}"</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surfaceAlt, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: colors.border + '50',
  },
  rowSelected: { backgroundColor: colors.primary + '10' },
  rowText: { fontSize: 15, color: colors.text },
  rowTextSelected: { color: colors.primary, fontWeight: '700' },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
