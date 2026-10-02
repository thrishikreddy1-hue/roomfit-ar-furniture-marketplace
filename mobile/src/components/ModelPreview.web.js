import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { arPageUrl } from '../lib/ar';
import { API_URL } from '../lib/config';
import { colors, radius } from '../theme';

// Web build: react-native-webview isn't available, so embed the same viewer in an iframe.
export default function ModelPreview({ productId, height = 320, onModelSize }) {
  useEffect(() => {
    if (!onModelSize) return undefined;
    const origin = new URL(API_URL).origin;
    const onMessage = (e) => {
      if (e.origin !== origin) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'model-size') onModelSize(msg);
      } catch {
        // ignore unrelated messages
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onModelSize]);

  return (
    <View style={[
      styles.wrap,
      { height },
    ]}>
      <iframe
        title="3D model preview"
        src={arPageUrl(productId, { embed: true })}
        style={{ border: 0, width: '100%', height: '100%' }}
        allow="xr-spatial-tracking; fullscreen"
      />
      <View style={styles.hint} pointerEvents="none"><Text style={styles.hintText}>Interactive 3D · drag to explore</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  hint: { position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(27,25,22,0.78)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  hintText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
