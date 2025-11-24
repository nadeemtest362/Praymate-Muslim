const prefetchedImageUrls = new Set<string>();

export const registerPrefetchedImageUrl = (url?: string | null) => {
  if (!url || typeof url !== 'string') return;
  prefetchedImageUrls.add(url);
};

export const isImageUrlPrefetched = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  return prefetchedImageUrls.has(url);
};

export const resetPrefetchedImageRegistry = () => {
  prefetchedImageUrls.clear();
};
