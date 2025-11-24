import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Avatar } from '../../shared/ui';
import { PersonWithoutIntention } from './types';
import useResponsive from '../../hooks/useResponsive';

interface PeopleWithoutIntentionsProps {
  people: PersonWithoutIntention[];
  onAddIntention: (personId: string) => void;
}

export const PeopleWithoutIntentions: React.FC<PeopleWithoutIntentionsProps> = ({
  people,
  onAddIntention,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  if (people.length === 0) return null;

  return (
    <Animated.View 
      entering={FadeIn.delay(50).duration(200)}
      style={styles.container}
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeader}>More people to pray for</Text>
        <Ionicons name="heart-outline" size={R.font(20)} color="rgba(108, 99, 255, 0.6)" />
      </View>
      <Text style={styles.sectionSubtext}>Add intentions to include them in your prayers</Text>
      <View style={styles.peopleList}>
        {people.map((person, index) => (
          <Animated.View
          key={person.id}
          entering={FadeInDown.delay(100 + index * 30).duration(200)}
          >
            <TouchableOpacity
              style={styles.personItem}
              onPress={() => {
                onAddIntention(person.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Avatar size={R.w(8)} image_uri={person.image_uri} name={person.name} />
              <Text style={styles.personName}>{person.name}</Text>
              <View style={styles.addIcon}>
                <Ionicons name="add-circle-outline" size={R.font(20)} color="rgba(255, 255, 255, 0.6)" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    marginTop: R.h(4),
    marginBottom: R.h(3),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: R.h(0.75),
  },
  sectionHeader: {
    fontSize: R.font(22),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sectionSubtext: {
    fontSize: R.font(14),
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: R.h(2),
    fontWeight: '500',
  },
  peopleList: {
    gap: R.h(1),
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: R.w(3),
    paddingVertical: R.h(1.25),
    paddingHorizontal: R.w(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  personName: {
    flex: 1,
    marginLeft: R.w(2.5),
    fontSize: R.font(15),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  addIcon: {
    padding: R.w(1),
  },
}); 