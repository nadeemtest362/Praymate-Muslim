import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Avatar } from '../../shared/ui';
import { MadlibSentenceProps } from './types';
import useResponsive from '../../hooks/useResponsive';

// Configure iOS-like transitions
const customTransition = LinearTransition.springify()
  .damping(26)
  .mass(1.2)
  .stiffness(100);

export const MadlibSentence: React.FC<MadlibSentenceProps> = ({
  isForSelf,
  selectedPerson,
  selectedNeedId,
  currentCategory,
  onPersonClick,
  onNeedClick,
  isPersonLocked,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  
  const hasEmojiName = selectedPerson && /\p{Emoji}/u.test(Array.from(selectedPerson.name.trim())[0] || '');
  
  // Extract display name - first name for individuals, full name for groups
  const getDisplayName = (person: any, fullName: string) => {
    if (!fullName) return '';
    
    // If it starts with an emoji, return as is
    if (/\p{Emoji}/u.test(Array.from(fullName.trim())[0] || '')) {
      return fullName;
    }
    
    // If this is a group (gender is 'name'), show full name
    if (person?.gender === 'name') {
      return fullName;
    }
    
    // For individuals, split by spaces and get the first part
    const parts = fullName.trim().split(' ');
    return parts[0] || fullName;
  };

  return (
    <Animated.View
      entering={FadeIn.delay(200).duration(600)}
      style={styles.madlibContainer}
      layout={customTransition}
    >
      {/* Who Component */}
      <TouchableOpacity 
        style={[
          styles.madlibPill,
          isPersonLocked && styles.lockedPill
        ]} 
        onPress={onPersonClick}
        activeOpacity={isPersonLocked ? 1 : 0.7}
        disabled={isPersonLocked}
      >
        {isForSelf ? (
          <>
            <Ionicons name="person-outline" size={R.font(16)} color="white" style={{marginRight: R.w(1.5)}} />
            <Text style={styles.pillText}>I</Text>
          </>
        ) : selectedPerson ? (
          <>
            {!hasEmojiName && (
              <Avatar size={R.w(4.5)} image_uri={selectedPerson.image_uri} name={selectedPerson.name} />
            )}
            <Text style={[
              styles.pillText, 
              { marginLeft: hasEmojiName ? 0 : R.w(1.5) }
            ]}>
              {getDisplayName(selectedPerson, selectedPerson.name)}
            </Text>
          </>
        ) : (
          <Text style={styles.emptyPillText}>who...</Text> 
        )}
      </TouchableOpacity>
      
      <Text style={styles.madlibText}>
        {isForSelf ? "need" : "needs"}
      </Text>
      
      {/* What Component */}
      <TouchableOpacity 
        style={styles.madlibPill} 
        onPress={onNeedClick}
        activeOpacity={0.7}
      >
        {currentCategory ? (
          <>
            <Text style={styles.pillEmoji}>{currentCategory.emoji}</Text>
            <Text style={styles.pillText}>{currentCategory.label}</Text>
          </>
        ) : (
          <Text style={styles.emptyPillText}>what...</Text> 
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  madlibContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: R.h(0.5),
    paddingHorizontal: R.w(3),
  
  },
  madlibText: {
    fontSize: R.font(22),
    fontFamily: "SNPro-Bold",
    color: '#FFFFFF',
    marginHorizontal: R.w(2),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  madlibPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 9999,
    paddingHorizontal: R.w(2.5),
    paddingVertical: R.h(1),
    marginVertical: R.h(0.5),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  lockedPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
    opacity: 0.8,
  },
  pillEmoji: {
    fontSize: R.font(20),
    marginRight: R.w(1.5),
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: R.font(20),
    fontFamily: "SNPro-Heavy",
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyPillText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: R.font(20),
    fontWeight: '600',
    fontStyle: 'italic',
  },
}); 