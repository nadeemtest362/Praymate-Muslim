import { uploadLocalImageToSupabase, ensureImageUploaded, isLocalFileUri } from '../src/utils/imageUploadUtils';

// Test cases for the image upload utilities
const testCases = [
  { 
    name: 'Local file URI (iOS)', 
    uri: 'file:///var/mobile/Containers/Data/Application/test.png' 
  },
  { 
    name: 'Local file URI (Android)', 
    uri: 'file:///data/user/0/com.example/cache/test.jpg' 
  },
  { 
    name: 'iOS local path', 
    uri: '/var/mobile/Containers/Data/Application/test.png' 
  },
  { 
    name: 'Already uploaded (Supabase)', 
    uri: 'https://kfrvxoxdehduqrpcbibl.supabase.co/storage/v1/object/public/avatars/contact-123.png' 
  },
  { 
    name: 'Already uploaded (other CDN)', 
    uri: 'https://example.com/avatar.jpg' 
  },
  { 
    name: 'Empty URI', 
    uri: '' 
  },
  { 
    name: 'Null URI', 
    uri: null 
  },
];

console.log('Testing image upload utilities...\n');

// Test isLocalFileUri
console.log('=== Testing isLocalFileUri ===');
testCases.forEach(test => {
  const result = isLocalFileUri(test.uri);
  console.log(`${test.name}: ${result ? '✓ Local' : '✗ Not local'}`);
});

console.log('\n=== Testing ensureImageUploaded (dry run) ===');
testCases.forEach(async test => {
  // This is a dry run - we're not actually uploading
  console.log(`\n${test.name}:`);
  console.log(`  Input: ${test.uri}`);
  
  if (!test.uri) {
    console.log('  → Would return: null');
  } else if (test.uri.startsWith('http://') || test.uri.startsWith('https://')) {
    console.log('  → Would return: Same URL (already uploaded)');
  } else if (isLocalFileUri(test.uri)) {
    console.log('  → Would upload to Supabase and return public URL');
  } else {
    console.log('  → Would return: null (unknown format)');
  }
});

console.log('\n✅ Test script completed');
console.log('\nTo fix existing records, run:');
console.log('npx supabase functions invoke fix-contact-images'); 