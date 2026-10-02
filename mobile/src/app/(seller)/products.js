import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { assetUrl } from '../../lib/config';
import { useAsync } from '../../lib/useAsync';
import { useLiveRefresh } from '../../lib/live';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, Empty, ErrorBox, Loading, Muted } from '../../components/ui';
import { colors, radius, space } from '../../theme';

export default function SellerProducts() {
  const { shop } = useAuth();
  const { data, loading, error, reload } = useAsync(
    () => (shop ? api.myShop().then((r) => r.products) : Promise.resolve([])),
    [shop?.id],
  );
  useLiveRefresh(reload, (e) => e.type.startsWith('product.') && e.shopId === shop?.id);

  if (loading) return <Loading />;
  const productCount = data?.length || 0;
  const productLimitReached = productCount >= 20;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}
      data={data || []}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <>
          <ErrorBox error={error} onRetry={reload} />
          {shop && (
            <>
              <Text style={styles.pageTitle}>Your products</Text>
              <Muted style={styles.helper}>Add photos, size, and stock. We’ll make them available to shoppers once they’re ready.</Muted>
              <Button
                title={productLimitReached ? 'Product limit reached' : 'Add product'}
                icon="add"
                disabled={productLimitReached}
                onPress={() => router.push('/seller/product-form')}
                style={{ marginBottom: space(2) }}
              />
              <Muted style={{ marginBottom: space(4) }}>
                {productLimitReached ? `Your shop has reached its 20-product limit.` : `${productCount} of 20 products added`}
              </Muted>
            </>
          )}
        </>
      }
      ListEmptyComponent={
        <Empty icon="cube-outline" title={shop ? 'No products yet' : 'Set up your shop first'}
          body={shop ? 'Add your first piece with photos and its real size. The RoomFit team then adds a 3D model so shoppers can place it in their room.' : undefined}
          action={!shop && <Button title="Set up shop" onPress={() => router.push('/seller/shop-form')} />} />
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item: p }) => (
        <Pressable style={styles.row} onPress={() => router.push({ pathname: '/seller/product-form', params: { id: p.id } })}>
          <Image source={{ uri: assetUrl(p.images?.[0]) }} style={styles.thumb} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
            <Muted style={{ fontSize: 12 }}>{p.category} · {p.dimensions.width}×{p.dimensions.depth}×{p.dimensions.height} cm</Muted>
            <View style={styles.meta}>
              <Text style={[styles.stock, p.stock <= 2 && { color: colors.danger }]}>{p.stock} in stock</Text>
              {p.modelUrl ? <Badge label="Ready for AR" icon="cube-outline" tone="success" /> : <Badge label="AR being prepared" icon="time-outline" />}
              <Muted style={{ fontSize: 12 }}>{p.images?.length || 0} photos</Muted>
            </View>
          </View>
          <Ionicons name="create-outline" size={20} color={colors.muted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 25, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, marginBottom: 4 },
  helper: { marginBottom: space(3) },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: '#fff' },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  stock: { fontSize: 12, color: colors.muted },
});
