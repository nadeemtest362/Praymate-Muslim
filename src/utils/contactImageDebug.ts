import * as FileSystem from 'expo-file-system';

/**
 * Debug utility to test contact image URI accessibility
 */
export async function debugContactImageUri(uri: string, contactName: string): Promise<void> {
  console.log(`[ContactImageDebug] Testing URI for ${contactName}: ${uri}`);
  
  try {
    // Test 1: Check if URI is accessible via fetch
    console.log(`[ContactImageDebug] Testing fetch...`);
    const fetchResponse = await fetch(uri);
    console.log(`[ContactImageDebug] Fetch response: ${fetchResponse.status} ${fetchResponse.statusText}`);
    
    if (fetchResponse.ok) {
      const blob = await fetchResponse.blob();
      console.log(`[ContactImageDebug] Fetch successful, blob size: ${blob.size} bytes`);
    }
  } catch (fetchError) {
    console.log(`[ContactImageDebug] Fetch failed:`, fetchError);
  }
  
  try {
    // Test 2: Check if URI is accessible via FileSystem
    console.log(`[ContactImageDebug] Testing FileSystem.getInfoAsync...`);
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log(`[ContactImageDebug] FileSystem info:`, fileInfo);
    
    if (fileInfo.exists) {
      console.log(`[ContactImageDebug] File exists, size: ${fileInfo.size} bytes`);
    }
  } catch (fileError) {
    console.log(`[ContactImageDebug] FileSystem failed:`, fileError);
  }
  
  try {
    // Test 3: Check if it's a valid URL
    const url = new URL(uri);
    console.log(`[ContactImageDebug] Valid URL - protocol: ${url.protocol}, host: ${url.host}`);
  } catch (urlError) {
    console.log(`[ContactImageDebug] Not a valid URL:`, urlError);
  }
} 