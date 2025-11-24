import React from 'react';
import {
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';

import VerseShareCarousel from './VerseShareCarousel';
import { BibleVerse } from '../../data/dailyVerses';

interface VerseShareModalProps {
  visible: boolean;
  onClose: () => void;
  verse: BibleVerse;
  userName?: string;
}

const VerseShareModal: React.FC<VerseShareModalProps> = ({
  visible,
  onClose,
  verse,
  userName,
}) => {
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
          <VerseShareCarousel
            verse={verse}
            userName={userName}
            onClose={onClose}
          />
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    height: 700,
  },
});

export default VerseShareModal;
