import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import SubscriptionManagementSheet from './SubscriptionManagementSheet';
import useResponsive from '../../hooks/useResponsive';

interface SubscriptionButtonProps {
  style?: any;
}

const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({ style }) => {
  const [showManagement, setShowManagement] = useState(false);
  const R = useResponsive();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowManagement(true);
  };

  const dynamicStyles = StyleSheet.create({
    button: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: R.w(4),
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: R.h(2),
      paddingHorizontal: R.w(5),
    },
    text: {
      flex: 1,
      fontSize: R.font(16),
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: R.w(3),
    },
  });

  return (
    <>
      <TouchableOpacity 
        style={[dynamicStyles.button, style]} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={dynamicStyles.content}>
          <MaterialCommunityIcons 
            name="crown" 
            size={R.font(20)} 
            color="#FFD700" 
          />
          <Text style={dynamicStyles.text}>Manage Subscription</Text>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={R.font(20)} 
            color="rgba(255, 255, 255, 0.5)" 
          />
        </View>
      </TouchableOpacity>

      <SubscriptionManagementSheet
        isVisible={showManagement}
        onClose={() => setShowManagement(false)}
      />
    </>
  );
};

export default SubscriptionButton;