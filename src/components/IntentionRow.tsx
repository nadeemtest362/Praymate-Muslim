import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons, Feather } from '@expo/vector-icons';
import { PRAYER_TOPICS } from '../constants/prayerConstants';

interface PrayerIntention {
  id: string;
  user_id: string;
  person_id: string | null;
  category: string;
  details: string;
  is_active: boolean;
  created_at: string;
  person?: {
    id: string;
    name: string;
    image_uri: string | null;
    relationship: string | null;
  };
}

interface IntentionRowProps {
  intention: PrayerIntention;
  index: number;
  isEditing: boolean;
  onToggleActive: (intentionId: string) => void;
  onEdit: (intentionId: string) => void;
  onDelete: (intentionId: string) => void;
}

const IntentionRow = React.memo<IntentionRowProps>(({
  intention,
  index,
  isEditing,
  onToggleActive,
  onEdit,
  onDelete,
}) => {
  // Get category info
  const categoryInfo = (PRAYER_TOPICS as any)[intention.category];
  const categoryEmoji = categoryInfo?.emoji || '🙏';
  const categoryLabel = categoryInfo?.label || intention.category;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(300)}
      layout={LinearTransition.springify().damping(15)}
      style={[
        styles.intentionRow,
        !intention.is_active && styles.inactiveRow
      ]}
    >
      {/* Main Content */}
      <View style={styles.contentContainer}>
        <View style={styles.textSection}>
          <Text style={styles.categoryLabel}>
            {categoryEmoji} {categoryLabel}
          </Text>
          <Text style={[
            styles.intentionText,
            !intention.is_active && styles.intentionTextInactive
          ]} numberOfLines={2}>
            {intention.details}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onEdit(intention.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="edit-2" size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onDelete(intention.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="trash-2" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggleActive(intention.id);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {intention.is_active ? (
                <Ionicons name="checkmark-circle" size={24} color="#4ADE80" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color="rgba(255, 255, 255, 0.3)" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.intention.id === nextProps.intention.id &&
    prevProps.intention.is_active === nextProps.intention.is_active &&
    prevProps.intention.details === nextProps.intention.details &&
    prevProps.isEditing === nextProps.isEditing
  );
});

const styles = StyleSheet.create({
  intentionRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inactiveRow: {
    opacity: 0.6,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textSection: {
    flex: 1,
    marginRight: 12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  intentionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  intentionTextInactive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
});

IntentionRow.displayName = 'IntentionRow';

export default IntentionRow; 