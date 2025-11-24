import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../../shared/ui';

// Define a minimal Contact type needed for this component
interface Contact {
  id: string;
  name: string;
  image?: { uri: string };
}

interface ContactListItemProps {
  item: Contact;
  isSelected: boolean;
  onToggleSelection: (contact: Contact) => void;
  disabled?: boolean;
}

export default function ContactListItem({ item, isSelected, onToggleSelection, disabled }: ContactListItemProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  return (
    <Pressable
      style={[
        styles.contactItem,
        isSelected && styles.contactItemSelected,
        disabled && styles.contactItemDisabled,
      ]}
      onPress={() => onToggleSelection(item)}
      disabled={disabled}
    >
      <View style={styles.contactDetails}>
        <Avatar
          size={40}
          uri={imageLoadError ? null : item.image?.uri}
          name={item.name}
          onError={() => {
            console.log(`Contact list image failed for: ${item.name} (${item.id}) - URI: ${item.image?.uri}`);
            setImageLoadError(true);
          }}
        />
        <Text style={styles.contactName}>{item.name}</Text>
      </View>
      <View style={styles.checkboxContainer}>
        {isSelected ? (
          <View style={styles.checkboxChecked}>
            <Feather name="check" size={16} color="white" />
          </View>
        ) : (
          <View style={styles.checkboxUnchecked} />
        )}
      </View>
    </Pressable>
  );
}

// Copy relevant styles from manage-modal.tsx
const styles = StyleSheet.create({
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  contactItemSelected: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
  },
  contactItemDisabled: {
    opacity: 0.5,
  },
  contactDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
    fontWeight: '500',
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 