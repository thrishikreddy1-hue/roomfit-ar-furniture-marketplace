import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { assetUrl } from '../../lib/config';
import { useAsync } from '../../lib/useAsync';
import { useLiveRefresh } from '../../lib/live';
import { useAuth } from '../../context/AuthContext';
import ProductCard from '../../components/ProductCard';
import { Button, Empty, ErrorBox, Field, H1, H2, Loading, Muted, Screen } from '../../components/ui';
import { colors, radius, space } from '../../theme';

export default function ShopDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { data, loading, error, reload } = useAsync(() => api.shop(id), [id]);
  const reviews = useAsync(() => api.shopReviews(id), [id]);
  useLiveRefresh(reload, (e) => e.shopId === id && (e.type.startsWith('product.') || e.type.startsWith('shop.')));

  if (loading) return <Loading />;
  if (!data) return <Screen><ErrorBox error={error} onRetry={reload} /></Screen>;

  const { shop, products } = data;
  const columns = width > 700 ? 3 : 2;
  const cardW = (width - space(4) * 2 - 12 * (columns - 1)) / columns;

  return (
    <>
      <Stack.Screen options={{ title: shop.name }} />
      <FlatList
        key={columns}
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}
        data={products}
        numColumns={columns}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View style={{ marginBottom: space(4) }}>
            {shop.coverImage ? <Image source={{ uri: assetUrl(shop.coverImage) }} style={styles.cover} /> : null}
            {!shop.coverImage && (
              <View style={styles.coverFallback}>
                <Ionicons name="storefront-outline" size={38} color="#F7EFE5" />
                <Text style={styles.coverKicker}>LOCAL DESIGN HOUSE</Text>
              </View>
            )}
            <View style={styles.head}>
              {shop.logo ? <Image source={{ uri: assetUrl(shop.logo) }} style={styles.logo} /> : <View style={styles.logoFallback}><Text style={styles.logoText}>{shop.name[0]?.toUpperCase()}</Text></View>}
              <View style={{ flex: 1 }}>
                <H1 style={{ fontSize: 22 }}>{shop.name}</H1>
                <Text style={styles.meta}>
                  <Ionicons name="location-outline" size={13} /> {[shop.address, shop.city].filter(Boolean).join(', ') || '—'}
                </Text>
              </View>
            </View>
            {shop.description ? <Muted style={styles.description}>{shop.description}</Muted> : null}
            <View style={styles.countPill}><Text style={styles.count}>{products.length} curated {products.length === 1 ? 'piece' : 'pieces'}</Text></View>
            <View style={styles.reviewCard}>
              <H2 style={{ fontSize: 16 }}>Shop reviews</H2>
              <Text style={styles.rating}>{reviews.data?.average ? `${reviews.data.average.toFixed(1)} ★` : 'New shop'} <Text style={styles.reviewCount}>· {reviews.data?.count || 0} reviews</Text></Text>
              {(reviews.data?.reviews || []).slice(0, 2).map((review) => <Text key={review.id} style={styles.reviewText}>“{review.body || 'Great experience.'}” — {review.buyerName}</Text>)}
              {user?.role === 'buyer' && <ReviewForm shopId={shop.id} onSaved={reviews.reload} />}
            </View>
          </View>
        }
        ListEmptyComponent={<Empty title="No products yet" body="This shop hasn't listed anything yet." />}
        renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
      />
    </>
  );
}

function ReviewForm({ shopId, onSaved }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async () => {
    setBusy(true); setError(null);
    try { await api.reviewShop(shopId, { rating, body }); setBody(''); await onSaved(); } catch (e) { setError(e); } finally { setBusy(false); }
  };
  return (
    <View style={{ marginTop: space(3) }}>
      <Text style={styles.reviewLabel}>Rate your experience</Text>
      <View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => setRating(value)}><Text style={[styles.star, value <= rating && styles.starOn]}>★</Text></Pressable>)}</View>
      <Field label="Optional note" value={body} onChangeText={setBody} placeholder="Tell future shoppers about the shop" multiline />
      {error && <Muted style={{ color: colors.danger }}>{error.message}</Muted>}
      <Button small title="Post review" onPress={submit} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 190, borderRadius: radius.lg, backgroundColor: '#fff' },
  coverFallback: { width: '100%', height: 190, borderRadius: radius.lg, backgroundColor: colors.accentForest, alignItems: 'center', justifyContent: 'center', gap: 9 },
  coverKicker: { color: '#F7EFE5', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: space(3) },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  logoFallback: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: '#DEC8A9', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.accent, fontSize: 25, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  description: { marginTop: space(3), lineHeight: 21 },
  countPill: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6, marginTop: space(3) },
  count: { fontWeight: '800', fontSize: 12, color: colors.accent },
  reviewCard: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: 14, marginTop: space(4) },
  rating: { color: colors.accent, fontSize: 18, fontWeight: '800', marginTop: 5 },
  reviewCount: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  reviewText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  reviewLabel: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  star: { color: colors.border, fontSize: 24 },
  starOn: { color: colors.accentWarm },
});
