import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface EmptyPrayersStateProps {
  onStartPraying: () => void;
}

export default function EmptyPrayersState({ onStartPraying }: EmptyPrayersStateProps) {
  return (
    <View style={styles.emptyPrayers}>
      <Text style={styles.emptyPrayersEmoji}>🙏</Text>
      <Text style={styles.emptyPrayersText}>Start praying to see your history here</Text>
      <TouchableOpacity 
        style={styles.startPrayingButton}
        onPress={onStartPraying}
      >
        <Text style={styles.startPrayingText}>Begin Prayer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyPrayers: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPrayersEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyPrayersText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginBottom: 20,
  },
  startPrayingButton: {
    backgroundColor: 'rgba(139, 237, 79, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 237, 79, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  startPrayingText: {
    color: '#8BED4F',
    fontSize: 16,
    fontWeight: '700',
  },
}); 