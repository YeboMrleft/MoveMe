import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { listenToMarketplaceItems } from '../../services/marketplaceService';
import { useAuth } from '../../hooks/useAuth';
import { MarketplaceItem } from '../../types';
import CityPickerModal from '../../components/CityPickerModal';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MarketplaceFeedScreen() {
  const nav = useNavigation<any>();
  const { appUser } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(appUser?.serviceCity ?? '');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  useEffect(() => {
    if (!city) { setLoading(false); return; }
    setLoading(true);
    return listenToMarketplaceItems(city, data => {
      setItems(data);
      setLoading(false);
    });
  }, [city]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.cityBtn} onPress={() => setCityPickerOpen(true)}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={styles.cityBtnText}>{city || 'Select city'}</Text>
            <Ionicons name="chevron-down" size={13} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.postBtn} onPress={() => nav.navigate('PostMarketplaceItem')}>
            <Ionicons name="add" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {!city ? (
        <View style={styles.empty}>
          <Ionicons name="location-outline" size={64} color={colors.border} />
          <Text style={styles.emptyTitle}>Select a city</Text>
          <Text style={styles.emptyText}>Choose a city to browse listings near you.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setCityPickerOpen(true)}>
            <Text style={styles.emptyBtnText}>Choose city</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptyText}>Be the first to post an item in {city}.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.navigate('PostMarketplaceItem')}>
                <Text style={styles.emptyBtnText}>Post a listing</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => nav.navigate('MarketplaceItemDetail', { itemId: item.id })}
              activeOpacity={0.85}
            >
              {item.photos.length > 0 ? (
                <Image source={{ uri: item.photos[0] }} style={styles.cardPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.cardPhoto, styles.cardPhotoEmpty]}>
                  <Ionicons name="image-outline" size={32} color={colors.border} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardPrice}>R{item.price.toLocaleString('en-ZA')}</Text>
                <View style={styles.cardMeta}>
                  {item.needsDelivery && (
                    <View style={styles.deliveryBadge}>
                      <Ionicons name="cube-outline" size={10} color={colors.primary} />
                      <Text style={styles.deliveryBadgeText}>Delivery</Text>
                    </View>
                  )}
                  <Text style={styles.timeAgo}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <CityPickerModal
        visible={cityPickerOpen}
        selected={city}
        onSelect={setCity}
        onClose={() => setCityPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '12', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  cityBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  postBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  grid: { padding: 12, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  cardPhoto: { width: '100%', height: 130 },
  cardPhotoEmpty: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 10, gap: 4 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18 },
  cardPrice: { fontSize: 16, fontWeight: '900', color: colors.primary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  deliveryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary + '12', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  deliveryBadgeText: { fontSize: 9, fontWeight: '700', color: colors.primary },
  timeAgo: { fontSize: 10, color: colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, marginTop: 8,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
