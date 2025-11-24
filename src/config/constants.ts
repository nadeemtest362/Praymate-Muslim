// App configuration constants
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kfrvxoxdehduqrpcbibl.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcnZ4b3hkZWhkdXFycGNiaWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjY0OTgsImV4cCI6MjA0OTY0MjQ5OH0.8G_zF_KzqrGScwZexygZiYZprVWePIvq3M8v3qhiuoM';

// Subscription product IDs
// NOTE: These should match the product IDs in App Store Connect and RevenueCat
export const SUBSCRIPTION_PRODUCTS = {
  WEEKLY: 'YOUR_NEW_PRODUCT_ID_HERE', // Update with actual product ID from App Store Connect
  ANNUAL: '1000', // Update if you have an annual subscription
} as const;