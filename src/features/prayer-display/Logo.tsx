import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Logo: React.FC = () => (
  <View style={styles.logoContainer}>
    <View style={styles.logoWrapper}>
      <Text style={styles.logoText}>🙏personal</Text>
      <Text style={styles.logoAccent}>prayers</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  logoContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: -0.5,
  },
  logoAccent: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: -0.5,
  },
}); 