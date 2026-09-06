import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface NetworkStatus {
  online: boolean;
  /** Metered connection: avoid large uploads / video processing. */
  expensive: boolean;
  type: string;
}

/** Live connectivity, used by OfflineBanner and upload gating. */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({ online: true, expensive: false, type: 'unknown' });

  useEffect(() => {
    let active = true;

    const apply = (online: boolean, expensive: boolean, type: string) => {
      if (active) setStatus({ online, expensive, type });
    };

    void NetInfo.fetch().then((s) =>
      apply(s.isConnected !== false, s.details !== null && typeof s.details === 'object' && 'isConnectionExpensive' in s.details
        ? s.details.isConnectionExpensive === true
        : false, s.type),
    );

    const unsubscribe = NetInfo.addEventListener((s) =>
      apply(s.isConnected !== false, s.details !== null && typeof s.details === 'object' && 'isConnectionExpensive' in s.details
        ? s.details.isConnectionExpensive === true
        : false, s.type),
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return status;
}
