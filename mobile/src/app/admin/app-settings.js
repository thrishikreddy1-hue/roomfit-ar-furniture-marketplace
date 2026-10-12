import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { useSettings } from '../../context/SettingsContext';
import { Button, Card, ErrorBox, H2, Loading, Muted, Screen } from '../../components/ui';
import { colors, space } from '../../theme';

export default function AppSettings() {
  const { data, loading, error, reload } = useAsync(() => api.adminSettings());
  if (loading) return <Loading />;
  if (!data) return <Screen><ErrorBox error={error} onRetry={reload} /></Screen>;
  return <SettingsForm initialSettings={data.settings} />;
}

function SettingsForm({ initialSettings }) {
  const { applySettings } = useSettings();
  const [enabled, setEnabled] = useState(initialSettings.privateViewingEnabled);
  const [savedValue, setSavedValue] = useState(initialSettings.privateViewingEnabled);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [message, setMessage] = useState('');

  async function save() {
    setSaving(true);
    setSaveError(null);
    setMessage('');
    try {
      const response = await api.saveAdminSettings({ privateViewingEnabled: enabled });
      applySettings(response.settings);
      setSavedValue(response.settings.privateViewingEnabled);
      setMessage(`Saved. Private viewing is ${response.settings.privateViewingEnabled ? 'shown' : 'hidden'} for all buyers.`);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <H2>Buyer experience</H2>
      <Muted style={{ marginTop: space(1), marginBottom: space(4) }}>Control which options buyers see across RoomFit.</Muted>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <H2 style={{ fontSize: 17 }}>Private viewing</H2>
            <Muted style={{ marginTop: 4 }}>{enabled ? 'Shown in the buyer navigation' : 'Hidden from the buyer navigation'}</Muted>
          </View>
          <Switch accessibilityLabel="Show Private viewing" value={enabled} disabled={saving}
            trackColor={{ false: colors.border, true: colors.accent }}
            onValueChange={(next) => { setEnabled(next); setMessage(''); }} />
        </View>
        <Muted style={{ marginTop: space(3) }}>Off hides the tab and its page for buyers and guests. Discover and product AR previews stay available. Nothing is deleted; you can turn it back on anytime.</Muted>
        <ErrorBox error={saveError} />
        <Button title="Save changes" icon="checkmark-outline" loading={saving} disabled={enabled === savedValue}
          style={{ marginTop: space(4) }} onPress={save} />
        {!!message && <Text accessibilityRole="alert" style={styles.success}>{message}</Text>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  success: { color: colors.success, marginTop: space(3) },
});
