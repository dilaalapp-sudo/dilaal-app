import Constants from 'expo-constants';
import { CallClient as FallbackCallClient } from './callsFallback';

export type { CallKind, CallStatus, CallViewState } from './callsFallback';

type CallsModule = {
  CallClient: typeof FallbackCallClient;
};

function loadCalls(): CallsModule {
  // Expo Go has no WebRTC native module. Use the same stub as web preview.
  if (Constants.appOwnership === 'expo') {
    return { CallClient: FallbackCallClient };
  }
  try {
    return require('./callsNative') as CallsModule;
  } catch {
    return { CallClient: FallbackCallClient };
  }
}

const impl = loadCalls();
export const CallClient = impl.CallClient;
