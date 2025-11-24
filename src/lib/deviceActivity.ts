import { NativeModules, Platform } from 'react-native';

type DeviceActivityModule = typeof import('react-native-device-activity');

let cachedModule: DeviceActivityModule | null = null;

export const getDeviceActivityModule = (): DeviceActivityModule | null => {
  if (cachedModule) {
    return cachedModule;
  }

  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const mod = require('react-native-device-activity');
    const resolvedModule: DeviceActivityModule | null = mod?.default ?? mod ?? null;

    if (!resolvedModule) {
      console.warn('[DeviceActivity] Module require returned null/undefined.');
      return null;
    }

    cachedModule = resolvedModule;
    return cachedModule;
  } catch (error) {
    console.warn('[DeviceActivity] Unable to load module:', error);
    return null;
  }
};

export const isDeviceActivityAvailable = (): boolean => {
  const module = getDeviceActivityModule();
  if (!module) {
    return false;
  }

  try {
    if (typeof module.isAvailable === 'function') {
      return module.isAvailable();
    }

    if (Platform.OS !== 'ios') {
      return false;
    }

    const nativeModule = (NativeModules as any)?.ReactNativeDeviceActivity;
    return !!nativeModule;
  } catch (error) {
    console.warn('[DeviceActivity] Error checking availability:', error);
    return false;
  }
};
