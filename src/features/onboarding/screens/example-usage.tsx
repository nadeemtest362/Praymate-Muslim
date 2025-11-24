import React from 'react';
import { View, Text, Button, StyleSheet, TextInput } from 'react-native';
// Use the index for cleaner imports and better tree-shaking
import { 
  withResilience, 
  ResilientWrapper,
  savePrayerFocusPersonOffline,
} from '../services/onboarding';
import { offlineManager } from '../services/onboarding/offline-manager';
import { supabase } from '../../../lib/supabaseClient';

// Example SDUI screen component
function AddPrayerPersonScreen({ config, onNext }: any) {
  const [name, setName] = React.useState('');
  const [relationship, setRelationship] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Save person with offline support
      const person = {
        id: `person_${Date.now()}`,
        name,
        relationship,
      };
      
      const result = await savePrayerFocusPersonOffline(person, user.id);
      
      if (result.success) {
        console.log(result.queued ? 'Queued for sync' : 'Saved online');
        onNext();
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{config.title || 'Add Prayer Person'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Relationship"
        value={relationship}
        onChangeText={setRelationship}
      />
      <Button
        title={saving ? 'Saving...' : 'Save'}
        onPress={handleSave}
        disabled={saving || !name}
      />
    </View>
  );
}

// Apply resilience wrapper - this gives you:
// - Error boundaries
// - Offline awareness
// - Loading states
// - Auto-save every 30 seconds
// - Network monitoring
// - Sync indicators
// Styles must be defined before usage
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export const ResilientAddPrayerPersonScreen = withResilience(
  AddPrayerPersonScreen,
  'add_prayer_person',
  {
    // Optional custom loading view
    loadingView: (
      <View style={styles.loadingContainer}>
        <Text>Loading your prayer people...</Text>
      </View>
    ),
    
    // Optional custom error view
    errorView: (error, retry) => (
      <View style={styles.errorContainer}>
        <Text>Custom error: {error.message}</Text>
        <Button title="Retry" onPress={retry} />
      </View>
    ),
    
    // Optional custom onLoad function
    onLoad: async () => {
      // Load any additional data needed
      console.log('Screen loaded');
    },
    
    // Optional save interval (default 30 seconds)
    saveInterval: 20000, // 20 seconds
  }
);

// You can also use it as a wrapper directly
export function AlternativeUsage() {
  return (
    <ResilientWrapper screenName="alternative_screen">
      <View>
        <Text>Your screen content here</Text>
      </View>
    </ResilientWrapper>
  );
}

// Example: Check sync status
export function SyncStatus() {
  const [pendingOps, setPendingOps] = React.useState(0);
  
  React.useEffect(() => {
    const check = () => {
      setPendingOps(offlineManager.getPendingOperationsCount());
    };
    
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View>
      <Text>Pending operations: {pendingOps}</Text>
      {pendingOps > 0 && (
        <Button
          title="Sync Now"
          onPress={() => offlineManager.syncPendingOperations()}
        />
      )}
    </View>
  );
} 