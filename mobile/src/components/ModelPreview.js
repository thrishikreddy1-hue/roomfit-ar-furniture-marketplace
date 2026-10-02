import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { arPageUrl } from '../lib/ar';
import { colors, radius } from '../theme';

// Interactive 3D preview (rotate / zoom). AR placement itself is launched via openInRoom().
export default function ModelPreview({ productId, height = 320, onModelSize }) {
  const [loading, setLoading] = useState(true);
  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        source={{ uri: arPageUrl(productId, { embed: true }) }}
        style={{ backgroundColor: 'transparent' }}
        originWhitelist={['*']}
        onLoadEnd={() => setLoading(false)}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'model-size') onModelSize?.(msg);
          } catch {
            // ignore unrelated messages
          }
        }}
        scrollEnabled={false}
        nestedScrollEnabled
        allowsInlineMediaPlayback
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
      {!loading && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>Interactive 3D · drag to explore</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(27,25,22,0.78)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  hintText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
