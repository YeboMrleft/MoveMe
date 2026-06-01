import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { createMarketplaceItem } from '../../services/marketplaceService';
import { uploadPhoto } from '../../services/storageService';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/Button';
import Input from '../../components/Input';
import CityPickerModal from '../../components/CityPickerModal';

export default function PostMarketplaceItemScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState(appUser?.serviceCity ?? '');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [needsDelivery, setNeedsDelivery] = useState(false);
  const [deliveryArea, setDeliveryArea] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const uid = getAuth().currentUser?.uid ?? '';

  const addPhoto = () => {
    if (photoUris.length >= 4) { Alert.alert('Max 4 photos', 'Remove a photo to add another.'); return; }
    Alert.alert('Add photo', 'Choose source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
          if (!result.canceled) setPhotoUris(p => [...p, result.assets[0].uri]);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
          if (!result.canceled) setPhotoUris(p => [...p, result.assets[0].uri]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePost = async () => {
    if (!title.trim()) { Alert.alert('Title required', 'Add a title for your listing.'); return; }
    const parsed = parseFloat(price);
    if (!price || isNaN(parsed) || parsed <= 0) { Alert.alert('Price required', 'Enter a valid asking price.'); return; }
    if (!city) { Alert.alert('City required', 'Select the city for this listing.'); return; }

    setLoading(true);
    try {
      const uploadedPhotos = await Promise.all(
        photoUris.map((uri, i) => uploadPhoto(uri, `marketplace/${uid}/${Date.now()}_${i}`))
      );
      await createMarketplaceItem({
        sellerId: uid,
        sellerName: appUser?.name ?? '',
        sellerRating: appUser?.rating ?? 0,
        city,
        title: title.trim(),
        description: description.trim(),
        price: parsed,
        photos: uploadedPhotos,
        needsDelivery,
        deliveryArea: needsDelivery ? deliveryArea.trim() : undefined,
        status: 'available',
      });
      Alert.alert('Listed!', 'Your item is now live on the marketplace.', [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List an item</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Photos */}
        <Text style={styles.sectionLabel}>Photos (up to 4)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
          {photoUris.map((uri, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => setPhotoUris(p => p.filter((_, j) => j !== i))}
              >
                <Ionicons name="close-circle" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          {photoUris.length < 4 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhoto}>
              <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
              <Text style={styles.addPhotoText}>Add photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Leather couch, 2-seater" />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Condition, dimensions, any details..."
          multiline numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top', paddingTop: 10 }}
        />
        <Input label="Asking Price (R)" prefix="R" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />

        {/* City */}
        <TouchableOpacity style={styles.cityRow} onPress={() => setCityPickerOpen(true)}>
          <Ionicons name="location-outline" size={18} color={city ? colors.primary : colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cityLabel}>City</Text>
            <Text style={[styles.cityValue, !city && styles.placeholder]}>{city || 'Select city'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.border} />
        </TouchableOpacity>

        {/* Delivery toggle */}
        <TouchableOpacity
          style={[styles.toggleRow, needsDelivery && styles.toggleRowActive]}
          onPress={() => setNeedsDelivery(v => !v)}
          activeOpacity={0.8}
        >
          <Ionicons name={needsDelivery ? 'cube' : 'cube-outline'} size={20} color={needsDelivery ? colors.primary : colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, needsDelivery && { color: colors.primary }]}>Buyer needs to arrange delivery</Text>
            <Text style={styles.toggleSub}>A bakkie driver can deliver this to the buyer</Text>
          </View>
        </TouchableOpacity>

        {needsDelivery && (
          <Input
            label="Delivery area"
            value={deliveryArea}
            onChangeText={setDeliveryArea}
            placeholder="e.g. Cape Town and surrounds"
          />
        )}

        {loading && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}>Uploading photos…</Text>
          </View>
        )}

        <Button label="Post Listing" onPress={handlePost} loading={loading} style={styles.mt} />
      </ScrollView>

      <CityPickerModal visible={cityPickerOpen} selected={city} onSelect={setCity} onClose={() => setCityPickerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  container: { padding: 20, gap: 0 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  photosRow: { gap: 10, marginBottom: 20 },
  photoThumb: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.surface, borderRadius: 10 },
  addPhotoBtn: {
    width: 100, height: 100, borderRadius: 10,
    backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addPhotoText: { fontSize: 11, color: colors.textMuted },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 10, padding: 14,
    borderWidth: 1.5, borderColor: colors.border, marginBottom: 16,
  },
  cityLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  cityValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 2 },
  placeholder: { color: colors.textMuted, fontWeight: '400' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: colors.border, marginBottom: 16,
  },
  toggleRowActive: { borderColor: colors.primary + '60', backgroundColor: colors.primary + '08' },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  toggleSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  uploadingText: { fontSize: 13, color: colors.textSecondary },
  mt: { marginTop: 8, marginBottom: 32 },
});
