import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useResponsive from '../../hooks/useResponsive';

interface ProfileHeaderProps {
  title?: string;
  subtitle?: string;
  onSettingsPress: () => void;
}

export default function ProfileHeader({ 
  title = "✨ Profile",
  subtitle = "Overview and settings",
  onSettingsPress 
}: ProfileHeaderProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  const handleSettingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSettingsPress();
  };

  return (
    <View 
      style={[styles.header, { paddingTop: R.insets.top + R.h(1.5) }]}
    >
      <View style={styles.headerContent}>
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>Profile</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={handleSettingsPress}
        >
          <Feather name="settings" size={R.font(22)} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>
      
      {/* Subtle divider */}
      <View style={styles.headerDivider} />
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  header: {
    paddingHorizontal: R.w(4),
    marginBottom: R.h(1),
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: R.h(2),
    marginHorizontal: R.w(4),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingSection: {
    flex: 1,
  },
  greetingText: {
  fontSize: R.font(32),
  fontFamily: "SNPro-Black",
  color: '#FFFFFF',
  letterSpacing: -0.5,

  lineHeight: R.font(36),
  },
   titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleEmoji: {
    width: R.w(8),
    height: R.w(8),
    marginRight: R.w(2),
  },
 
  settingsButton: {
    width: R.w(10),
    height: R.w(10),
    borderRadius: R.w(5.5),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
}); 
