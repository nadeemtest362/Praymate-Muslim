import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Avatar } from '../../shared/ui';
import { PersonSelectorProps } from './types';

const customTransition = LinearTransition.springify()
  .damping(26)
  .mass(1.2)
  .stiffness(100);

export const PersonSelector: React.FC<PersonSelectorProps> = ({
  isForSelf,
  selectedPerson,
  prayerPeople,
  isLoading,
  onSelectSelf,
  onSelectPerson,
  onAddPerson,
}) => {
  return (
    <Animated.View 
      style={styles.selectorContainer}
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(200)}
      layout={customTransition}
    >
      <View style={styles.peopleRowContainer}> 
        {/* "Me" Button */}
        <TouchableOpacity 
          style={[styles.personButton, isForSelf && styles.selectedPersonButton]} 
          onPress={onSelectSelf}
        >
          <Ionicons name="person-outline" size={30} color="white" />
          <Text style={styles.personName}>Me</Text>
        </TouchableOpacity>

        {/* Horizontal ScrollView for people */} 
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" style={{marginLeft: 20}} />
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.peopleScrollContainer}
          >
            {prayerPeople.map(person => {
              const hasEmojiName = /\p{Emoji}/u.test(Array.from(person.name.trim())[0] || '');
              const isSelected = !isForSelf && selectedPerson?.id === person.id;
              
              return (
                <TouchableOpacity 
                  key={person.id} 
                  style={[
                    styles.personButton, 
                    isSelected && styles.selectedPersonButton
                  ]} 
                  onPress={() => onSelectPerson(person)}
                >
                  {!hasEmojiName && (
                    <Avatar size={40} image_uri={person.image_uri} name={person.name} />
                  )}
                  {hasEmojiName && (
                    <Text style={styles.personEmojiDisplay}>
                      {Array.from(person.name.trim())[0]}
                    </Text>
                  )}
                  <Text style={styles.personName}>{person.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
      
      {/* Add Person Button */} 
      {!isLoading && (
        <TouchableOpacity
          style={styles.addPersonButton}
          onPress={onAddPerson}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addPersonText}>Add someone</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  selectorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  peopleRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  peopleScrollContainer: {
    paddingLeft: 12,
    alignItems: 'center',
  },
  personButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 90,
    height: 90,
    justifyContent: 'center',
  },
  selectedPersonButton: {
    backgroundColor: 'rgba(108, 99, 255, 0.3)',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  personName: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  personEmojiDisplay: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 4,
  },
  addPersonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
  },
  addPersonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500',
  },
}); 