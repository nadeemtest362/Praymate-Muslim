/**
 * Examples of Modal, Alert, and Toast components
 * 
 * These examples show how to use the feedback components
 * from the UI library
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../core';
import { Modal, Alert, ToastContainer, useToast } from '../feedback';
import { Input, Toggle } from '../forms';

export const ModalExamples = () => {
  // Modal states
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [centerModalVisible, setCenterModalVisible] = useState(false);
  
  // Alert states
  const [infoAlertVisible, setInfoAlertVisible] = useState(false);
  const [successAlertVisible, setSuccessAlertVisible] = useState(false);
  const [warningAlertVisible, setWarningAlertVisible] = useState(false);
  const [confirmAlertVisible, setConfirmAlertVisible] = useState(false);
  
  // Toast hook
  const { toasts, showToast, dismissToast } = useToast();
  
  // Form state for bottom sheet
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [prayerRequest, setPrayerRequest] = useState('');
  
  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Modal & Feedback Components</Text>
        
        {/* Modal Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modals</Text>
          
          <Button onPress={() => setBottomSheetVisible(true)}>
            Open Bottom Sheet
          </Button>
          
          <Button 
            variant="secondary"
            onPress={() => setFullScreenVisible(true)}
          >
            Open Full Screen Modal
          </Button>
          
          <Button 
            variant="ghost"
            onPress={() => setCenterModalVisible(true)}
          >
            Open Center Modal
          </Button>
        </View>
        
        {/* Alert Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          
          <Button 
            size="small"
            onPress={() => setInfoAlertVisible(true)}
          >
            Info Alert
          </Button>
          
          <Button 
            size="small"
            variant="secondary"
            onPress={() => setSuccessAlertVisible(true)}
          >
            Success Alert
          </Button>
          
          <Button 
            size="small"
            variant="ghost"
            onPress={() => setWarningAlertVisible(true)}
          >
            Warning Alert
          </Button>
          
          <Button 
            size="small"
            onPress={() => setConfirmAlertVisible(true)}
          >
            Confirm Dialog
          </Button>
        </View>
        
        {/* Toast Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toasts</Text>
          
          <Button 
            size="small"
            onPress={() => showToast({
              message: 'This is an info toast',
              type: 'info',
            })}
          >
            Info Toast
          </Button>
          
          <Button 
            size="small"
            variant="secondary"
            onPress={() => showToast({
              message: 'Prayer saved successfully!',
              type: 'success',
            })}
          >
            Success Toast
          </Button>
          
          <Button 
            size="small"
            variant="ghost"
            onPress={() => showToast({
              message: 'Please check your connection',
              type: 'warning',
              action: {
                label: 'Retry',
                onPress: () => console.log('Retry pressed'),
              },
            })}
          >
            Warning Toast with Action
          </Button>
          
          <Button 
            size="small"
            onPress={() => showToast({
              message: 'Failed to load prayers',
              type: 'error',
              duration: 0, // Don't auto-dismiss
            })}
          >
            Error Toast (No Auto-dismiss)
          </Button>
        </View>
      </ScrollView>
      
      {/* Modal Components */}
      
      {/* Bottom Sheet Modal */}
      <Modal
        visible={bottomSheetVisible}
        onClose={() => setBottomSheetVisible(false)}
        variant="bottom-sheet"
        title="Prayer Settings"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>
            Customize your prayer experience
          </Text>
          
          <Toggle
            checked={enableNotifications}
            onCheckedChange={setEnableNotifications}
            label="Enable prayer reminders"
          />
          
          <View style={{ height: 20 }} />
          
          <Input
            label="Prayer Request"
            placeholder="What's on your heart?"
            value={prayerRequest}
            onChangeText={setPrayerRequest}
            multiline
            numberOfLines={3}
          />
          
          <View style={{ height: 20 }} />
          
          <Button onPress={() => setBottomSheetVisible(false)}>
            Save Settings
          </Button>
        </View>
      </Modal>
      
      {/* Full Screen Modal */}
      <Modal
        visible={fullScreenVisible}
        onClose={() => setFullScreenVisible(false)}
        variant="full-screen"
        title="Share Your Prayer"
      >
        <View style={styles.modalContent}>
          <Text style={styles.shareText}>
            Share your prayer with others
          </Text>
          
          <View style={styles.shareOptions}>
            <Button 
              variant="gradient"
              icon={<Ionicons name="logo-instagram" size={20} color="#FFFFFF" />}
            >
              Instagram
            </Button>
            
            <Button 
              variant="secondary"
              icon={<Ionicons name="copy" size={20} color="#FFFFFF" />}
            >
              Copy Text
            </Button>
          </View>
        </View>
      </Modal>
      
      {/* Center Modal */}
      <Modal
        visible={centerModalVisible}
        onClose={() => setCenterModalVisible(false)}
        variant="center"
        title="Quick Prayer"
      >
        <Text style={styles.centerModalText}>
          Lord, thank you for this day. Guide me in your wisdom and love. Amen.
        </Text>
        
        <Button 
          size="small"
          onPress={() => setCenterModalVisible(false)}
        >
          Amen 🙏
        </Button>
      </Modal>
      
      {/* Alert Components */}
      
      <Alert
        visible={infoAlertVisible}
        onClose={() => setInfoAlertVisible(false)}
        title="Prayer Reminder"
        message="Your evening prayer is ready. Take a moment to connect with God."
        type="info"
      />
      
      <Alert
        visible={successAlertVisible}
        onClose={() => setSuccessAlertVisible(false)}
        title="Prayer Saved"
        message="Your prayer has been saved to your journal."
        type="success"
      />
      
      <Alert
        visible={warningAlertVisible}
        onClose={() => setWarningAlertVisible(false)}
        title="Offline Mode"
        message="You're offline. Some features may be limited."
        type="warning"
      />
      
      <Alert
        visible={confirmAlertVisible}
        onClose={() => setConfirmAlertVisible(false)}
        title="Delete Prayer?"
        message="This action cannot be undone."
        actions={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setConfirmAlertVisible(false),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              console.log('Delete pressed');
              setConfirmAlertVisible(false);
            },
          },
        ]}
      />
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalContent: {
    paddingVertical: 20,
  },
  modalText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
  },
  shareText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  shareOptions: {
    gap: 12,
  },
  centerModalText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
}); 