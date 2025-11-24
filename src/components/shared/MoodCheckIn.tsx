import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput, Keyboard } from 'react-native';

import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import MoodSelector from './MoodSelector';
import useResponsive from '../../hooks/useResponsive';


interface MoodCheckInProps {
  onMoodUpdated?: (mood: string) => void;
  onMoodContextUpdated?: (moodContext: string | null) => void;
  onMoodChangeRequested?: () => void;
  title?: string;
  subtitle?: string;
  requireNewSelection?: boolean;
  initialMood?: string;
  initialMoodContext?: string;
  verticalLayout?: boolean;
  forceExpanded?: boolean;
}

const MoodCheckIn: React.FC<MoodCheckInProps> = ({
  onMoodUpdated,
  onMoodContextUpdated,
  onMoodChangeRequested,
  title = "How are you feeling?",
  subtitle = "Your mood helps personalize your prayer experience",
  requireNewSelection = false,
  initialMood,
  initialMoodContext,
  verticalLayout = false,
  forceExpanded = false
}) => {
  const { user } = useAuth();
  const R = useResponsive();
  const [userMood, setUserMood] = useState<string>(initialMood || '');
  const [isCollapsed, setIsCollapsed] = useState(forceExpanded ? false : !!initialMood);

  const [note, setNote] = useState<string | null>(initialMoodContext || null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [tempNote, setTempNote] = useState('');
  const noteInputRef = useRef<TextInput>(null);
  
  // Track if a mood has been selected in this session
  const [hasSelectedMood, setHasSelectedMood] = useState(!!initialMood);
  
  // Update state when initial values change
  useEffect(() => {
    if (initialMood && initialMood !== userMood) {
      setUserMood(initialMood);
      setHasSelectedMood(true);
      setIsCollapsed(true);
    }
  }, [initialMood, userMood]);
  
  useEffect(() => {
    if (initialMoodContext !== undefined && initialMoodContext !== note) {
      setNote(initialMoodContext || null);
    }
  }, [initialMoodContext, note]);

  const fetchUserMood = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('mood, mood_context')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === '42703' && error.message?.includes('column profiles.mood does not exist')) {
          console.log('Note: mood column not yet available in profiles table. Migration needed.');

          return;
        }
        throw error;
      }
      
      if (data) {
        if (data.mood && !requireNewSelection) {
          // Only set mood and collapse if not requiring new selection
          setUserMood(data.mood);
          setIsCollapsed(true);
        }
        // Only fetch the note context if not requiring new selection
        if (data.mood_context && !requireNewSelection) {
          setNote(data.mood_context);
        }
      }
      
    } catch (error) {
      console.error('Error fetching user mood:', error);
    }
  }, [user?.id, requireNewSelection]);

  // Fetch current mood on mount
  useEffect(() => {
    if (user?.id) {
      fetchUserMood();
    }
  }, [user?.id, fetchUserMood]);

  const updateMood = async (mood: string) => {
    if (!user?.id) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const previousMood = userMood;
    
    setUserMood(mood);
    setHasSelectedMood(true); // Mark that user has selected a mood
    
    // Call callback FIRST so parent can update before we collapse
    onMoodUpdated?.(mood);
    
    // Then collapse after a tiny delay so parent state updates
    requestAnimationFrame(() => {
      setIsCollapsed(true);
    });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mood })
        .eq('id', user.id);

      if (error) {
        if (error.code === '42703' && error.message?.includes('column profiles.mood does not exist')) {
          console.log('Note: mood column not yet available in profiles table. Migration needed.');
          return;
        }
        throw error;
      }
      
    } catch (error) {
      console.error('Error updating mood:', error);
      Alert.alert('Error', 'Failed to update mood.');
      setUserMood(previousMood);
      setIsCollapsed(false);
      setHasSelectedMood(false);
    }
  };



  const getMoodPlaceholder = (): string => {
    switch (userMood) {
      case 'joyful':
        return `What's bringing you joy?`;
      case 'peaceful':
        return `What's giving you peace?`;
      case 'hopeful':
        return `What are you hoping for?`;
      case 'anxious':
        return `What's on your mind?`;
      case 'weary':
        return `What's weighing on you?`;
      case 'hurt':
        return `What's causing pain?`;
      case 'angry':
        return `What's making you angry?`;
      default:
        return `Share what's on your heart...`;
    }
  };

  const handleOpenNoteInput = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempNote(note || '');
    setShowNoteInput(true);
  };

  const handleCancelNote = () => {
    setTempNote('');
    setShowNoteInput(false);
    Keyboard.dismiss();
  };

  const handleSaveNote = async () => {
    if (!user?.id) return;
    
    const noteToSave = tempNote.trim();
    
    // Update local state immediately
    setNote(noteToSave || null);
    setShowNoteInput(false);
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Call callback immediately
    onMoodContextUpdated?.(noteToSave || null);
    
    // Save to database in background
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mood_context: noteToSave || null })
        .eq('id', user.id);

      if (error) {
        if (error.code === '42703' && error.message?.includes('column profiles.mood_context does not exist')) {
          console.log('Note: mood_context column not yet available in profiles table. Migration needed.');
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error saving mood context:', error);
      // Don't show alert for background save failure
    }
  };

  const handleNoteSubmit = () => {
    handleSaveNote();
  };

  // Don't block render while loading mood data
  // if (isLoading) {
  //   return null;
  // }

  const styles = createStyles(R);

  return (
    <View style={styles.container}>
      {title && title.length > 0 && <Text style={styles.title}>{title}</Text>}
      {subtitle && subtitle.length > 0 && <Text style={styles.subtitle}>{subtitle}</Text>}
      
      <MoodSelector
        userMood={userMood}
        isCollapsed={requireNewSelection ? (hasSelectedMood && isCollapsed) : isCollapsed}
        onUpdateMood={updateMood}
        onToggleCollapse={(collapsed) => {
          if (!collapsed && onMoodChangeRequested) {
            onMoodChangeRequested();
          } else {
            setIsCollapsed(collapsed);
          }
        }}
        showRefreshButton={true}
        verticalLayout={verticalLayout}
      />
        
        {/* Note section */}
        {userMood && isCollapsed && (hasSelectedMood || !requireNewSelection) && (
          <Animated.View 
            style={styles.noteSection}
            entering={FadeIn.duration(180)}
            layout={Layout.duration(200)}
          >
            {showNoteInput ? (
              <View style={styles.noteInputContainer}>
                <View style={styles.noteInputWrapper}>
                  <TextInput
                    ref={noteInputRef}
                    style={styles.noteInput}
                    placeholder={getMoodPlaceholder()}
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={tempNote}
                    onChangeText={setTempNote}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleNoteSubmit}
                    maxLength={160}
                    cursorColor="#FFFFFF"
                    selectionColor="#FFFFFF"
                  />
                </View>
                <View style={styles.noteInputActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={handleCancelNote}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSaveNote}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noteDisplayContainer}>
                {note ? (
                  <TouchableOpacity 
                    style={styles.notePill}
                    onPress={handleOpenNoteInput}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.notePillText}>
                      📝 {note.length > 25 ? note.substring(0, 25) + '…' : note}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.addNoteLink}
                    onPress={handleOpenNoteInput}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addNoteLinkText}>＋ add note (optional)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>
        )}
    </View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    marginVertical: 0,
  },
  gradient: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: R.font(28),
    fontFamily: 'SNPro-Black',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: R.font(14),
    fontFamily: 'SNPro-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: R.h(2), 
    lineHeight: R.lineHeight(18),
    letterSpacing: R.w(0.1),
  },
  noteSection: {
    minHeight: 32,
  },
  notePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-end', 
  },
  notePillText: {
    fontSize: R.font(16),
    fontFamily: 'SNPro-Medium',
    color: '#FFFFFF',
    lineHeight: R.lineHeight(22),
  },
  addNoteLink: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    alignSelf: 'flex-start', 
  },
  addNoteLinkText: {
    fontSize: R.font(16),
    fontFamily: 'SNPro-Medium',
    color: 'rgba(255, 255, 255, 0.60)',
  },
  noteDisplayContainer: {
   
  },
  noteInputContainer: {
    padding: 0, 
  },
  noteInputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', 
  },
  noteInput: {
    color: '#FFFFFF',
    fontSize: R.font(16),
    fontFamily: 'SNPro-Medium',
    padding: 14,
    height: 50,
  },
  noteInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', 
    marginTop: 12,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    fontSize: R.font(16),
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.70)',
  },
  saveButton: {
    backgroundColor: '#7C71E0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: R.font(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MoodCheckIn; 