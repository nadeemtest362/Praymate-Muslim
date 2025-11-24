import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import PrayerShareCard from './PrayerShareCard';
import { useAuth } from '../../hooks/useAuth';
import { trackEvent } from '../../lib/analytics';



interface PrayerPerson {
  id: string;
  name: string;
  image_uri?: string | null;
}

interface PrayerShareModalProps {
  visible: boolean;
  onClose: () => void;
  prayer: string;
  verse?: string;
  timeOfDay: 'morning' | 'evening';
  people?: PrayerPerson[];
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  action: () => void;
}

export default function PrayerShareModal({
  visible,
  onClose,
  prayer,
  verse,
  timeOfDay,
  people = [],
}: PrayerShareModalProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const { profile } = useAuth();

  const captureCard = async (): Promise<string | null> => {
    try {
      if (!viewShotRef.current) return null;
      // Don't show loading for capture - it's too fast and causes flash
      
      const uri = await (viewShotRef.current as any).capture({
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1920, // exact 9:16 for TikTok/Instagram stories/reels
      });
      
      return uri;
    } catch (error) {
      console.error('Error capturing card:', error);
      Alert.alert('Error', 'Failed to capture prayer card');
      return null;
    }
  };





  const shareImage = async (platform: string) => {
    // Track selection and attempt; never throw
    try {
      trackEvent('share_platform_selected', { platform });
    } catch {}

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      trackEvent('share_attempt', { platform });
    } catch {}

    const uri = await captureCard();
    if (!uri) {
      try {
        trackEvent('share_failed', { platform, error_message: 'capture_failed' });
      } catch {}
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        try {
          trackEvent('share_failed', { platform, error_message: 'sharing_unavailable' });
        } catch {}
        Alert.alert('Sharing not available', 'Please try saving to gallery instead');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your prayer',
      });
      try {
        trackEvent('share_success', { platform });
      } catch {}
    } catch (error) {
      console.error('Error sharing:', error);
      try {
        trackEvent('share_failed', { platform, error_message: error instanceof Error ? error.message : String(error) });
      } catch {}
      Alert.alert('Error', 'Failed to share prayer card');
    }
  };



  const socialPlatforms: SocialPlatform[] = [
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: 'logo-tiktok',
      color: '#000000',
      action: () => shareImage('tiktok'),
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'logo-instagram',
      color: '#E4405F',
      action: () => shareImage('instagram'),
    },
    {
      id: 'share',
      name: 'Others',
      icon: 'apps-outline',
      color: '#007AFF',
      action: () => shareImage('others'),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.container}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          entering={FadeInUp.duration(300)}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Your Prayer</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Card Preview */}
          <ScrollView 
            style={styles.previewContainer}
            contentContainerStyle={styles.previewContent}
            showsVerticalScrollIndicator={false}
          >
            <ViewShot 
              ref={viewShotRef}
              options={{ format: 'png', quality: 1 }}
              style={styles.cardWrapper}
            >
                             <PrayerShareCard
                             prayer={prayer}
                             verse={verse}
                             timeOfDay={timeOfDay}
                             userName={profile?.display_name || undefined}
                               people={people}
              />
            </ViewShot>
          </ScrollView>

          {/* Social Platform Buttons */}
          <Animated.View 
            entering={FadeInDown.duration(300).delay(100)}
            style={styles.platformsContainer}
          >
            <Text style={styles.platformsTitle}>Quick share to</Text>
            <View style={styles.platformButtons}>
              {socialPlatforms.map((platform) => (
                <TouchableOpacity
                  key={platform.id}
                  style={styles.platformButton}
                  onPress={platform.action}
                >
                  <LinearGradient
                    colors={
                      platform.id === 'tiktok' 
                        ? ['#FF0050', '#00F2EA']
                        : [platform.color, platform.color]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.platformIconContainer}
                  >
                    <Ionicons 
                      name={platform.icon as any} 
                      size={28} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                  <Text style={styles.platformName}>{platform.name}</Text>
                </TouchableOpacity>
              ))}
            </View>


          </Animated.View>


        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '94%',
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  previewContainer: {
    maxHeight: 700,
  },
  previewContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  platformsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  platformsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  platformButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  platformButton: {
    alignItems: 'center',
    gap: 8,
  },
  platformIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  platformName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },


}); 