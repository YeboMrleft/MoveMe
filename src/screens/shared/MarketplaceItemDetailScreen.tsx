import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { colors } from '../../constants/colors';
import { getMarketplaceItem, updateMarketplaceItemStatus } from '../../services/marketplaceService';
import { createConversation } from '../../services/jobService';
import { useAuth } from '../../hooks/useAuth';
import { MarketplaceItem } from '../../types';
import StarRating from '../../components/StarRating';
import Button from '../../components/Button';

type Params = { MarketplaceItemDetail: { itemId: string } };
const { width } = Dimensions.get('window');

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)} days ago`;
}

export default function MarketplaceItemDetailScreen() {
  const nav = useNavigation<any>();
  const { params } = useRoute<RouteProp<Params, 'MarketplaceItemDetail'>>();
  const { itemId } = params;
  const { appUser } = useAuth();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const uid = getAuth().currentUser?.uid ?? '';
  const isOwner = item?.sellerId === uid;

  useEffect(() => {
    getMarketplaceItem(itemId).then(i => { setItem(i); setLoading(false); });
  }, [itemId]);

  const handleChat = async () => {
    if (!item) return;
    const convId = await createConversation({
      jobId: itemId,
      userId: uid,
      driverId: item.sellerId,
      driverName: item.sellerName,
      userName: appUser?.name ?? '',
      quotedPrice: item.price,
      status: 'active',
    });
    nav.navigate('Chat', {
      conversationId: convId,
      jobId: itemId,
      otherName: item.sellerName,
      otherUserId: item.sellerId,
    });
  };

  const handleMarkSold = () => {
    Alert.alert('Mark as sold?', 'This will remove the listing from the marketplace.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark sold',
        onPress: async () => {
          await updateMarketplaceItemStatus(itemId, 'sold');
          Alert.alert('Marked as sold', '', [{ text: 'OK', onPress: () => nav.goBack() }]);
        },
      },
    ]);
  };

  const handleRemove = () => {
    Alert.alert('Remove listing?', 'This will permanently remove your listing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await updateMarketplaceItemStatus(itemId, 'removed');
          nav.goBack();
        },
      },
    ]);
  };

  if (loading || !item) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Photos */}
        {item.photos.length > 0 ? (
          <View>
            <ScrollView
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {item.photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={[styles.photo, { width }]} resizeMode="cover" />
              ))}
            </ScrollView>
            {item.photos.length > 1 && (
              <View style={styles.dots}>
                {item.photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === photoIdx && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons name="image-outline" size={56} color={colors.border} />
          </View>
        )}

        {/* Title + price */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.timeText}>{timeAgo(item.createdAt)} · {item.city}</Text>
          </View>
          <Text style={styles.price}>R{item.price.toLocaleString('en-ZA')}</Text>
        </View>

        {/* Delivery badge */}
        {item.needsDelivery && (
          <View style={styles.deliveryCard}>
            <Ionicons name="cube-outline" size={18} color={colors.primary} />
            <View>
              <Text style={styles.deliveryTitle}>Delivery needed</Text>
              {item.deliveryArea && (
                <Text style={styles.deliveryArea}>Area: {item.deliveryArea}</Text>
              )}
            </View>
          </View>
        )}

        {/* Seller */}
        <View style={styles.sellerCard}>
          <View style={styles.sellerLeft}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerInitial}>{item.sellerName[0]?.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.sellerName}>{item.sellerName}</Text>
              {item.sellerRating > 0 && (
                <View style={styles.sellerRating}>
                  <StarRating value={Math.round(item.sellerRating)} size={12} />
                  <Text style={styles.sellerRatingText}>{item.sellerRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Description */}
        {item.description ? (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>Description</Text>
            <Text style={styles.descText}>{item.description}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          {isOwner ? (
            <>
              <Button label="Mark as Sold" onPress={handleMarkSold} style={styles.actionBtn} />
              <Button label="Remove listing" onPress={handleRemove} variant="danger" style={styles.actionBtn} />
            </>
          ) : (
            <>
              <Button label="Chat with seller" onPress={handleChat} style={styles.actionBtn} />
              {item.needsDelivery && (
                <Button
                  label="Request delivery"
                  onPress={() => nav.navigate('PostJob')}
                  variant="outline"
                  style={styles.actionBtn}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  container: { paddingBottom: 40 },
  photo: { height: 280 },
  photoEmpty: {
    height: 200, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  titleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 20, paddingBottom: 12,
  },
  itemTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  timeText: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  price: { fontSize: 28, fontWeight: '900', color: colors.primary },
  deliveryCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: colors.primary + '10', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  deliveryTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  deliveryArea: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sellerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  sellerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  sellerInitial: { fontSize: 18, fontWeight: '900', color: colors.primary },
  sellerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  sellerRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  sellerRatingText: { fontSize: 12, color: colors.textMuted },
  descCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  descLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  descText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  actions: { paddingHorizontal: 20, gap: 10, marginTop: 8 },
  actionBtn: {},
});
