import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle, ColorValue } from 'react-native';
import * as ExpoIcons from '@expo/vector-icons';

// All available icon sets from @expo/vector-icons
export type IconSet = 
  | 'AntDesign' 
  | 'Entypo' 
  | 'EvilIcons' 
  | 'Feather'
  | 'FontAwesome'
  | 'FontAwesome5'
  | 'Fontisto'
  | 'Foundation'
  | 'Ionicons'
  | 'MaterialIcons'
  | 'MaterialCommunityIcons'
  | 'Octicons'
  | 'SimpleLineIcons'
  | 'Zocial';

export interface IconProps {
  name: string;
  size?: number;
  color?: ColorValue;
  set?: IconSet;
  style?: ViewStyle | TextStyle;
}

const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = '#000', 
  set = 'Ionicons', 
  style 
}) => {
  // Get the correct icon component from the set
  // eslint-disable-next-line import/namespace
  const IconComponent = ExpoIcons[set];

  if (!IconComponent) {
    console.warn(`Icon set "${set}" not found`);
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <IconComponent name={name} size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Icon; 