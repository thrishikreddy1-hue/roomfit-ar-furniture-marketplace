import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, shadow } from '../theme';
import { assetUrl } from '../lib/config';
import { hasAr } from '../lib/ar';
import { availabilityLabel } from '../lib/availability.mjs';
import { dims } from '../lib/format';
import { Badge } from './ui';

export default function ProductCard({ product, width, style }) {
  const availability = availabilityLabel(product);
  return (
    <Pressable
      onPress={() => router.push(`/product/${product.id}`)}
      style={({ pressed }) => [styles.card, width && { width }, pressed && { opacity: 0.9 }, style]}
      role="button"
      accessibilityLabel={`${product.name} from ${product.shop?.name || 'a local shop'}`}
    >
      <View style={styles.imageWrap}>
        {product.images?.[0] ? (
          <Image source={{ uri: assetUrl(product.images[0]) }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.accentSoft }]} />
        )}
        {hasAr(product) && (
          <View style={styles.badge}>
            <Badge label="View in AR" icon="cube-outline" tone="dark" />
          </View>
        )}
        {product.isSample && <View style={styles.sampleBadge}><Badge label="Sample" tone="accent" /></View>}
      </View>
      <View style={styles.content}>
        <Text style={styles.collection} numberOfLines={1}>{product.category || 'Curated piece'}</Text>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.shop} numberOfLines={1}>{product.shop?.name}</Text>
        <Text style={[styles.cta, availability === 'Sold' && { color: colors.muted }]}>{availability === 'Available' ? 'Enquire for price' : availability}</Text>
        <Text style={styles.dims} numberOfLines={1}>
          {dims(product.dimensions)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: colors.accentSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', left: 8, top: 8 },
  sampleBadge: { position: 'absolute', right: 8, bottom: 8 },
  content: { padding: 13 },
  collection: { fontSize: 10, fontWeight: '700', color: colors.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  shop: { fontSize: 12, color: colors.muted, marginTop: 3 },
  cta: { fontSize: 12.5, fontWeight: '800', color: colors.accent, marginTop: 9 },
  dims: { fontSize: 11, color: colors.muted, marginTop: 3 },
});
