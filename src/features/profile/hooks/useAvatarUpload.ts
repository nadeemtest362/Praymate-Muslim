import { useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../hooks/useAuth';
import { queryKeys } from '../../../lib/queryClient';

interface UseAvatarUploadReturn {
  isUploading: boolean;
  uploadAvatar: () => Promise<void>;
  error: Error | null;
}

export function useAvatarUpload(): UseAvatarUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { user, refreshSession } = useAuth();
  const queryClient = useQueryClient();

  const uploadAvatar = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      
      // Check permissions first, then request if needed
      const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      let permissionResult = currentPermission;
      
      if (!currentPermission.granted) {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            'Photo Access Required',
            'To update your profile picture, we need access to your photos. Please enable photo access in your device settings.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );
          return;
        }
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0].uri) {
        const localUri = result.assets[0].uri;
        
        setIsUploading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // Prepare file for upload with nested structure
        const fileExt = localUri.split('.').pop();
        const fileName = `avatar-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/avatar/${fileName}`;

        // Fetch the image as array buffer
        const response = await fetch(localUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch local image: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const determinedContentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('user-images')
          .upload(filePath, arrayBuffer, {
            contentType: determinedContentType,
            upsert: true,
          });

        if (uploadError) throw uploadError;
        
        // Store the storage path instead of full URL (for consistency with other images)
        const storagePath = filePath;

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: storagePath })
          .eq('id', user.id);

        if (updateError) {
          // Handle authentication errors
          if (updateError.message?.includes('row-level security') || updateError.message?.includes('Unauthorized')) {
            try {
              await refreshSession();
              
              // Retry after refresh
              const { error: retryError } = await supabase
                .from('profiles')
                .update({ avatar_url: storagePath })
                .eq('id', user.id);
              
              if (retryError) {
                throw retryError;
              }
            } catch {
              throw new Error('Session refresh failed. Please sign out and back in.');
            }
          } else {
            throw updateError;
          }
        }

        // Invalidate profile cache to trigger refresh with new avatar
        await queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Looking good!', 'Your profile picture has been updated.');
      }
    } catch (err) {
      console.error('Error picking/uploading image:', err);
      setError(err as Error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Failed to update avatar: ${(err as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  }, [user?.id, refreshSession, queryClient]);

  return {
    isUploading,
    uploadAvatar,
    error,
  };
} 