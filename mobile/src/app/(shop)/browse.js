import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { useLiveRefresh } from '../../lib/live';
import ProductCard from '../../components/ProductCard';
import { Button, Chip, Empty, ErrorBox, Field, Loading, Muted } from '../../components/ui';
import { colors, radius, space } from '../../theme';

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'name', label: 'A–Z' },
];

export default function Browse() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState(params.category || '');
  const [sort, setSort] = useState('newest');
  const [arOnly, setArOnly] = useState(params.arOnly === '1');
  const [showFit, setShowFit] = useState(params.fitMode === '1' || params.arOnly === '1');
  const [fit, setFit] = useState({ maxWidth: '', maxDepth: '', maxHeight: '' });

  // Deep links from Home (category chip / AR banner) update the filters while this tab stays mounted.
  const [linked, setLinked] = useState({ category: params.category, arOnly: params.arOnly });
  if (params.category !== linked.category || params.arOnly !== linked.arOnly || params.fitMode !== linked.fitMode) {
    setLinked({ category: params.category, arOnly: params.arOnly, fitMode: params.fitMode });
    if (params.category) setCategory(params.category);
    if (params.arOnly) setArOnly(params.arOnly === '1');
    if (params.fitMode === '1' || params.arOnly === '1') setShowFit(true);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const categories = useAsync(() => api.categories().then((r) => r.categories));
  const results = useAsync(
    () => api.products({ q: debouncedQ, category, sort, arOnly: arOnly ? 'true' : '', ...fit }).then((r) => r.products),
    [debouncedQ, category, sort, arOnly, fit.maxWidth, fit.maxDepth, fit.maxHeight],
  );
  useLiveRefresh(results.reload, (e) => e.type.startsWith('product.') || e.type.startsWith('shop.'));

  const columns = width > 700 ? 3 : 2;
  const gap = 12;
  const cardW = (width - space(4) * 2 - gap * (columns - 1)) / columns;
  const fitActive = Object.values(fit).some(Boolean);
  const numeric = (k) => (v) => setFit((f) => ({ ...f, [k]: v.replace(/[^0-9]/g, '') }));

  const header = (
    <View style={{ marginBottom: space(3) }}>
      <View style={styles.intro}>
        <Text style={styles.kicker}>THE ROOMFIT EDIT</Text>
        <Text style={styles.title}>Find a piece that feels right at home.</Text>
        <Text style={styles.subtitle}>Explore local furniture, view selected pieces in 3D, and check the fit before you enquire.</Text>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search sofas, velvet, walnut…"
          placeholderTextColor="#a89c90"
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {!!q && (
          <Pressable onPress={() => setQ('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space(3) }}>
        <Chip label="All" active={!category} onPress={() => setCategory('')} />
        {(categories.data || []).map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(category === c ? '' : c)} />
        ))}
      </ScrollView>

      <View style={styles.row}>
        <Chip label="AR ready" icon="cube-outline" active={arOnly} onPress={() => setArOnly(!arOnly)} />
        <Chip label={fitActive ? 'Fits my space ✓' : 'Fits my space'} icon="resize-outline" active={fitActive || showFit} onPress={() => setShowFit(!showFit)} />
        {SORTS.map((s) => <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />)}
      </View>

      {showFit && (
        <View style={styles.fitBox}>
          <Muted style={{ marginBottom: 8 }}>Only show pieces no bigger than your space (cm):</Muted>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field style={{ flex: 1 }} label="Max width" keyboardType="number-pad" value={fit.maxWidth} onChangeText={numeric('maxWidth')} />
            <Field style={{ flex: 1 }} label="Max depth" keyboardType="number-pad" value={fit.maxDepth} onChangeText={numeric('maxDepth')} />
            <Field style={{ flex: 1 }} label="Max height" keyboardType="number-pad" value={fit.maxHeight} onChangeText={numeric('maxHeight')} />
          </View>
          {fitActive && <Button small variant="outline" title="Clear size filter" onPress={() => setFit({ maxWidth: '', maxDepth: '', maxHeight: '' })} />}
        </View>
      )}

      <ErrorBox error={results.error} onRetry={results.reload} />
      {results.data && <Muted style={styles.resultCount}>{results.data.length} {results.data.length === 1 ? 'piece' : 'pieces'} in this edit</Muted>}
    </View>
  );

  return (
    <FlatList
      key={columns}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}
      data={results.data || []}
      numColumns={columns}
      columnWrapperStyle={{ gap }}
      ItemSeparatorComponent={() => <View style={{ height: gap }} />}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        results.loading ? <Loading /> : <Empty icon="search-outline" title="Nothing matches" body="Try another search, category or a larger space." />
      }
      renderItem={({ item }) => <ProductCard product={item} width={cardW} />}
    />
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: space(4) },
  kicker: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.7, lineHeight: 31 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 390 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16 },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  fitBox: { backgroundColor: colors.accentMossSoft, borderRadius: radius.md, borderWidth: 1, borderColor: '#B9CDB4', padding: space(3), marginBottom: space(2) },
  resultCount: { marginTop: 6, fontSize: 12, color: colors.accentForest, fontWeight: '700' },
});
