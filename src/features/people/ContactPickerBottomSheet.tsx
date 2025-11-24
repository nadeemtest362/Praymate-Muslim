import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import ContactListItem from './ContactListItem';
import * as Haptics from 'expo-haptics';
import { PrayerPersonForm, type PrayerPersonFormData } from './PrayerPersonForm';
import { safeIncludes } from '../../utils/safeArrayMethods';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: Contacts.PhoneNumber[];
  emails?: Contacts.Email[];
  image?: { uri: string };
}

interface ContactPickerBottomSheetProps {
  onContactSelect: (contact: Contact) => void;
  onManualAdd: () => void;
  onPersonSubmit: (data: PrayerPersonFormData) => Promise<void>;
  excludeContactIds?: string[];
}

export default function ContactPickerBottomSheet({
  onContactSelect,
  onManualAdd,
  onPersonSubmit,
  excludeContactIds = [],
}: ContactPickerBottomSheetProps) {
  const [contactPermission, setContactPermission] = useState<"unknown" | "requesting" | "granted" | "denied">("unknown");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  
  // Person form state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [personFormLoading, setPersonFormLoading] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      
      // Load first 100 contacts for fast initial display
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.ID,
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image,
          Contacts.Fields.ImageAvailable,
        ],
        sort: Contacts.SortTypes.FirstName,
        pageSize: 100,
        pageOffset: 0,
      });
      
      const validContacts = data
        .filter((contact): contact is Contacts.Contact & { id: string } => 
          Boolean(contact.name) && Boolean(contact.id)
        )
        .map((contact) => ({
          id: contact.id,
          name: contact.name || '',
          phoneNumbers: contact.phoneNumbers,
          emails: contact.emails,
          image: contact.image?.uri ? { uri: contact.image.uri } : undefined,
        } as Contact));

      setContacts(validContacts);
    } catch (error) {
      console.error("Error loading contacts:", error);
      Alert.alert("Error", "Failed to load contacts. Please try again.");
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const checkContactPermission = useCallback(async () => {
    const { status } = await Contacts.getPermissionsAsync();
    setContactPermission(status as "granted" | "denied" | "unknown");
    
    if (status === "granted") {
      loadContacts();
    }
  }, [loadContacts]);

  useEffect(() => {
    checkContactPermission();
  }, [checkContactPermission]);
  
  // Auto-focus search input when sheet opens
  useEffect(() => {
    // Delay to ensure the sheet animation has completed
    const timer = setTimeout(() => {
      if (contactPermission === "granted" && searchInputRef.current && !showPersonForm) {
        searchInputRef.current.focus();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [contactPermission, showPersonForm]);





  const requestContactPermission = async () => {
    setContactPermission("requesting");
    const { status } = await Contacts.requestPermissionsAsync();
    setContactPermission(status as "granted" | "denied" | "unknown");
    
    if (status === "granted") {
      loadContacts();
    }
  };

  // Native search for contacts
  const searchContacts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);
      console.log('[ContactPicker] Searching contacts with query:', query);
      
      const { data } = await Contacts.getContactsAsync({
        name: query, // Native search!
        fields: [
          Contacts.Fields.ID,
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image,
          Contacts.Fields.ImageAvailable,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      const validContacts = data
        .filter((contact): contact is Contacts.Contact & { id: string } => 
          Boolean(contact.name) && Boolean(contact.id)
        )
        .map((contact) => ({
          id: contact.id,
          name: contact.name || '',
          phoneNumbers: contact.phoneNumbers,
          emails: contact.emails,
          image: contact.image?.uri ? { uri: contact.image.uri } : undefined,
        } as Contact));

      console.log('[ContactPicker] Search results:', validContacts.length);
      setSearchResults(validContacts);
    } catch (error) {
      console.error('[ContactPicker] Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchContacts(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setSearchLoading(false);
    }
  }, [searchQuery]);

  // Get contacts to display - either initial 100 or search results, then filter by excludeContactIds
  const displayContacts = searchQuery.trim() ? searchResults : contacts;
  const filteredContacts = displayContacts.filter((contact) =>
    !safeIncludes(excludeContactIds, contact.id)
  );

  // Limited access detection - improved to handle 0 contacts case
  const unaddedContacts = filteredContacts.filter(contact => !safeIncludes(excludeContactIds, contact.id));
  const showLimitedAccessHint = unaddedContacts.length > 0 && unaddedContacts.length <= 3 && contacts.length > 0;
  // Consider it limited access if: no contacts at all, or very few contacts
  const likelyLimitedAccess = contacts.length === 0 || contacts.length < 50;
  // Check filtered contacts, not total contacts - user sees filtered list
  const noContactsAtAll = filteredContacts.length === 0 && !loadingContacts;

  // Debug logging
  console.log('[ContactPicker] Debug:', {
    contactsLength: contacts.length,
    loadingContacts,
    noContactsAtAll,
    likelyLimitedAccess,
    contactPermission,
    filteredContactsLength: filteredContacts.length
  });

  const handleContactSelect = (contact: Contact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setSelectedContact(contact);
    setShowPersonForm(true);
  };

  const handleManualAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Show form with empty data for manual entry
    setSelectedContact(null);
    setShowPersonForm(true);
  };

  const handlePersonFormSubmit = async (data: PrayerPersonFormData) => {
    setPersonFormLoading(true);
    try {
      await onPersonSubmit(data);
      // Don't reset the form state immediately - let the parent handle closing
      // This prevents the jarring content switch while the sheet is closing
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error submitting person form:', error);
      Alert.alert('Error', 'Failed to add person. Please try again.');
      setPersonFormLoading(false);
    }
  };

  const handlePersonFormCancel = () => {
    setShowPersonForm(false);
    setSelectedContact(null);
  };

  if (contactPermission === "unknown" || contactPermission === "requesting") {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="contacts" size={80} color="#6C63FF" style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Find People to Pray For</Text>
        <Text style={styles.permissionText}>
          Allow access to your contacts to easily add people you want to pray for.
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={requestContactPermission}
          disabled={contactPermission === "requesting"}
        >
          <Text style={styles.permissionButtonText}>
            {contactPermission === "requesting" ? "Requesting..." : "Allow Contact Access"}
          </Text>
        </Pressable>
        <Pressable style={styles.manualButton} onPress={handleManualAdd}>
          <Text style={styles.manualButtonText}>Enter Name Manually</Text>
        </Pressable>
      </View>
    );
  }

  if (contactPermission === "denied") {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="no-sim" size={64} color="#6C63FF" />
        <Text style={styles.permissionTitle}>Contact Access Denied</Text>
        <Text style={styles.permissionText}>
          You can still add people manually or update permissions in device settings.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestContactPermission}>
          <Text style={styles.permissionButtonText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.manualButton} onPress={handleManualAdd}>
          <Text style={styles.manualButtonText}>Enter Name Manually</Text>
        </Pressable>
      </View>
    );
  }

  // Show person form if contact was selected or manual add was chosen
  if (showPersonForm) {
    const initialData: Partial<PrayerPersonFormData> = selectedContact
      ? {
          name: selectedContact.name,
          image_uri: selectedContact.image?.uri,
          phoneNumber: selectedContact.phoneNumbers?.[0]?.number,
          email: selectedContact.emails?.[0]?.email,
          deviceContactId: selectedContact.id,
        }
      : {};

    return (
      <View style={styles.container}>
        <PrayerPersonForm
          initialData={initialData}
          onSubmit={handlePersonFormSubmit}
          onCancel={handlePersonFormCancel}
          isSubmitting={personFormLoading}
          mode="create"
          startWithName={!selectedContact}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Search Header */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoFocus={contactPermission === "granted"}
          autoCapitalize="words"
          autoCorrect={false}
          blurOnSubmit={false}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery("")}
            style={styles.clearSearchButton}
          >
            <Feather name="x" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
        )}
      </View>

      {/* Fixed Quick Add Button */}
      <View style={styles.optionsRow}>
        <Pressable style={styles.quickAddButton} onPress={handleManualAdd}>
          <Feather name="user-plus" size={16} color="white" />
          <Text style={styles.quickAddText}>Quick Add</Text>
        </Pressable>
      </View>

      {/* Limited Access Hint */}
      {showLimitedAccessHint && !searchQuery && (
        <View style={styles.limitedAccessBanner}>
          <Text style={styles.limitedAccessText}>
            Only {unaddedContacts.length} {unaddedContacts.length === 1 ? 'contact' : 'contacts'} left to add
          </Text>
          {Platform.OS === 'ios' && (
            <Text style={styles.limitedAccessSubtext}>
              You may have given limited access • Expand in Settings
            </Text>
          )}
        </View>
      )}

      {/* Scrollable Contact List */}
      <FlatList
        data={loadingContacts || searchLoading ? [] : filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContactListItem 
            item={item} 
            isSelected={false}
            onToggleSelection={handleContactSelect} 
          />
        )}
        ListEmptyComponent={(
          loadingContacts || searchLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {searchLoading ? "Searching contacts..." : "Loading contacts..."}
              </Text>
            </View>
          ) : noContactsAtAll ? (
            // Special empty state for likely limited access
            <View style={styles.emptyContainer}>
              <MaterialIcons 
                name="people-outline" 
                size={48} 
                color="rgba(108, 99, 255, 0.6)" 
                style={{ marginBottom: 16 }}
              />
              <Text style={styles.emptyTitle}>Add More Contacts</Text>
              <Text style={styles.emptyText}>
                You gave Praymate limited access. Let's add more people from your contacts!
              </Text>
              
              <View style={styles.emptyActions}>
                <Pressable
                  style={[styles.permissionButton, { marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Linking.openSettings();
                  }}
                >
                  <Text style={styles.permissionButtonText}>
                    Add More Contacts
                  </Text>
                  <Feather name="arrow-right" size={16} color="white" style={{ marginLeft: 6 }} />
                </Pressable>
                
                <Pressable
                  style={[styles.manualButton, { width: '80%', backgroundColor: 'transparent', paddingVertical: 12 }]}
                  onPress={handleManualAdd}
                >
                  <Text style={[styles.manualButtonText, { fontSize: 14, opacity: 0.8 }]}>
                    or add manually instead
                  </Text>
                </Pressable>
              </View>
              
              {Platform.OS === 'ios' && (
                <Text style={styles.tipText}>
                  Settings → Praymate → Contacts → Select "All Contacts"
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No contacts found matching your search."
                  : "No contacts found."}
              </Text>
            </View>
          )
        )}
        ListFooterComponent={
          likelyLimitedAccess && !loadingContacts && !noContactsAtAll && filteredContacts.length > 0 ? (
            <View style={styles.limitedAccessFooter}>
              <View style={styles.limitedAccessFooterContent}>
                <MaterialIcons 
                  name="people-outline" 
                  size={48} 
                  color="rgba(108, 99, 255, 0.6)" 
                  style={{ marginBottom: 8 }}
                />
                <Text style={styles.limitedAccessFooterTitle}>
                  You're missing out on more contacts!
                </Text>
                <Text style={styles.limitedAccessFooterText}>
                  You only gave limited access. Add all your contacts to find more people to pray for.
                </Text>
                <Pressable
                  style={[styles.permissionButton, { marginBottom: 16, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Linking.openSettings();
                  }}
                >
                  <Text style={styles.permissionButtonText}>
                    Add All Contacts
                  </Text>
                  <Feather name="arrow-right" size={16} color="white" style={{ marginLeft: 6 }} />
                </Pressable>
                
                <Pressable
                  style={styles.limitedAccessFooterAltButton}
                  onPress={handleManualAdd}
                >
                  <Text style={[styles.limitedAccessFooterAltButtonText, { opacity: 0.7 }]}>
                    or add manually
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null
        }
        style={styles.contactsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  permissionIcon: {
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 4,
  },
  clearSearchButton: {
    padding: 4,
  },
  optionsRow: {
    marginBottom: 16,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  quickAddText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  contactsList: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyActions: {
    alignItems: 'center',
    width: '100%',
  },
  limitedAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 12,
  },
  limitedAccessButtonText: {
    color: 'rgba(108, 99, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  orText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontStyle: 'italic',
    marginTop: 8,
  },
  limitedAccessBanner: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  limitedAccessText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  limitedAccessSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  limitedAccessFooter: {
    marginTop: 32,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  limitedAccessFooterContent: {
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.15)',
  },
  limitedAccessFooterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  limitedAccessFooterText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  limitedAccessFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  limitedAccessFooterButtonText: {
    color: 'rgba(108, 99, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  limitedAccessFooterDivider: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  limitedAccessFooterAltText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  limitedAccessFooterAltButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  limitedAccessFooterAltButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
}); 