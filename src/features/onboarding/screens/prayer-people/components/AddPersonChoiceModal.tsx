import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Platform,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingGradientBackground from '../../../../../components/shared/OnboardingGradientBackground';
import useResponsive from '../../../../../hooks/useResponsive';

const MEMOJI_IMAGES = [
  require('../../../../../../assets/images/memoji3.png'),
  require('../../../../../../assets/images/memoji4.png'),
  require('../../../../../../assets/images/memoji5.png'),
  require('../../../../../../assets/images/memoji6.png'),
];

interface AddPersonChoiceModalProps {
  onContactsAdd: () => void;
  onManualAdd: () => void;
  onCancel: () => void;
}

export const AddPersonChoiceModal: React.FC<AddPersonChoiceModalProps> = ({ 
  onContactsAdd,
  onManualAdd,
  onCancel 
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);

  return (
    <View style={styles.container}>
      <OnboardingGradientBackground />
      
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onCancel}
      />
      
      {/* Mock blurred contact list visualization */}
      <View style={styles.blurredContactsPreview}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={styles.contactRow}>
            <Image 
              source={MEMOJI_IMAGES[i]} 
              style={styles.contactAvatar}
              resizeMode="cover"
            />
            <View style={styles.contactInfo}>
              <View style={[styles.contactLine, { width: '70%' }]} />
              <View style={[styles.contactLine, { width: '50%' }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.modalContainer}>
        {/* Content */}
        <View style={styles.content}>
            <Text style={styles.title}>Start Your Prayer Circle!</Text>
            
            <Text style={styles.subtitle}>
              Praymate needs access to your contacts{'\n'}to help you add people to your prayer circle.
            </Text>
            
            {/* Security Badge */}
            <View style={styles.securityBadge}>
              <MaterialCommunityIcons name="lock" size={R.w(4)} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.securityText}>Contacts are always kept safe and secure</Text>
            </View>
            
            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {/* Primary CTA - Add from Contacts */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onContactsAdd}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryButtonText}>Add My People</Text>
              </TouchableOpacity>
              
              {/* Secondary Button - Add Manually */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onManualAdd}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Add Manually</Text>
              </TouchableOpacity>
            </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  blurredContactsPreview: {
    position: 'absolute',
    top: R.h(10),
    left: R.w(10),
    right: R.w(10),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: R.w(8),
    padding: R.w(6),
    paddingBottom: R.w(3),
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: R.h(2.5),
  },
  contactAvatar: {
    width: R.w(16),
    height: R.w(16),
    borderRadius: R.w(8),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: R.w(4),
  },
  contactInfo: {
    flex: 1,
    gap: R.h(1),
  },
  contactLine: {
    height: R.h(1.6),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: R.w(1.5),
  },
  content: {
    paddingHorizontal: R.w(6),
    paddingTop: R.h(3),
    paddingBottom: R.insets.bottom + R.h(2),
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: R.font(36),
    fontFamily: 'SNPro-Black',
    textAlign: 'center',
    marginBottom: R.h(2),
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: R.font(16),
    fontFamily: 'SNPro-Semibold',
    textAlign: 'center',
    lineHeight: R.font(22),
    marginBottom: R.h(3),
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.h(4),
    gap: R.w(2),
  },
  securityText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: R.font(13),
    fontFamily: 'SNPro-Semibold',
  },
  buttonContainer: {
    width: '100%',
    gap: R.h(1.5),
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: R.h(2),
    borderRadius: R.w(4),
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: R.font(16),
    fontFamily: 'SNPro-Semibold',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: R.h(2.2),
    borderRadius: R.w(4),
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: R.font(24),
    fontFamily: 'SNPro-Black',
    letterSpacing: -0.5,
  },
});
