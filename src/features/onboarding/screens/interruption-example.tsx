import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { withResilience } from '../services/onboarding/resilient-wrapper';
import { useInterruptionHandler } from '../services/onboarding/interruption-handler';

// Example form screen that handles interruptions
function PrayerDetailsForm({ config, onNext }: any) {
  const { savedState, saveFormData, clearSavedState } = useInterruptionHandler('prayer_details_form');
  
  // Initialize form state from saved state if available
  const [formData, setFormData] = useState({
    prayerRequest: savedState?.formData?.prayerRequest || '',
    prayerDetails: savedState?.formData?.prayerDetails || '',
    urgency: savedState?.formData?.urgency || 'normal',
    category: savedState?.formData?.category || '',
  });
  
  const [scrollPosition, setScrollPosition] = useState(savedState?.scrollPosition || 0);
  
  // Auto-save form data when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormData(formData, { scrollPosition });
    }, 1000); // Debounce for 1 second
    
    return () => clearTimeout(timer);
  }, [formData, scrollPosition, saveFormData]);
  
  // If we resumed from an interruption, show a message
  useEffect(() => {
    if (savedState) {
      console.log('Resumed from interruption with saved data:', savedState);
      // You could show a toast or banner here
    }
  }, [savedState]);
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async () => {
    // Save the prayer request
    console.log('Submitting:', formData);
    
    // Clear saved state after successful submission
    await clearSavedState();
    
    onNext();
  };
  
  return (
    <ScrollView
      style={styles.container}
      onScroll={(e) => setScrollPosition(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={100}
      contentOffset={{ x: 0, y: scrollPosition }}
    >
      <Text style={styles.title}>Add Prayer Details</Text>
      
      {savedState && (
        <View style={styles.resumedBanner}>
          <Text style={styles.resumedText}>
            Welcome back! We've restored your progress.
          </Text>
        </View>
      )}
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Prayer Request</Text>
        <TextInput
          style={styles.input}
          placeholder="What would you like to pray for?"
          value={formData.prayerRequest}
          onChangeText={(text) => handleInputChange('prayerRequest', text)}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add more details..."
          value={formData.prayerDetails}
          onChangeText={(text) => handleInputChange('prayerDetails', text)}
          multiline
          numberOfLines={4}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Urgency</Text>
        <View style={styles.radioGroup}>
          {['low', 'normal', 'high', 'urgent'].map((level) => (
            <Button
              key={level}
              title={level}
              onPress={() => handleInputChange('urgency', level)}
              color={formData.urgency === level ? '#007AFF' : '#999'}
            />
          ))}
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          placeholder="Health, Family, Work, etc."
          value={formData.category}
          onChangeText={(text) => handleInputChange('category', text)}
        />
      </View>
      
      <Button
        title="Save Prayer Request"
        onPress={handleSubmit}
        disabled={!formData.prayerRequest}
      />
      
      {/* Add some space at bottom */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// Apply resilience wrapper - interruption handling is automatic!
export const ResilientPrayerDetailsForm = withResilience(
  PrayerDetailsForm,
  'prayer_details_form',
  {
    // When the screen loads, it will automatically:
    // 1. Check for interrupted state
    // 2. Restore form data if available
    // 3. Auto-save periodically
    // 4. Handle offline/online transitions
    // 5. Show error boundaries
    // 6. Track analytics
  }
);

// Advanced usage: Manual interruption handling
export function ManualInterruptionExample() {
  const handler = useInterruptionHandler('manual_example');
  
  const handleSpecialCase = async () => {
    // Manually save state before a risky operation
    await handler.saveFormData(
      { importantData: 'value' },
      { activeElement: 'special_button' }
    );
    
    // Do risky operation...
  };
  
  const handleClearState = async () => {
    // Manually clear saved state
    await handler.clearSavedState();
  };
  
  return (
    <View>
      <Text>Has saved state: {handler.hasSavedState ? 'Yes' : 'No'}</Text>
      {handler.savedState && (
        <Text>Saved at: {new Date(handler.savedState.timestamp).toLocaleString()}</Text>
      )}
      <Button title="Save State" onPress={handleSpecialCase} />
      <Button title="Clear State" onPress={handleClearState} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  resumedBanner: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  resumedText: {
    color: 'white',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
}); 