import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import useResponsive from '../../../../../hooks/useResponsive';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  visible, 
  text = 'Adding person...' 
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);

  if (!visible) return null;

  return (
    <BlurView intensity={50} tint="dark" style={styles.loadingContainer}>
      <View style={styles.loadingBlur}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>{text}</Text>
      </View>
    </BlurView>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    borderRadius: R.w(6),
    overflow: 'hidden',
  },
  loadingBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: R.w(5),
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: R.font(16),
    fontWeight: '600',
    marginTop: R.h(1.5),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
}); 