import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import useResponsive from '../../hooks/useResponsive';

interface EmptyStateProps {
  onAddIntention: () => void;
  onAddPerson: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddIntention, onAddPerson }) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  return (
    <Animated.View 
      style={styles.emptyContainer}
      entering={FadeIn.delay(100).duration(250)}
    >
      <Text style={styles.emptyTitle}>No prayer intentions yet</Text>
      <Text style={styles.emptySubtitle}>Start by adding yourself or someone to pray for</Text>
      <View style={styles.emptyActions}>
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={onAddIntention}
        >
          <LinearGradient
            colors={['#6C63FF', '#5A52E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyActionGradient}
          >
            <Ionicons name="add-circle" size={R.font(22)} color="white" />
            <Text style={styles.emptyActionText}>Add Intention</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={onAddPerson}
        >
          <LinearGradient
            colors={['#FF6B8B', '#FF5A7F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyActionGradient}
          >
            <Ionicons name="people" size={R.font(22)} color="white" />
            <Text style={styles.emptyActionText}>Add Person</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: R.h(10),
  },
  emptyTitle: {
    fontSize: R.font(24),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: R.h(1),
  },
  emptySubtitle: {
    fontSize: R.font(16),
    color: 'rgba(255,255,255,0.7)',
    marginBottom: R.h(4),
    textAlign: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    gap: R.w(3),
  },
  emptyActionButton: {
    height: R.h(6),
    borderRadius: R.h(3),
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: R.w(5),
    height: '100%',
    gap: R.w(2),
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: R.font(15),
  },
}); 