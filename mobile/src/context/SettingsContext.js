import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [ready, setReady] = useState(false);
  const version = useRef(0);
  const applySettings = useCallback((next) => {
    version.current += 1; // An older public read must not overwrite an admin's save.
    setSettings((previous) => previous?.privateViewingEnabled === next.privateViewingEnabled ? previous : next);
  }, []);
  const reload = useCallback(async () => {
    const requestVersion = ++version.current;
    try {
      const response = await api.settings();
      if (requestVersion === version.current) {
        setSettings((previous) => previous?.privateViewingEnabled === response.settings.privateViewingEnabled ? previous : response.settings);
      }
    } catch {
      // Keep the last known flag during outages; never unlock an unknown/disabled route.
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => { Promise.resolve().then(reload); }, [reload]);
  const value = useMemo(() => ({
    privateViewingEnabled: settings?.privateViewingEnabled === true,
    ready, reload, applySettings,
  }), [settings, ready, reload, applySettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
