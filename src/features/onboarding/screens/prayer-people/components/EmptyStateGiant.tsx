import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useResponsive from '../../../../../hooks/useResponsive';

interface EmptyStateGiantProps {
  onPress: () => void;
  text?: string;
}

export const EmptyStateGiant: React.FC<EmptyStateGiantProps> = ({ 
  onPress, 
  text = "tap to add your first person" 
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);

  return (
    <TouchableOpacity 
      style={styles.emptySelectedStateGiant}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.emptyAvatarContainerGiant}>
        <View style={styles.emptyAvatarGiant}>
          <MaterialCommunityIcons name="heart-plus" size={R.w(20)} color="rgba(255, 255, 255, 0.9)" />
        </View>
        <Text style={styles.emptyStateTextGiant}>{text}</Text>
        <Text style={styles.emptyStateSubtextGiant}>start building your prayer list</Text>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  emptySelectedStateGiant: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingTop: R.h(3),
  },
  emptyAvatarContainerGiant: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    backgroundColor: 'transparent',
  },
  emptyAvatarGiant: {
    width: R.w(50),
    height: R.w(50),
    borderRadius: R.w(25),
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.h(3),
    shadowColor: 'rgba(255, 255, 255, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  emptyStateTextGiant: {
    color: '#FFFFFF',
    fontSize: R.font(24),
    textAlign: 'center',
    fontFamily: 'SNPro-Semibold',
    marginBottom: R.h(1),
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  emptyStateSubtextGiant: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: R.font(18),
    textAlign: 'center',
    fontFamily: 'SNPro-Regular',
    fontStyle: 'italic',
  },
}); 