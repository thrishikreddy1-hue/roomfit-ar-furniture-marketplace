import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { hasPhone } from '../../lib/contact';
import { useAsync } from '../../lib/useAsync';
import { useLiveRefresh } from '../../lib/live';
import { useAuth } from '../../context/AuthContext';
import DemoModeNotice from '../../components/DemoModeNotice';
import { Button, Card, Empty, ErrorBox, H1, H2, LiveBadge, Loading, Muted, Screen } from '../../components/ui';
import { colors, space } from '../../theme';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function Dashboard() {
  const { shop, user } = useAuth();
  const { data, loading, error, reload } = useAsync(async () => {
    if (!shop) return null;
    const [mine, enq] = await Promise.all([api.myShop(), api.enquiries()]);
    const since = Date.now() - WEEK_MS;
    const thisWeek = enq.enquiries.filter((e) => new Date(e.createdAt).getTime() > since).length;
    return { shop: mine.shop, products: mine.products, enquiries: enq.enquiries, thisWeek, analytics: mine.analytics };
  }, [shop?.id]);
  // New enquiries and AR models added by the RoomFit team appear without a refresh.
  useLiveRefresh(reload, (e) => e.shopId === shop?.id);

  if (!shop) {
    return (
      <Screen>
        <Empty icon="storefront-outline" title={`Welcome, ${user.name.split(' ')[0]}`}
          body="Set up your shop profile, then list your furniture with photos and sizes. The RoomFit team adds 3D models so shoppers can see pieces in their rooms."
          action={<Button title="Set up my shop" onPress={() => router.push('/seller/shop-form')} />} />
      </Screen>
    );
  }
  if (loading) return <Loading />;

  const products = data?.products || [];
  const enquiries = data?.enquiries || [];
  const productLimitReached = products.length >= 20;
  const stats = [
    { icon: 'mail-unread-outline', label: 'New messages', value: enquiries.filter((e) => e.status === 'new').length },
    { icon: 'cube-outline', label: 'Products listed', value: products.length },
    { icon: 'eye-outline', label: 'Product views', value: data?.analytics?.productViews || 0 },
    { icon: 'scan-outline', label: 'AR launches', value: data?.analytics?.arLaunches || 0 },
  ];
  const thisWeek = data?.thisWeek || 0;

  // Most-enquired piece, to show what shoppers are interested in.
  const counts = new Map();
  for (const e of enquiries) counts.set(e.productName, (counts.get(e.productName) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  const noPhone = !hasPhone(shop.phone);
  const noPhotos = products.filter((p) => !p.images?.length);
  const unavailable = products.filter((p) => p.stock < 1);
  const arPending = products.length - products.filter((p) => p.modelUrl).length;

  return (
    <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>SELLER SPACE</Text>
          <H1>{shop.name}</H1>
        </View>
        <LiveBadge />
      </View>
      <Muted>{shop.city || 'Your shop dashboard'}</Muted>
      {data?.shop?.suspended && (
        <Card style={styles.suspended}>
          <H2 style={{ fontSize: 16, color: colors.danger }}>Your shop is hidden from shoppers</H2>
          <Muted style={{ color: colors.danger, marginTop: 4 }}>
            RoomFit has suspended {shop.name}. Your products don&apos;t appear in the catalogue and shoppers can&apos;t send new
            enquiries. You can still reply to existing ones. Contact RoomFit support to resolve this.
          </Muted>
        </Card>
      )}
      <DemoModeNotice style={{ marginTop: space(3) }} />
      <ErrorBox error={error} onRetry={reload} />

      <Card style={styles.startHere}>
        <Text style={styles.startTitle}>What would you like to do?</Text>
        <Muted style={styles.startBody}>Keep your shop moving with these two simple steps.</Muted>
        <View style={styles.actionStack}>
          <Button title={productLimitReached ? 'Product limit reached' : 'Add a product'} icon="add" disabled={productLimitReached} onPress={() => router.push('/seller/product-form')} />
          <Button title="Reply to messages" icon="chatbubbles-outline" variant="outline" onPress={() => router.push('/inbox')} />
        </View>
        {productLimitReached && <Muted style={{ marginTop: space(2) }}>Your shop can list up to 20 products.</Muted>}
      </Card>

      <Text style={styles.sectionLabel}>AT A GLANCE</Text>
      <View style={styles.grid}>
        {stats.map((s) => (
          <Card key={s.label} style={styles.stat}>
            <Ionicons name={s.icon} size={18} color={colors.accent} />
            <Text style={styles.statVal}>{s.value}</Text>
            <Muted style={{ fontSize: 12 }}>{s.label}</Muted>
          </Card>
        ))}
      </View>

      <Card style={{ marginTop: space(3) }}>
        <Muted style={{ fontSize: 12 }}>Messages received this week</Muted>
        <Text style={styles.big}>{thisWeek}</Text>
        <Muted style={{ fontSize: 12, marginTop: 4 }}>
          {top ? `Most asked about: ${top[0]} (${top[1]})` : 'No messages yet. Clear photos and accurate sizes help shoppers decide.'}
        </Muted>
      </Card>

      {data?.analytics?.mostViewed && (
        <Card style={{ marginTop: space(3) }}>
          <Text style={styles.kicker}>SHOPPER INTEREST</Text>
          <H2 style={{ fontSize: 16, marginTop: 2 }}>{data.analytics.mostViewed.name}</H2>
          <Muted style={{ marginTop: 3 }}>{data.analytics.mostViewed.viewCount || 0} product views</Muted>
        </Card>
      )}

      <Muted style={{ marginTop: space(3), fontSize: 12 }}>
        AR launches count taps on “Place in my room.” {data?.analytics?.arSessions || 0} browser AR sessions started. External phone viewers do not report successful placement.
      </Muted>

      {(noPhone || noPhotos.length > 0 || unavailable.length > 0) && (
        <Card style={{ marginTop: space(3) }}>
          <H2 style={{ fontSize: 16, marginBottom: 6 }}>A few things to finish</H2>
          {noPhone && <Muted>• Add a phone number so shoppers can call or WhatsApp you</Muted>}
          {unavailable.map((p) => (
            <Muted key={`s${p.id}`}>• {p.name}: marked unavailable (stock 0)</Muted>
          ))}
          {noPhotos.map((p) => (
            <Muted key={`m${p.id}`}>• {p.name}: add photos so shoppers can see it clearly</Muted>
          ))}
        </Card>
      )}

      {arPending > 0 && (
        <Muted style={{ marginTop: space(3), fontSize: 13 }}>
          {arPending === 1 ? '1 product is' : `${arPending} products are`} being prepared for AR by the RoomFit team. It will become available automatically.
        </Muted>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 4 },
  suspended: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft, marginTop: space(3) },
  startHere: { marginTop: space(4), backgroundColor: colors.accentSoft, borderColor: '#DEC8A9' },
  startTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  startBody: { marginTop: 4 },
  actionStack: { gap: 10, marginTop: space(3) },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: space(5), marginBottom: -space(1) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space(4) },
  stat: { flexBasis: '47%', flexGrow: 1, padding: 14 },
  statVal: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 4 },
  big: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 2 },
});
