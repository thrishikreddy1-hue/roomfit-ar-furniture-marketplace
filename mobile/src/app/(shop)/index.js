import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { assetUrl } from '../../lib/config';
import { useAsync } from '../../lib/useAsync';
import { useLiveRefresh } from '../../lib/live';
import { useAuth } from '../../context/AuthContext';
import ProductCard from '../../components/ProductCard';
import { Chip, ErrorBox, H2, Loading, Muted } from '../../components/ui';
import { colors, radius, shadow, space } from '../../theme';

const CATEGORY_ICONS = {
  Sofas: 'bed-outline', Chairs: 'easel-outline', Tables: 'grid-outline', Beds: 'moon-outline',
  Storage: 'file-tray-stacked-outline', Lighting: 'bulb-outline', Decor: 'flower-outline', Outdoor: 'sunny-outline',
};
const CATEGORY_TONES = ['sand', 'moss', 'rose', 'sky'];

export default function Home() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { data, loading, error, reload } = useAsync(async () => {
    const [p, s, c, h] = await Promise.all([
      api.products({ sort: 'newest' }),
      api.shops(),
      api.categories(),
      api.health().catch(() => null),
    ]);
    return { products: p.products, shops: s.shops, categories: c.categories, demoMode: Boolean(h?.demoMode) };
  });
  useLiveRefresh(reload, (e) => e.type.startsWith('product.') || e.type.startsWith('shop.'));

  if (loading) return <Loading />;
  const cardW = Math.min(200, (width - space(4) * 2 - 12) / 2);
  const heroProduct = data?.products?.[0];
  const recommended = [...(data?.products || [])]
    .filter((p) => p.modelUrl || p.category)
    .sort((a, b) => Number(Boolean(b.modelUrl)) - Number(Boolean(a.modelUrl)))
    .slice(0, 6);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: space(10) }} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
        <View style={styles.top}>
          <View>
            <Text style={styles.hello}>{user ? `Hi, ${user.name.split(' ')[0]}` : 'Welcome to'}</Text>
            <Text style={styles.brand}>RoomFit</Text>
            <Text style={styles.tagline}>CURATED INTERIORS · MADE PERSONAL</Text>
          </View>
          <Pressable onPress={() => router.push('/browse')} style={styles.searchBtn} accessibilityLabel="Search">
            <Ionicons name="search" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: space(4) }}>
          <ErrorBox error={error} onRetry={reload} />
          {data?.demoMode && (
            <View style={styles.demo}>
              <Ionicons name="flask-outline" size={16} color={colors.warn} />
              <Text style={styles.demoText}>Demo mode: accounts and enquiries reset from time to time.</Text>
            </View>
          )}
        </View>

        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>THE PRIVATE VIEWING</Text>
            <Text style={styles.heroTitle}>Designed for your room, before it arrives.</Text>
            <Text style={styles.heroBody}>
              Place considered pieces at true scale, discover the silhouette in your space, and choose with confidence.
            </Text>
            <Pressable style={styles.heroCta} onPress={() => router.push({ pathname: '/browse', params: { arOnly: '1', fitMode: '1' } })}>
              <Ionicons name="cube-outline" size={16} color={colors.ink} />
              <Text style={styles.heroCtaText}>Explore AR collection</Text>
            </Pressable>
          </View>

          {heroProduct?.images?.[0] ? (
            <View style={styles.heroVisual}>
              <Image source={{ uri: assetUrl(heroProduct.images[0]) }} style={styles.heroImage} resizeMode="cover" />
              <View style={styles.heroImageBadge}>
                <Ionicons name="cube-outline" size={12} color="#fff" />
                <Text style={styles.heroImageBadgeText}>AR EDIT</Text>
              </View>
            </View>
          ) : (
            <View style={styles.heroVisualFallback}>
              <Ionicons name="cube-outline" size={28} color="#fff" />
            </View>
          )}
        </View>

        {data && (
          <>
            <Section title="Shop by category">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space(4) }}>
                {data.categories.map((c, index) => (
                  <Chip key={c} label={c} icon={CATEGORY_ICONS[c]} tone={CATEGORY_TONES[index % CATEGORY_TONES.length]} onPress={() => router.push({ pathname: '/browse', params: { category: c } })} />
                ))}
              </ScrollView>
            </Section>

            <Section title="The edit for you" action={{ label: 'View AR edit', onPress: () => router.push({ pathname: '/browse', params: { arOnly: '1', fitMode: '1' } }) }}>
              <FlatList
                horizontal
                data={recommended}
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: space(4), gap: 12, paddingBottom: 6 }}
                renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
              />
            </Section>

            <Section title="New arrivals" action={{ label: 'View all', onPress: () => router.push('/browse') }}>
              <FlatList
                horizontal
                data={data.products.slice(0, 8)}
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: space(4), gap: 12, paddingBottom: 6 }}
                renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
              />
            </Section>

            <Section title="Shops near you">
              <View style={{ paddingHorizontal: space(4), gap: 12 }}>
                {data.shops.map((s) => (
                  <Pressable key={s.id} style={styles.shop} onPress={() => router.push(`/shop/${s.id}`)}>
                    {s.logo ? <Image source={{ uri: assetUrl(s.logo) }} style={styles.shopLogo} /> : <View style={[styles.shopLogo, { backgroundColor: colors.accentSoft }]} />}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopName}>{s.name}</Text>
                      <Muted numberOfLines={1}>{s.description}</Muted>
                      <Text style={styles.shopMeta}>
                        <Ionicons name="location-outline" size={12} /> {s.city || '—'} · {s.productCount} items
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, action, children }) {
  return (
    <View style={{ marginTop: space(6) }}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionTitle}>
          <View style={styles.sectionMark} />
          <H2>{title}</H2>
        </View>
        {action && (
          <Pressable onPress={action.onPress}>
            <Text style={styles.sectionAction}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space(4), paddingBottom: space(3) },
  hello: { color: colors.muted, fontSize: 14 },
  tagline: { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginTop: 3 },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warnSoft, borderRadius: radius.sm, padding: space(2), marginBottom: space(2) },
  demoText: { flex: 1, color: colors.warn, fontSize: 13 },
  brand: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  searchBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, ...shadow },
  hero: {
    marginHorizontal: space(4),
    marginTop: space(2),
    backgroundColor: colors.ink,
    borderRadius: 30,
    padding: space(5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#302B26',
    ...shadow,
  },
  eyebrow: { color: '#D6B27A', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  heroTitle: { color: '#FFFCF7', fontSize: 25, fontWeight: '800', lineHeight: 30, letterSpacing: -0.7 },
  heroBody: { color: '#D6CEC4', fontSize: 14, marginTop: 10, lineHeight: 20 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#D6B27A', borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, marginTop: space(4), borderWidth: 1, borderColor: '#E7C896' },
  heroCtaText: { fontWeight: '700', color: colors.ink },
  heroVisual: { width: 118, height: 142, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: '#52463A', elevation: 2, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  heroImage: { width: '100%', height: '100%' },
  heroImageBadge: { position: 'absolute', left: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(31,26,23,0.48)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  heroImageBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heroVisualFallback: { width: 118, height: 142, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#52463A' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: space(4), marginBottom: space(3) },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionMark: { width: 4, height: 22, borderRadius: 2, backgroundColor: colors.accentWarm },
  sectionAction: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  shop: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, ...shadow },
  shopLogo: { width: 58, height: 58, borderRadius: 14, backgroundColor: '#fff' },
  shopName: { fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  shopMeta: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
