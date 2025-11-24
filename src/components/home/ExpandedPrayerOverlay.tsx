import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

import Animated, { FadeIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Prayer } from '../../models/prayer';
import useResponsive from '../../hooks/useResponsive';

interface ExpandedPrayerOverlayProps {
  prayerType: 'morning' | 'evening' | null;
  morningPrayer?: Prayer | null;
  eveningPrayer?: Prayer | null;
  isLoadingPrayers: boolean;
  onClose: () => void;
  onCompletePrayer: (prayerId: string | undefined) => void;
  onLike?: (prayerId: string) => void;
  onRequestNewVersion?: (prayerId: string) => void;
  onShare?: (prayerId: string) => void;
}

const ExpandedPrayerOverlay: React.FC<ExpandedPrayerOverlayProps> = ({
  prayerType,
  morningPrayer,
  eveningPrayer,
  isLoadingPrayers,
  onClose,
  onCompletePrayer,
  onLike,
  onRequestNewVersion,
  onShare,
}) => {
  const R = useResponsive();
  
  const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: R.w(4),
      paddingTop: R.h(2.5),
      paddingBottom: R.h(2),
    },
    closeButton: {
      padding: R.w(2),
    },
    shareButton: {
      padding: R.w(2),
    },
    title: {
      color: '#FFFFFF',
      fontSize: R.font(18),
      fontWeight: '700',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: R.w(4),
      paddingTop: R.h(1.25),
    },
    prayerText: {
      color: '#FFFFFF',
      fontSize: R.font(20),
      lineHeight: R.font(32),
      fontWeight: '500',
      marginBottom: R.h(3),
    },
    verseContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: R.w(4),
      borderRadius: R.w(4),
      alignSelf: 'flex-start',
      marginBottom: R.h(3.75),
    },
    verseText: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: R.font(16),
      fontStyle: 'italic',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: R.w(4),
    },
    actionButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: R.h(1.5),
      paddingHorizontal: R.w(5),
      borderRadius: R.w(7.5),
      minWidth: R.w(30),
      justifyContent: 'center',
    },
    actionButtonActive: {
      backgroundColor: 'rgba(255, 107, 139, 0.2)',
    },
    actionButtonText: {
      color: '#FFFFFF',
      marginLeft: R.w(2),
      fontWeight: '600',
    },
    actionButtonTextActive: {
      color: '#FF6B8B',
    },
    amenButton: {
      backgroundColor: 'rgba(139, 237, 79, 0.2)',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: R.h(1.5),
      paddingHorizontal: R.w(5),
      borderRadius: R.w(7.5),
      minWidth: R.w(30),
      justifyContent: 'center',
    },
    amenButtonCompleted: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      opacity: 0.7,
    },
    amenButtonText: {
      color: '#8bed4f',
      marginLeft: R.w(2),
      fontWeight: '700',
      fontSize: R.font(16),
    },
  });
  
  const styles = useMemo(() => createStyles(R), [R]);
  
  if (!prayerType) return null;
  
  const prayer = prayerType === 'morning' ? morningPrayer : eveningPrayer;
  const title = prayerType === 'morning' ? 'Morning Prayer' : 'Evening Prayer';
  
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };
  
  const handleLike = () => {
    if (prayer?.id && onLike) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLike(prayer.id);
    }
  };
  
  const handleNewVersion = () => {
    if (prayer?.id && onRequestNewVersion) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRequestNewVersion(prayer.id);
    }
  };
  
  const handleShare = () => {
    if (prayer?.id && onShare) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onShare(prayer.id);
    }
  };
  
  const handleCompletePrayer = () => {
    onCompletePrayer(prayer?.id);
  };
  
  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      style={[
        styles.overlay, 
        { paddingTop: R.insets.top, paddingBottom: R.insets.bottom }
      ]}
    >
      <BlurView intensity={90} style={StyleSheet.absoluteFillObject} tint="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.title}>{title}</Text>
        
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.prayerText}>
          {prayer?.content || (isLoadingPrayers ? "Loading prayer..." : "Prayer not available.")}
        </Text>
        
        {prayer?.verse_ref && (
        <View style={styles.verseContainer}>
        <Text style={styles.verseText}>{prayer.verse_ref}</Text>
        </View>
        )}
        
        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, prayer?.liked && styles.actionButtonActive]} 
            onPress={handleLike}
          >
            <AntDesign 
              name={prayer?.liked ? "heart" : "hearto"} 
              size={22} 
              color={prayer?.liked ? "#FF6B8B" : "white"} 
            />
            <Text style={[styles.actionButtonText, prayer?.liked && styles.actionButtonTextActive]}>
              Love this
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleNewVersion}>
            <Feather name="refresh-cw" size={20} color="white" />
            <Text style={styles.actionButtonText}>New version</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.amenButton, prayer?.completed_at && styles.amenButtonCompleted]} 
            onPress={handleCompletePrayer}
            disabled={!!prayer?.completed_at}
            activeOpacity={0.7}
          >
            <Text style={styles.amenButtonText}>
              {prayer?.completed_at ? "Completed" : "Amen 🙏"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
};


export default ExpandedPrayerOverlay; 