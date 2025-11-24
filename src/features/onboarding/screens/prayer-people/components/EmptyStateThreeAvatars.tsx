import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useResponsive from '../../../../../hooks/useResponsive';
import { PrayerFocusPerson } from '../../../../../stores/onboardingStore';

interface EmptyStateThreeAvatarsProps {
  onPress: () => void;
  onRemove?: (id: string) => void;
  people?: PrayerFocusPerson[];
  isLoading?: boolean;
  text?: string;
}

export const EmptyStateThreeAvatars: React.FC<EmptyStateThreeAvatarsProps> = ({ 
  onPress,
  onRemove,
  people = [],
  isLoading = false,
  text = "tap to add your first person" 
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);
  const slots = [0, 1, 2];

  return (
    <View style={styles.emptyState}>
      <View style={styles.avatarsRow}>
        {slots.map((index) => {
          const person = people[index];
          
          if (person) {
            return (
              <View key={person.id} style={styles.slot}>
                {onRemove && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => !isLoading && onRemove(person.id)}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="close-circle" size={R.w(6)} color="#FF4444" />
                  </TouchableOpacity>
                )}
                
                {person.image_uri ? (
                  <Image 
                    source={{ uri: person.image_uri }} 
                    style={styles.filledAvatar}
                  />
                ) : (
                  <View style={styles.placeholderAvatar}>
                    <MaterialCommunityIcons 
                      name="account" 
                      size={R.w(12)} 
                      color="#6B5DD8" 
                    />
                  </View>
                )}
                
                <Text style={styles.personName} numberOfLines={1}>
                  {person.name}
                </Text>
              </View>
            );
          }
          
          return (
            <TouchableOpacity 
              key={`empty-${index}`}
              style={styles.slot}
              activeOpacity={0.7}
              onPress={onPress}
            >
              <View style={styles.emptyAvatar}>
                <MaterialCommunityIcons 
                  name="account-plus" 
                  size={R.w(8)} 
                  color="rgba(255, 255, 255, 0.6)" 
                />
              </View>
              <Text style={styles.emptySlotText}>Add</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {people.length === 0 && (
        <>
          <Text style={styles.emptyStateText}>{text}</Text>
        
        </>
      )}
    </View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: R.h(8),
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: R.w(8),
    marginBottom: R.h(4),
    paddingHorizontal: R.w(4),
  },
  slot: {
    alignItems: 'center',
    width: R.w(20),
  },
  removeButton: {
    position: 'absolute',
    top: -R.h(0.5),
    right: -R.w(2),
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: R.w(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  filledAvatar: {
    width: R.w(20),
    height: R.w(20),
    borderRadius: R.w(10),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  placeholderAvatar: {
    width: R.w(20),
    height: R.w(20),
    borderRadius: R.w(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  emptyAvatar: {
    width: R.w(20),
    height: R.w(20),
    borderRadius: R.w(10),
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: {
    color: '#FFFFFF',
    fontSize: R.font(24),
    fontFamily: 'SNPro-Heavy',
    textAlign: 'center',
    marginTop: R.h(1),
    letterSpacing: -0.5,
  },
  emptySlotText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: R.font(14),
    fontFamily: 'SNPro-Regular',
    textAlign: 'center',
    marginTop: R.h(1),
  },
  emptyStateText: {
    color: '#FFFFFF',
    paddingTop: R.h(10),
    fontSize: R.font(36),
    textAlign: 'center',
    fontFamily: 'SNPro-Heavy',
    marginBottom: R.h(1),
    paddingHorizontal: R.w(8),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: R.font(17),
    textAlign: 'center',
    fontFamily: 'SNPro-Regular',
    fontStyle: 'italic',
    paddingHorizontal: R.w(8),
  },
});
