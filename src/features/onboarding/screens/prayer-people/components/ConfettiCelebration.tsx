import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import useResponsive from '../../../../../hooks/useResponsive';

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
}

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({ 
  visible, 
  onComplete 
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);

  useEffect(() => {
    if (visible && onComplete) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <ConfettiCannon
        count={100}
        origin={{ x: R.width / 2, y: R.height }}
        explosionSpeed={350}
        fallSpeed={2000}
        fadeOut={true}
        colors={['#FF69B4', '#FFD700', '#00CED1', '#FF6347', '#98FB98']}
        autoStart={true}
        autoStartDelay={0}
      />
    </View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
  },
}); 