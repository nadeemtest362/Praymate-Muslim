// Reexport the native module. On web, it will be resolved to ExpoFamilyControlsModule.web.ts
// and on native platforms to ExpoFamilyControlsModule.ts
export { default } from './src/ExpoFamilyControlsModule';
export * from './src/ExpoFamilyControls.types';
export * from './src/ExpoFamilyControls';
