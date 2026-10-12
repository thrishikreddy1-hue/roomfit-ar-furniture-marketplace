import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import ProductCard from '../components/ProductCard';
import { Button, Empty, ErrorBox, Loading, Screen } from '../components/ui';
import { space } from '../theme';

export default function Wishlist() {
  const state = useAsync(() => api.wishlist().then((result) => result.products), [], { refetchOnFocus: true });
  const [removing, setRemoving] = useState(null);
  const [removeError, setRemoveError] = useState(null);
  const remove = async (id) => {
    setRemoving(id);
    setRemoveError(null);
    try { await api.removeWishlist(id); await state.reload(); } catch (e) { setRemoveError(e); } finally { setRemoving(null); }
  };
  if (state.loading) return <Loading />;
  if (state.error) return <Screen><ErrorBox error={state.error} onRetry={state.reload} /></Screen>;
  return (
    <FlatList
      contentContainerStyle={{ padding: space(4), gap: 12, paddingBottom: space(10) }}
      data={state.data || []}
      refreshControl={<RefreshControl refreshing={false} onRefresh={state.reload} />}
      keyExtractor={(product) => product.id}
      ListHeaderComponent={<ErrorBox error={removeError} />}
      ListEmptyComponent={<Empty icon="heart-outline" title="Your saved edit is empty" body="Tap the heart on a product to keep it here." />}
      renderItem={({ item }) => <View><ProductCard product={item} /><Button small variant="outline" title="Remove from saved" disabled={!!removing} loading={removing === item.id} style={{ marginTop: 8 }} onPress={() => remove(item.id)} /></View>}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}
