import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../../shared/ui';
import { PRAYER_TOPICS } from '../../constants/prayerConstants';
import { PrayerIntention } from './types';
import useResponsive from '../../hooks/useResponsive';
import { useAuth } from '../../hooks/useAuth';

interface IntentionDetailsModalProps {
  visible: boolean;
  intention: PrayerIntention | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const IntentionDetailsModal: React.FC<IntentionDetailsModalProps> = ({
  visible,
  intention,
  onClose,
  onEdit,
  onDelete,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const { profile } = useAuth();

  if (!intention) return null;

  const categoryInfo = (PRAYER_TOPICS as any)[intention.category];
  const emoji = categoryInfo?.emoji || '🙏';
  const categoryLabel = categoryInfo?.label || intention.category;
  const personName = intention.person?.name || 'You';
  // Only use profile avatar for self-intentions, not for other people without avatars
  const personImage = intention.person 
    ? intention.person.image_uri || undefined 
    : profile?.avatar_url || undefined;
  const relationship = intention.person?.relationship || null;

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={handleClose}
          activeOpacity={1}
        />
        
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1f4d', '#2d2060', '#4a2566']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={R.font(24)} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>

                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.content}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Header with Avatar and Intention Info */}
                  <View style={styles.headerSection}>
                    <Avatar
                      size={R.w(18)}
                      image_uri={personImage}
                      name={personName}
                    />
                    <View style={styles.headerInfo}>
                      {/* Person Name and Relationship */}
                      <View style={styles.personRow}>
                        <Text style={styles.personName}>{personName}</Text>
                        {relationship && (
                          <Text style={styles.relationship}> • {relationship}</Text>
                        )}
                      </View>
                      
                      {/* Category */}
                      <View style={styles.categoryRow}>
                        <Text style={styles.categoryEmoji}>{emoji}</Text>
                        <Text style={styles.categoryLabel}>{categoryLabel}</Text>
                      </View>
                      
                      {/* Intention Details */}
                      <Text style={styles.intentionDetails}>
                        {intention.details || 'No details provided'}
                      </Text>
                      
                      {/* Status Indicator */}
                      <View style={styles.statusRow}>
                        <View style={[
                          styles.statusDot,
                          intention.is_active ? styles.statusActive : styles.statusInactive
                        ]} />
                        <Text style={styles.statusText}>
                          {intention.is_active ? 'Active in prayers' : 'Paused'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.divider} />

                  {/* Edit Button */}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEdit}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={R.font(20)} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Edit Intention</Text>
                  </TouchableOpacity>

                  {/* Delete Link */}
                  <TouchableOpacity
                    style={styles.deleteLink}
                    onPress={handleDelete}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.deleteLinkText}>Delete Intention</Text>
                  </TouchableOpacity>
                </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: R.w(5),
      paddingVertical: R.h(10),
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
      width: '100%',
      maxWidth: R.w(90),
      maxHeight: R.h(75),
      borderRadius: R.w(4),
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    gradient: {
      maxHeight: R.h(75),
    },
    scrollView: {
      maxHeight: R.h(75),
    },
    closeButton: {
      position: 'absolute',
      top: R.h(2),
      right: R.w(4),
      zIndex: 10,
      width: R.w(10),
      height: R.w(10),
      alignItems: 'center',
      justifyContent: 'center',
   
      borderRadius: R.w(5),
    },
    content: {
      padding: R.w(6),
      paddingTop: R.h(4),
      paddingBottom: R.h(3),
    },
    headerSection: {
      flexDirection: 'row',
      marginBottom: R.h(3),
    },
    headerInfo: {
      flex: 1,
      marginLeft: R.w(4),
    },
    personRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: R.h(1),
      flexWrap: 'wrap',
    },
    personName: {
      fontSize: R.font(20),
      fontFamily: 'SNPro-Heavy',
      color: '#FFFFFF',
    },
    relationship: {
      fontSize: R.font(14),
      fontFamily: 'SNPro-Regular',
      color: 'rgba(255, 255, 255, 0.6)',
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      marginBottom: R.h(3),
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: R.h(1),
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(139, 95, 191, 0.2)',
      paddingHorizontal: R.w(3),
      paddingVertical: R.h(0.5),
      borderRadius: R.w(5),
    },
    categoryEmoji: {
      fontSize: R.font(18),
      marginRight: R.w(1.5),
    },
    categoryLabel: {
      fontSize: R.font(14),
      fontFamily: 'SNPro-Semibold',
      color: 'rgba(255, 255, 255, 0.7)',
    },
    intentionDetails: {
      fontSize: R.font(15),
      fontFamily: 'SNPro-Regular',
      color: '#FFFFFF',
      lineHeight: R.font(22),
      marginBottom: R.h(1.5),
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: R.w(2),
      height: R.w(2),
      borderRadius: R.w(1),
      marginRight: R.w(1.5),
    },
    statusActive: {
      backgroundColor: '#8BED4F',
    },
    statusInactive: {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    statusText: {
      fontSize: R.font(12),
      fontFamily: 'SNPro-Regular',
      color: 'rgba(255, 255, 255, 0.6)',
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(139, 95, 191, 0.3)',
      borderWidth: 1,
      borderColor: 'rgba(139, 95, 191, 0.5)',
      paddingVertical: R.h(1.8),
      borderRadius: R.w(3),
      gap: R.w(2),
      marginBottom: R.h(2),
    },
    editButtonText: {
      fontSize: R.font(16),
      fontFamily: 'SNPro-Semibold',
      color: '#FFFFFF',
    },
    deleteLink: {
      alignItems: 'center',
      paddingVertical: R.h(1.5),
    },
    deleteLinkText: {
      fontSize: R.font(14),
      fontFamily: 'SNPro-Regular',
      color: 'rgba(255, 255, 255, 0.5)',
      textDecorationLine: 'underline',
    },
  });

