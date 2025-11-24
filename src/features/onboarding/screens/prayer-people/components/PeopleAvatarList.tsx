import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useResponsive from '../../../../../hooks/useResponsive';
import { PrayerFocusPerson } from '../../../../../stores/onboardingStore';

interface PeopleAvatarListProps {
  people: PrayerFocusPerson[];
  onRemove: (id: string) => void;
  onAdd?: () => void;
  isLoading?: boolean;
  isFull?: boolean;
}

export const PeopleAvatarList: React.FC<PeopleAvatarListProps> = ({ 
  people, 
  onRemove,
  onAdd,
  isLoading = false,
  isFull = false
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.selectedPeopleContainer}
      bounces={false}
    >
      {people.map((person) => (
        <View key={person.id} style={styles.selectedPersonContainer}>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => !isLoading && onRemove(person.id)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close-circle" size={R.w(6)} color="#FF4444" />
          </TouchableOpacity>
          
          <View style={styles.avatarContainer}>
            {person.image_uri ? (
              <Image 
                source={{ uri: person.image_uri }} 
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <MaterialCommunityIcons 
                  name="account" 
                  size={R.w(12)} 
                  color="rgba(255, 255, 255, 0.5)" 
                />
              </View>
            )}
          </View>
          
          <Text 
            style={styles.personName} 
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {person.name}
          </Text>
          
          {person.relationship && (
            <Text 
              style={styles.personRelationship}
              numberOfLines={1}
            >
              {person.relationship}
            </Text>
          )}
        </View>
      ))}
      
      {/* Add Person Button */}
      {!isFull && onAdd && (
        <View style={styles.selectedPersonContainer}>
          <TouchableOpacity
            style={[styles.avatar, styles.addAvatar]}
            onPress={onAdd}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="plus" 
              size={R.w(8)} 
              color="rgba(255, 255, 255, 0.8)" 
            />
          </TouchableOpacity>
          
          <Text style={styles.addText}>Add Person</Text>
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  selectedPeopleContainer: {
    paddingHorizontal: R.w(5),
    paddingVertical: R.h(1),
  },
  selectedPersonContainer: {
    alignItems: 'center',
    marginHorizontal: R.w(3),
    width: R.w(20),
  },
  removeButton: {
    position: 'absolute',
    top: -R.h(0.5),
    right: -R.w(1),
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: R.w(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  avatarContainer: {
    marginBottom: R.h(1),
  },
  avatar: {
    width: R.w(18),
    height: R.w(18),
    borderRadius: R.w(9),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: {
    color: '#FFFFFF',
    fontSize: R.font(14),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: R.h(0.3),
  },
  personRelationship: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: R.font(12),
    fontStyle: 'italic',
    textAlign: 'center',
  },
  addAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: '#FFFFFF',
    fontSize: R.font(14),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: R.h(0.3),
  },
}); 