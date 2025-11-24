import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../../shared/ui';

interface AvatarUploadProps {
  avatarUrl?: string | null;
  displayName: string;
  isUploading: boolean;
  onPress: () => void;
  size?: number;
}

export default function AvatarUpload({
  avatarUrl,
  displayName,
  isUploading,
  onPress,
  size = 72,
}: AvatarUploadProps) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={isUploading} 
      style={styles.avatarSection}
    >
      <View style={styles.avatarContainer}>
        <Avatar 
          size={size} 
          image_uri={avatarUrl} 
          name={displayName} 
        />
        <View style={[
          styles.editAvatarButton,
          { 
            width: size * 0.39, 
            height: size * 0.39,
            borderRadius: size * 0.195,
          }
        ]}>
          {isUploading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Feather name="edit-2" size={size * 0.194} color="white" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    marginRight: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#8B80F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#141941',
  },
}); 