/**
 * Examples of Button and Card components
 * 
 * These examples show how to use the UI library components
 * while maintaining the original Personal Prayers app aesthetics
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card } from '../core';

export const ButtonExamples = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Button Components</Text>
      
      {/* Primary Button (White) */}
      <Button onPress={() => console.log('Primary pressed')}>
        Save Changes
      </Button>
      
      {/* Gradient Button (Generate Prayer style) */}
      <Button 
        variant="gradient" 
        icon={<Ionicons name="sparkles" size={24} color="#FFFFFF" />}
        onPress={() => console.log('Generate pressed')}
      >
        Generate My Prayer
      </Button>
      
      {/* Secondary Button */}
      <Button 
        variant="secondary"
        onPress={() => console.log('Secondary pressed')}
      >
        Add Intention
      </Button>
      
      {/* Ghost Button */}
      <Button 
        variant="ghost"
        icon={<Ionicons name="arrow-back" size={24} color="#FFFFFF" />}
        iconPosition="left"
        onPress={() => console.log('Back pressed')}
      >
        Back
      </Button>
      
      {/* Loading State */}
      <Button loading>
        Loading...
      </Button>
      
      {/* Disabled State */}
      <Button disabled>
        Disabled
      </Button>
      
      {/* Different Sizes */}
      <Button size="small">Small Button</Button>
      <Button size="medium">Medium Button</Button>
      <Button size="large">Large Button</Button>
    </View>
  );
};

export const CardExamples = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card Components</Text>
      
      {/* Default Card */}
      <Card>
        <Text style={styles.cardText}>Default Card</Text>
      </Card>
      
      {/* Glass Card */}
      <Card variant="glass">
        <Text style={styles.cardText}>Glass Morphism Card</Text>
      </Card>
      
      {/* Intention Card */}
      <Card variant="intention" onPress={() => console.log('Intention tapped')}>
        <Text style={styles.cardText}>Intention Style Card</Text>
      </Card>
      
      {/* Prayer Card */}
      <Card variant="prayer">
        <Text style={styles.cardText}>Prayer Style Card</Text>
      </Card>
      
      {/* Gradient Card */}
      <Card gradient={['#5E55D1', '#7C71E0', '#9866C5']}>
        <Text style={styles.cardText}>Gradient Card</Text>
      </Card>
      
      {/* Animated Card */}
      <Card animated variant="glass">
        <Text style={styles.cardText}>Animated Card (with fade in/out)</Text>
      </Card>
      
      {/* Custom Border Radius */}
      <Card borderRadius={24} variant="secondary">
        <Text style={styles.cardText}>Custom Border Radius</Text>
      </Card>
      
      {/* Without Elevation */}
      <Card elevation={false}>
        <Text style={styles.cardText}>No Shadow/Elevation</Text>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 