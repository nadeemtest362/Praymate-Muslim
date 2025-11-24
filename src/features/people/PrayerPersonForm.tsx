import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '../../shared/ui';
import { RELATIONSHIP_CHIPS, RelationshipChipData } from '../../constants/prayerConstants';
import useResponsive from '../../hooks/useResponsive';

const customTransition = LinearTransition.springify()
  .damping(26)
  .mass(1.2)
  .stiffness(100);

export interface PrayerPersonFormData {
  name: string;
  relationship?: string;
  gender?: 'he' | 'she' | 'name';
  image_uri?: string;
  phoneNumber?: string;
  phoneNumberHash?: string;
  email?: string;
  deviceContactId?: string;
}

export interface PrayerPersonFormProps {
  initialData?: Partial<PrayerPersonFormData>;
  onSubmit: (data: PrayerPersonFormData) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  mode?: 'create' | 'edit';
  startWithName?: boolean;
}

type FormStep = 'relationship' | 'name' | 'pronoun';

export const PrayerPersonForm: React.FC<PrayerPersonFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save',
  mode = 'create',
  startWithName = false,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const [step, setStep] = useState<FormStep>(
    mode === 'edit' ? 'name' : (startWithName ? 'name' : 'relationship')
  );
  const [formData, setFormData] = useState<PrayerPersonFormData>({
    name: initialData.name || '',
    relationship: initialData.relationship || '',
    gender: initialData.gender,
    image_uri: initialData.image_uri,
    phoneNumber: initialData.phoneNumber,
    phoneNumberHash: initialData.phoneNumberHash,
    email: initialData.email,
    deviceContactId: initialData.deviceContactId,
  });
  const [localName, setLocalName] = useState(formData.name);
  const [localImageUri, setLocalImageUri] = useState(formData.image_uri);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setLocalName(formData.name);
  }, [formData.name]);

  const selectedRelationship = RELATIONSHIP_CHIPS.find(
    chip => chip.label === formData.relationship
  );

  const handleRelationshipSelect = (relationship: RelationshipChipData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Check if this relationship should bypass the pronoun step
    if (relationship.hidePronounStep && relationship.defaultGender) {
      // Set the gender automatically and submit
      const finalData = { 
        ...formData, 
        relationship: relationship.label,
        gender: relationship.defaultGender,
        image_uri: localImageUri 
      };
      setFormData(finalData);
      handleFinalSubmit(finalData);
    } else {
      // Otherwise, proceed to pronoun step
    setFormData(prev => ({ ...prev, relationship: relationship.label }));
    setStep('pronoun');
    }
  };

  const handleNameSubmit = () => {
    const trimmedName = localName.trim();
    if (trimmedName) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (isGroup) {
        // For groups, skip pronoun step and use full name
        const finalData = { 
          ...formData, 
          name: trimmedName, 
          image_uri: localImageUri,
          gender: 'name' as const
        };
        setFormData(finalData);
        setStep('relationship');
      } else {
        setFormData(prev => ({ ...prev, name: trimmedName, image_uri: localImageUri }));
        
        if (mode === 'edit') {
          // In edit mode, skip to pronoun selection if not already set
          if (!formData.gender) {
            setStep('pronoun');
          } else {
            // If gender is already set, submit the form
            handleFinalSubmit({ ...formData, name: trimmedName, image_uri: localImageUri });
          }
        } else {
          // In create mode, always go to relationship after name
          setStep('relationship');
        }
      }
    }
  };

  const handleGenderSelect = (gender: 'he' | 'she' | 'name') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const finalData = { ...formData, gender, image_uri: localImageUri };
    setFormData(finalData);
    handleFinalSubmit(finalData);
  };

  const handleFinalSubmit = async (data: PrayerPersonFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'name') {
      // If we started with name, cancel instead of going to relationship
      if (startWithName) {
        onCancel();
      } else {
        setStep('relationship');
      }
    } else if (step === 'pronoun') {
      // Go back to the previous step based on flow
      if (startWithName) {
        setStep('relationship');
      } else {
        setStep('name');
      }
    } else if (step === 'relationship' && startWithName) {
      // If we're on relationship and started with name, go back to name
      setStep('name');
    }
  };

  const handleImagePick = async () => {
    try {
      // Set flag to prevent auto-focus during picker
      setIsPickingImage(true);
      
      // Dismiss keyboard before opening picker
      Keyboard.dismiss();
      
      // Check permissions first, then request if needed
      const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      let permissionResult = currentPermission;
      
      if (!currentPermission.granted) {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert(
            'Permission needed',
            'Please allow access to your photos to add a profile picture.',
            [{ text: 'OK' }]
          );
          setIsPickingImage(false);
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setLocalImageUri(uri);
        setFormData(prev => ({ ...prev, image_uri: uri }));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Always restore keyboard focus after picker dismisses
      setTimeout(() => {
        setIsPickingImage(false);
        // Re-focus the input after picker closes
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 300);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setIsPickingImage(false);
    }
  };

  const hasName = !!(localName || formData.name);
  
  const renderRelationshipStep = () => {
    // Filter relationships based on Person/Group selection
    const groupRelationships = RELATIONSHIP_CHIPS.filter(chip => 
      ['church', 'community', 'country', 'those_suffering', 'family_group', 'team', 'school', 'workplace', 'other_group'].includes(chip.id)
    );
    
    const personalRelationships = RELATIONSHIP_CHIPS.filter(chip => 
      !['church', 'community', 'country', 'those_suffering', 'family_group', 'team', 'school', 'workplace', 'other_group'].includes(chip.id)
    );
    
    // Show appropriate relationships based on Person/Group toggle
    const filteredChips = isGroup ? groupRelationships : personalRelationships;

    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        layout={customTransition}
        style={styles.stepContainer}
      >

        
        <ScrollView 
          style={styles.chipsScrollView}
          contentContainerStyle={styles.chipsContainer}
          showsVerticalScrollIndicator={false}
        >
          {filteredChips.map(chip => (
            <TouchableOpacity
              key={chip.id}
              style={[
                styles.chip,
                selectedRelationship?.id === chip.id && styles.selectedChip
              ]}
              onPress={() => handleRelationshipSelect(chip)}
              disabled={isSubmitting}
            >
              <Text style={styles.chipEmoji}>{chip.emoji}</Text>
              <Text 
                style={[
                  styles.chipLabel,
                  selectedRelationship?.id === chip.id && styles.selectedChipLabel
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderNameStep = () => (
    <Animated.View 
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      layout={customTransition}
      style={styles.nameStepContainer}
    >

      
      {/* Avatar upload for manual entry only */}
      {startWithName && (
        <TouchableOpacity 
          style={styles.avatarUploadContainer}
          onPress={handleImagePick}
          disabled={isSubmitting}
        >
          {localImageUri ? (
            <View style={{ alignItems: 'center' }}>
              <Avatar size={R.w(18)} image_uri={localImageUri} name={localName} />
              <TouchableOpacity 
                style={styles.changePhotoButton}
                onPress={handleImagePick}
              >
                <Text style={styles.changePhotoText}>Change photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={R.font(24)} color="rgba(255, 255, 255, 0.5)" />
              </View>
              <Text style={styles.avatarUploadText}>Add photo</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      
      {/* Show avatar for contact selection (non-editable) */}
      {!startWithName && formData.image_uri && (
        <View style={styles.avatarContainer}>
          <Avatar size={R.w(18)} image_uri={formData.image_uri} name={localName || formData.name} />
        </View>
      )}
      
      <View style={styles.nameInputContainer}>
        <TextInput
          ref={nameInputRef}
          style={styles.nameInput}
          value={localName}
          onChangeText={setLocalName}
          placeholder="Enter their name..."
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          autoFocus={!initialData.name && !isPickingImage}
          onSubmitEditing={handleNameSubmit}
          returnKeyType="done"
          cursorColor="#FFFFFF"
          selectionColor="#FFFFFF"
          editable={!isSubmitting}
        />
      </View>
      
      {/* Person/Group Toggle */}
      <View style={styles.typeToggleContainer}>
        <TouchableOpacity
          style={[styles.typeToggle, !isGroup && styles.typeToggleActive]}
          onPress={() => setIsGroup(false)}
          disabled={isSubmitting}
        >
          <Text style={styles.typeToggleEmoji}>👤</Text>
          <Text style={[styles.typeToggleText, !isGroup && styles.typeToggleTextActive]}>
            Person
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.typeToggle, isGroup && styles.typeToggleActive]}
          onPress={() => setIsGroup(true)}
          disabled={isSubmitting}
        >
          <Text style={styles.typeToggleEmoji}>👥</Text>
          <Text style={[styles.typeToggleText, isGroup && styles.typeToggleTextActive]}>
            Group
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[
          styles.continueButton,
          (!localName.trim() || isSubmitting) && styles.disabledButton
        ]}
        onPress={handleNameSubmit}
        disabled={!localName.trim() || isSubmitting}
      >
        <Text style={styles.continueButtonText}>
          {isSubmitting ? 'Saving...' : (mode === 'edit' && formData.gender ? submitLabel : 'Continue')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPronounStep = () => (
    <Animated.View 
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      layout={customTransition}
      style={styles.pronounStepContainer}
    >
      <View style={styles.pronounOptionsContainer}>
        {[
          { value: 'he' as const, emoji: '👨', label: 'Him', subtitle: `"Lord, please bless him..."` },
          { value: 'she' as const, emoji: '👩', label: 'Her', subtitle: `"Lord, please bless her..."` },
          { value: 'name' as const, emoji: '✨', label: 'Just name', subtitle: `"Lord, please bless ${(localName || formData.name)?.split(' ')[0]}..."` },
        ].map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pronounOption,
              formData.gender === option.value && styles.selectedPronounOption,
              isSubmitting && styles.disabledButton
            ]}
            onPress={() => handleGenderSelect(option.value)}
            disabled={isSubmitting}
          >
            <View style={styles.pronounOptionContent}>
              <Text style={styles.pronounOptionEmoji}>{option.emoji}</Text>
              <View style={styles.pronounOptionTextContainer}>
                <Text style={[
                  styles.pronounOptionLabel,
                  formData.gender === option.value && styles.selectedPronounOptionLabel
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.pronounOptionSubtitle,
                  formData.gender === option.value && styles.selectedPronounOptionSubtitle
                ]}>
                  {option.subtitle}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={
            step === 'relationship' && !startWithName || 
            (mode === 'edit' && step === 'name') || 
            (step === 'name' && startWithName) 
              ? onCancel 
              : handleBack
          }
          disabled={isSubmitting}
        >
          <Ionicons name="chevron-back" size={R.font(20)} color="gray" />
        </TouchableOpacity>
        {(step === 'name' || step === 'relationship' || step === 'pronoun') && (
          <Text style={styles.headerTitle}>
            {step === 'pronoun' 
              ? `Refer to ${localName || formData.name} as...`
              : step === 'name' && startWithName
              ? "Who would you like to pray for?"
              : hasName ? (
                  <>
                    Who is <Text style={styles.highlightedName}>{localName || formData.name}</Text> to you?
                  </>
                ) : (
                  "Who are you praying for?"
                )
            }
          </Text>
        )}
        <View style={styles.headerRight} />
      </View>

      <View style={styles.contentContainer}>
        {step === 'relationship' && renderRelationshipStep()}
        {step === 'name' && renderNameStep()}
        {step === 'pronoun' && renderPronounStep()}
      </View>
    </View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    paddingHorizontal: R.w(4),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: R.h(1),
    marginBottom: R.h(1),
  },
  headerTitle: {
    fontSize: R.font(28),
    fontFamily: "SNPro-Black",
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: R.w(2),
  },
  contentContainer: {
  },
  backButton: {
    width: R.w(10),
    height: R.w(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: R.w(10),
  },
  stepContainer: {
    alignItems: 'center',
    paddingBottom: R.h(2),
  },
  pronounStepContainer: {
    alignItems: 'center',
    paddingTop: R.h(1.5),
    paddingBottom: R.h(2),
    paddingHorizontal: R.w(2),
  },
  nameStepContainer: {
    alignItems: 'center',
    paddingTop: R.h(1.5),
    paddingBottom: R.h(2),
  },
  stepTitle: {
    fontSize: R.font(20),
    fontFamily: "SNPro-Black",
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: R.h(2),
    paddingHorizontal: R.w(4),
  },
  nameInputContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(3),
    marginBottom: R.h(1.5),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  chipsScrollView: {
    maxHeight: R.h(50),
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: R.w(1),
    paddingBottom: R.h(2),
    paddingTop: R.h(0.5),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(4.5),
    paddingVertical: R.h(1),
    paddingHorizontal: R.w(4),
    marginRight: R.w(2),
    marginBottom: R.h(1),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  selectedChip: {
    backgroundColor: 'rgba(108, 99, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  chipEmoji: {
    fontSize: R.font(16),
    marginRight: R.w(1.5),
  },
  chipLabel: {
    color: '#FFFFFF',
    fontSize: R.font(14),
    fontWeight: '500',
  },
  selectedChipLabel: {
    fontWeight: '600',
  },
  avatarContainer: {
    marginBottom: R.h(2),
  },
  avatarUploadContainer: {
    alignItems: 'center',
    marginBottom: R.h(2),
  },
  avatarPlaceholder: {
    width: R.w(18),
    height: R.w(18),
    borderRadius: R.w(9),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: R.h(1),
  },
  avatarUploadText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: R.font(14),
    fontWeight: '500',
  },
  changePhotoButton: {
    marginTop: R.h(1),
  },
  changePhotoText: {
    color: '#6C63FF',
    fontSize: R.font(14),
    fontWeight: '500',
    textAlign: 'center',
  },
  nameInput: {
    color: '#FFFFFF',
    fontSize: R.font(16),
    fontWeight: '400',
    padding: R.w(4),
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: 'rgba(254, 202, 57, 0.98)',
   
    width: '80%',
    borderRadius: R.w(4),
    paddingVertical: R.h(2),
    paddingHorizontal: R.w(4),
   
    alignSelf: 'center',
  },
  disabledButton: {
    opacity: 0.4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: R.font(20),
    fontFamily: "SNPro-Black",
    textAlign: 'center',
  },
  pronounOptionsContainer: {
    width: '100%',
    gap: R.h(1.5),
  },
  pronounOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: R.w(4),
    paddingVertical: R.h(1.8),
    paddingHorizontal: R.w(5),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectedPronounOption: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  pronounOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pronounOptionEmoji: {
    fontSize: R.font(18),
    marginRight: R.w(3.5),
  },
  pronounOptionTextContainer: {
    flex: 1,
  },
  pronounOptionLabel: {
    color: '#FFFFFF',
    fontSize: R.font(15),
    fontWeight: '600',
    marginBottom: R.h(0.5),
  },
  selectedPronounOptionLabel: {
    fontWeight: '700',
  },
  pronounOptionSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: R.font(12),
    fontWeight: '400',
    fontStyle: 'italic',
  },
  selectedPronounOptionSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  highlightedName: {
    color: '#FFD700',
    fontWeight: '800',
  },
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(108, 99, 255, 0.3)',
    borderRadius: R.w(8),
    padding: R.w(0.5),
    marginBottom: R.h(2),
    width: '90%',
  },
  typeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: R.h(1.5),
    paddingHorizontal: R.w(2),
    borderRadius: R.w(8),
  },
  typeToggleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeToggleEmoji: {
    fontSize: R.font(14),
    marginRight: R.w(1),
  },
  typeToggleText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: R.font(16),
    fontFamily: "SNPro-Black",
  },
  typeToggleTextActive: {
    color: '#FFFFFF',
    fontFamily: "SNPro-Black",
  },
}); 