import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Icon from './Icon';
import { colors } from '../theme';
import { Button } from '../shared/ui';

const IconExample: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Icon Examples</Text>
      
      <View style={styles.row}>
        <Icon name="heart" size={24} color={colors.error} set="Ionicons" />
        <Text style={styles.label}>Heart (Ionicons)</Text>
      </View>
      
      <View style={styles.row}>
        <Icon name="home" size={30} color={colors.primary} set="MaterialIcons" />
        <Text style={styles.label}>Home (MaterialIcons)</Text>
      </View>
      
      <View style={styles.row}>
        <Icon name="bell" size={28} color={colors.secondary} set="Feather" />
        <Text style={styles.label}>Bell (Feather)</Text>
      </View>
      
      <Text style={styles.subheading}>Icons in Buttons</Text>
      
      <View style={styles.buttonRow}>
        <Button 
          icon={<Icon name="thumbs-up" size={18} color="white" set="Feather" />}
          iconPosition="left"
          variant="primary"
        >
          Like
        </Button>
        
        <Button 
          icon={<Icon name="settings" size={18} color="white" set="Feather" />}
          iconPosition="right"
          variant="secondary"
        >
          Settings
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.text.primary,
  },
  subheading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.secondary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
});

export default IconExample; 