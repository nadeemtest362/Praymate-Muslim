import { requireNativeModule } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ExpoFamilyControlsModule.web.ts
// and on native platforms to the native module.
export default requireNativeModule('ExpoFamilyControls'); 