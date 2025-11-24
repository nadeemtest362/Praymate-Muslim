// Simple test auth hook to verify module loading
export const useTestAuth = () => {
  console.log('[useTestAuth] Simple test hook working');
  return {
    test: true,
    message: 'Test auth hook loaded successfully'
  };
};
