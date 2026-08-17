import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const PerformanceContext = createContext(null);

const HARDWARE_KEY = 'novin_hardware';
const GLASS_KEY = 'novin_liquid_glass';

function readHardware() {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(HARDWARE_KEY);
  return v === 'strong' || v === 'weak' ? v : null;
}

function readGlassEnabled() {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(GLASS_KEY);
  // Liquid refraction retired — keep stored preference only if explicitly '1'
  // but default off for a clean matte UI.
  if (raw === '1') return false;
  return false;
}

export function PerformanceProvider({ children }) {
  const [hardware, setHardwareState] = useState(readHardware);
  const [liquidGlassEnabled, setLiquidGlassEnabledState] = useState(() =>
    readGlassEnabled()
  );
  // Ask again on every login / session entry — not only the first visit
  const [forceHardwarePrompt, setForceHardwarePrompt] = useState(false);

  const needsHardwarePrompt = forceHardwarePrompt;

  const requestHardwarePrompt = useCallback(() => {
    setForceHardwarePrompt(true);
  }, []);

  const setHardware = useCallback((tier) => {
    const next = tier === 'weak' ? 'weak' : 'strong';
    localStorage.setItem(HARDWARE_KEY, next);
    setHardwareState(next);

    const enableGlass = false;
    localStorage.setItem(GLASS_KEY, '0');
    setLiquidGlassEnabledState(enableGlass);
    setForceHardwarePrompt(false);
  }, []);

  const setLiquidGlassEnabled = useCallback((enabled) => {
    const on = Boolean(enabled);
    localStorage.setItem(GLASS_KEY, on ? '1' : '0');
    setLiquidGlassEnabledState(on);
  }, []);

  const toggleLiquidGlass = useCallback(() => {
    setLiquidGlassEnabledState((prev) => {
      const next = !prev;
      localStorage.setItem(GLASS_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      hardware,
      needsHardwarePrompt,
      requestHardwarePrompt,
      setHardware,
      liquidGlassEnabled,
      setLiquidGlassEnabled,
      toggleLiquidGlass,
    }),
    [
      hardware,
      needsHardwarePrompt,
      requestHardwarePrompt,
      setHardware,
      liquidGlassEnabled,
      setLiquidGlassEnabled,
      toggleLiquidGlass,
    ]
  );

  return (
    <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within PerformanceProvider');
  }
  return context;
}
