import { FlatList, View } from 'react-native';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import ProductCard from '../components/ProductCard';
import { Empty, ErrorBox, Loading, Screen } from '../components/ui';
import { space } from '../theme';

export default function Wishlist() {
  const state = useAsync(() => api.wishlist().then((result) => result.products));
  if (state.loading) return <Loading />;
  if (state.error) return <Screen><ErrorBox error={state.error} onRetry={state.reload} /></Screen>;
  return (
    <FlatList
      contentContainerStyle={{ padding: space(4), gap: 12, paddingBottom: space(10) }}
      data={state.data || []}
      keyExtractor={(product) => product.id}
      ListEmptyComponent={<Empty icon="heart-outline" title="Your saved edit is empty" body="Tap the heart on a product to keep it here." />}
      renderItem={({ item }) => <ProductCard product={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}
