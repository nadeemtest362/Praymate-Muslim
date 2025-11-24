import React from 'react';
import { View, Text, StyleSheet, ImageErrorEventData, NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { getPublicImageUrl } from '../../../utils/imageStorage';
import { isImageUrlPrefetched, registerPrefetchedImageUrl } from '../../../utils/imagePrefetchRegistry';

interface AvatarProps {
  uri?: string | null;
  image_uri?: string | null;  // Accept database field name too
  name: string;
  size?: number;
  borderWidth?: number;
  borderColor?: string;
  onError?: (event: NativeSyntheticEvent<ImageErrorEventData>) => void;
  showInitialsPlaceholder?: boolean; // When false, don't render initials/gradient under image
}

type GradientColors = [string, string];

/**
 * Clean a name by removing parenthetical content
 * "Alice (work)" -> "Alice"
 * "Mom (cell)" -> "Mom"
 */
const cleanName = (name: string): string => {
  if (!name || typeof name !== 'string') return name;
  
  // Remove content in parentheses and trim whitespace
  return name.replace(/\s*\([^)]*\)/g, '').trim();
};

/**
 * Avatar component that displays either an image or initials
 */
const Avatar = React.memo(function Avatar({
  uri,
  image_uri,
  name,
  size = 40,
  borderWidth = 0,
  borderColor = 'rgba(255, 255, 255, 0.3)',
  onError,
  showInitialsPlaceholder = true,
}: AvatarProps) {
  // Use image_uri if provided, otherwise fall back to uri
  const rawImageSource = image_uri || uri;
  
  // Convert storage paths to public URLs immediately
  const resolvedUrl = React.useMemo(() => {
    return getPublicImageUrl(rawImageSource || null);
  }, [rawImageSource]);

  // Add state to track image loading errors and loading state
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(() => isImageUrlPrefetched(resolvedUrl));
  
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(isImageUrlPrefetched(resolvedUrl));
  }, [resolvedUrl]);
  
  // Clean the name before processing
  const cleanedName = cleanName(name);
  
  // Generate a consistent color based on the cleaned name
  const getGradientColors = (name: string): GradientColors => {
    // Handle empty or invalid name gracefully
    const charCode = name?.charCodeAt(0) || 0; // Use 0 for null/empty name
    const colorSets: GradientColors[] = [
      ['#5856D6', '#7C7AEA'], // Soft purple (matches app gradient)
      ['#8B80F9', '#B4A7FC'], // Light purple
      ['#2E7DAF', '#4D6AE3'], // Blue (matches morning prayer)
      ['#1A237E', '#311B92'], // Deep blue (matches evening prayer)
      ['#6C63FF', '#9370DB'], // Medium purple
      ['#3b2f7f', '#5c4db1'], // Dark purple (from app gradient)
    ];
    
    return colorSets[charCode % colorSets.length];
  };

  // Get initials from cleaned name
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '?'; // Added type check and check for empty/null
    
    const trimmedName = name.trim();
    if (!trimmedName) return '?'; // Handle empty string after trimming
    
    const words = trimmedName.split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  };

  // Check if we should show the image (has valid URI and no error)
  const hasValidImage = resolvedUrl && resolvedUrl.trim().length > 0 && !imageError;
  const gradientColors = getGradientColors(cleanedName);
  const initials = getInitials(cleanedName);
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: borderWidth,
    borderColor: borderColor,
  };

  // Handle image error and normalize event shape for external onError callback
  const handleImageError = () => {
    setImageError(true);
    if (onError) {
      const syntheticEvent = { nativeEvent: { error: 'Image load error' } } as unknown as NativeSyntheticEvent<ImageErrorEventData>;
      onError(syntheticEvent);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {showInitialsPlaceholder && (!hasValidImage || !imageLoaded) && (
        <LinearGradient
          colors={gradientColors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.initials, { fontSize: size / 2.5 }]}>
            {initials}
          </Text>
        </LinearGradient>
      )}

      {hasValidImage && (
        <Image
          source={{ uri: resolvedUrl }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
          recyclingKey={resolvedUrl || undefined}
          onError={handleImageError}
          onLoad={() => {
            setImageLoaded(true);
            registerPrefetchedImageUrl(resolvedUrl);
          }}
        />
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the essential props actually changed
  return prevProps.image_uri === nextProps.image_uri &&
         prevProps.uri === nextProps.uri &&
         prevProps.name === nextProps.name &&
         prevProps.size === nextProps.size &&
         prevProps.borderWidth === nextProps.borderWidth &&
         prevProps.borderColor === nextProps.borderColor;
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false, // Android-specific to remove extra padding
  },
});

export default Avatar; 
