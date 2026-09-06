import { useColorScheme } from 'react-native';
import { dark, light } from './tokens';
import { usePreferencesStore } from '@/store/preferences';
export function useTheme(){
  const system=useColorScheme(); const mode=usePreferencesStore(s=>s.theme);
  const active=mode==='system' ? system : mode;
  return active==='dark' ? dark : light;
}
