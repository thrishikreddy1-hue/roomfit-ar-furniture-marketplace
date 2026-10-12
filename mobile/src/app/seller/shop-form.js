import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../lib/api';
import { goBack } from '../../lib/nav';
import { assetUrl } from '../../lib/config';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, ErrorBox, Field, H1, H2, Muted, Screen } from '../../components/ui';
import { colors, radius, space } from '../../theme';

const FIELDS = ['name', 'description', 'city', 'address', 'phone', 'googleMapsUrl', 'logo', 'coverImage', 'whatsappNotifications', 'deliveryAreas', 'assemblyAvailable', 'pickupAvailable'];

export default function ShopForm() {
  const { shop, refreshShop } = useAuth();
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((k) => [k, shop?.[k] ?? (['whatsappNotifications', 'assemblyAvailable', 'pickupAvailable'].includes(k) ? false : '')])));
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setPhone = (phone) => setForm((f) => ({
    ...f,
    phone,
    ...(shop && phone !== shop.phone ? { whatsappNotifications: false } : {}),
  }));

  const pick = async (field) => {
    setError(null);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (res.canceled) return;
      setBusy(field);
      const { url } = await api.upload(res.assets[0]);
      set(field)(url);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy('save');
    setError(null);
    try {
      if (shop) await api.updateShop(shop.id, form);
      else await api.createShop(form);
      await refreshShop();
      goBack('/dashboard');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <H1>{shop ? 'Your shop' : 'Set up your shop'}</H1>
      <Muted style={{ marginBottom: space(4) }}>This is what shoppers see on your storefront.</Muted>
      <Field label="Shop name" value={form.name} onChangeText={set('name')} />
      <Field label="About the shop" value={form.description} onChangeText={set('description')} multiline />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field style={{ flex: 1 }} label="City" value={form.city} onChangeText={set('city')} />
        <Field style={{ flex: 1 }} label="Phone" value={form.phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>
      <Field label="Address" value={form.address} onChangeText={set('address')} />
      <Card style={{ marginVertical: space(3), backgroundColor: colors.accentSkySoft }}>
        <H2 style={{ fontSize: 18, marginBottom: space(2) }}>Add location</H2>
        <Field label="Google Maps location link" value={form.googleMapsUrl} onChangeText={set('googleMapsUrl')}
          placeholder="https://maps.app.goo.gl/…" keyboardType="url" autoCapitalize="none" autoCorrect={false}
          maxLength={2048} hint="Open your shop in Google Maps → Share → Copy link, then paste it here. Buyers can open this location from your shop page. Optional; leave blank to remove it." />
      </Card>
      <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: space(3), marginBottom: space(2) }}>Delivery & collection</Text>
      <Field label="Delivery areas" value={form.deliveryAreas} onChangeText={set('deliveryAreas')} placeholder="e.g. Mumbai, Navi Mumbai" />
      {[['assemblyAvailable', 'Assembly available'], ['pickupAvailable', 'Customer pickup available']].map(([key, label]) => (
        <Pressable key={key} onPress={() => set(key)(!form[key])} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: space(2) }}>
          <Ionicons name={form[key] ? 'checkbox' : 'square-outline'} size={22} color={colors.accent} />
          <Text style={{ color: colors.ink, fontWeight: '600' }}>{label}</Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: form.whatsappNotifications }}
        disabled={!!shop && form.phone !== shop.phone}
        onPress={() => set('whatsappNotifications')(!form.whatsappNotifications)}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 9,
          marginBottom: space(3),
          opacity: shop && form.phone !== shop.phone ? 0.55 : 1,
        }}
      >
        <Ionicons
          name={form.whatsappNotifications ? 'checkbox' : 'square-outline'}
          size={22}
          color={colors.accent}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontWeight: '600' }}>WhatsApp new-enquiry notifications</Text>
          <Muted>
            Let RoomFit send service notifications to this shop phone when shoppers enquire. You can turn this off any time.
            {shop && form.phone !== shop.phone ? ' Save the changed phone number first, then enable notifications for that number.' : ''}
          </Muted>
        </View>
      </Pressable>

      {[['logo', 'Logo'], ['coverImage', 'Cover photo']].map(([k, label]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: space(3) }}>
          {form[k] ? (
            <Image source={{ uri: assetUrl(form[k]) }} style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: '#fff' }} />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.accentSoft }} />
          )}
          <Button small variant="outline" icon="image-outline" title={form[k] ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
            loading={busy === k} onPress={() => pick(k)} />
        </View>
      ))}

      <ErrorBox error={error} />
      <Button title={shop ? 'Save shop' : 'Create shop'} onPress={save} loading={busy === 'save'} style={{ marginTop: space(2) }} />
    </Screen>
  );
}
