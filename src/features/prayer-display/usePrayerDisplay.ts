import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { 
  extractPeopleFromSnapshot, 
  cleanPrayerText,
  extractVerseReference,
  type InputSnapshot
} from '../../utils/prayerUtils';
import { PrayerSlideData, PrayerPerson } from './PrayerSlide';
import { usePraylock } from '../praylock/hooks/usePraylockSimple';

interface UsePrayerDisplayProps {
  prayer?: string;
  timeOfDay?: string;
  verse?: string;
  onBack?: () => void;
  isOnboarding?: boolean;
}

export const usePrayerDisplay = ({
  prayer: propPrayer,
  timeOfDay: propTimeOfDay,
  verse: propVerse,
  onBack,
  isOnboarding = false,
}: UsePrayerDisplayProps) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  // TODO: Implement mutations for prayer operations
  // PRAYLOCK hook
  const { markPrayerCompleted, settings: praylockSettings } = usePraylock();
  
  // State
  const [liked, setLiked] = useState(false);
  const [prayer] = useState(propPrayer || (params.prayer as string) || '');
  const [timeOfDay] = useState(propTimeOfDay || (params.slot as string) || 'evening');
  const [verse, setVerse] = useState(propVerse || (params.verse as string) || '');
  const [prayerPeople, setPrayerPeople] = useState<PrayerPerson[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slides, setSlides] = useState<PrayerSlideData[]>([]);
  const [inputSnapshot] = useState<InputSnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [prayerId, setPrayerId] = useState<string | null>(null);
  const [hasCompletedPrayer, setHasCompletedPrayer] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('large');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // Refs
  const flatListRef = useRef<any>(null);
  const confettiRef = useRef<any>(null);

  // Fetch prayer data including input_snapshot if we have a prayer ID
  useEffect(() => {
    const prayerIdParam = params.prayerId as string;
    if (prayerIdParam && user?.id && !isOnboarding) {
      setPrayerId(prayerIdParam);
      setIsLoadingSnapshot(true);
      
      // TODO: Implement loadPrayerById with React Query
      // loadPrayerById(prayerIdParam)
      //   .then((data) => {
      //     if (data) {
      //       setInputSnapshot(data.input_snapshot as InputSnapshot);
      //       setLiked(data.liked || false);
      //       if (data.completed_at) {
      //         setHasCompletedPrayer(true);
      //       }
      //       if (data.verse_ref && !verse) {
      //         setVerse(data.verse_ref);
      //       }
      //       if (data.content && !prayer) {
      //         setPrayer(data.content);
      //       }
      //     }
      //     setIsLoadingSnapshot(false);
      //   });
      setIsLoadingSnapshot(false); // Temporary while TODO is implemented
    } else {
      // If no prayerId, we're not loading snapshot
      setIsLoadingSnapshot(false);
    }
  }, [params.prayerId, user?.id, isOnboarding]);

  // Extract prayer people from input_snapshot
  useEffect(() => {
    if (inputSnapshot) {
      console.log('[PrayerDisplay] Input snapshot:', inputSnapshot);
      const people = extractPeopleFromSnapshot(inputSnapshot);
      const convertedPeople = people.map(p => ({
        id: p.id,
        name: p.name,
        image_uri: p.image_uri || undefined,
        relationship: p.relationship || undefined,
        gender: p.gender || undefined
      }));
      console.log('[PrayerDisplay] Extracted people:', convertedPeople);
      setPrayerPeople(convertedPeople);
      setIsLoadingPeople(false);
    }
  }, [inputSnapshot]);

  // Fetch prayer people from active intentions as fallback
  useEffect(() => {
    async function fetchPeople() {
      if (!user?.id) {
        setIsLoadingPeople(false);
        return;
      }
      
      // Skip if we already have people from inputSnapshot
      if (prayerPeople.length > 0) {
        console.log('[PrayerDisplay] Already have people from snapshot, skipping fetch');
        setIsLoadingPeople(false);
        return;
      }
      
      // If still loading snapshot, wait
      if (isLoadingSnapshot) {
        console.log('[PrayerDisplay] Still loading snapshot, waiting...');
        return;
      }
      
      // If we have a prayerId but no inputSnapshot after loading, fetch from intentions
      if ((prayerId && !inputSnapshot) || !prayerId) {
        console.log('[PrayerDisplay] Fetching from active intentions');
        setIsLoadingPeople(true);
        
        try {
          const { data, error } = await supabase
            .from('prayer_intentions')
            .select(`
              id,
              person_id,
              prayer_focus_people!inner(id, name, image_uri, relationship, gender)
            `)
            .eq('user_id', user.id)
            .eq('is_active', true);
            
          if (error) {
            console.error('[PrayerDisplay] Error fetching people:', error);
            setIsLoadingPeople(false);
            return;
          }
          
          console.log('[PrayerDisplay] Fetched intentions:', data);
          
          const uniquePeople: PrayerPerson[] = [];
          const seenIds = new Set<string>();
          
          for (const item of data || []) {
            const person = item?.prayer_focus_people as any;
            if (person && person.id && !seenIds.has(person.id)) {
              seenIds.add(person.id);
              uniquePeople.push({
                id: person.id,
                name: person.name || 'Friend',
                image_uri: person.image_uri,
                relationship: person.relationship,
                gender: person.gender
              });
            }
          }
          
          console.log('[PrayerDisplay] Unique people found:', uniquePeople);
          setPrayerPeople(uniquePeople);
        } catch (error) {
          console.error('Error fetching people:', error);
        } finally {
          setIsLoadingPeople(false);
        }
      }
    }
    
    fetchPeople();
  }, [user?.id, isLoadingSnapshot, inputSnapshot, prayerId, prayerPeople.length]);

  // Parse prayer into slides when loaded
  useEffect(() => {
    if (!prayer) return;
    
    const newSlides: PrayerSlideData[] = [];
    
    // Add intro slide
    newSlides.push({
      id: 'intro',
      type: 'intro',
      title: timeOfDay === 'morning' ? 'Your Morning Prayer' : "Tonight's Prayer",
      content: 'A moment of spiritual connection'
    });
    
    // Clean the prayer text
    const cleanedPrayer = cleanPrayerText(prayer);
    
    // If we don't have a verse yet, try to extract it
    if (!verse) {
      const extractedVerse = extractVerseReference(prayer);
      if (extractedVerse) {
        setVerse(extractedVerse);
      }
    }
    
    // Split prayer into logical segments
    const paragraphs = cleanedPrayer
      .split('\n\n')
      .filter(p => p.trim().length > 0);
    
    // Create a slide for each significant paragraph
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.length > 10) {
        newSlides.push({
          id: `prayer-${index}`,
          type: 'prayer',
          content: paragraph
        });
      }
    });
    
    // Add verse slide if available
    if (verse) {
      newSlides.push({
        id: 'verse',
        type: 'verse',
        content: verse,
        isLastPrayerSlide: true
      });
    } else if (newSlides.length > 1) {
      // Mark the last prayer slide
      for (let i = newSlides.length - 1; i >= 0; i--) {
        if (newSlides[i].type === 'prayer') {
          newSlides[i].isLastPrayerSlide = true;
          break;
        }
      }
    }
    
    // Add final slide
    newSlides.push({
      id: 'final',
      type: 'final',
      title: 'Share Your Prayer',
      content: 'Take a moment to reflect on these words or share this prayer with someone who needs it.'
    });
    
    setSlides(newSlides);
  }, [prayer, verse, timeOfDay]);

  const handleLike = async () => {
    if (prayerId) {
      // Optimistic update
      const newLikedState = !liked;
      setLiked(newLikedState);
      
      try {
        // TODO: Implement toggleLike mutation
        console.log('TODO: toggleLike for prayer:', prayerId);
      } catch (error) {
        console.error('Error updating like state:', error);
        // Revert optimistic update
        setLiked(!newLikedState);
      }
    }
  };

  const handleAmenPress = async () => {
    // Allow completing onboarding prayers even without a prayerId
    if ((!prayerId && !isOnboarding) || !user?.id || hasCompletedPrayer) return;
    
    setShowConfetti(true);
    setTimeout(() => {
      confettiRef.current?.start();
    }, 50);
    
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    
    setHasCompletedPrayer(true);
    
    // Advance to share slide
    setTimeout(() => {
      const shareIndex = slides.findIndex(slide => slide.type === 'final');
      if (shareIndex !== -1) {
        flatListRef.current?.scrollToIndex({
          animated: true,
          index: shareIndex,
        });
      }
    }, 1500);
    
    // Mark as completed in database and update stores (only if we have a prayerId)
    if (prayerId) {
      // TODO: Optimistic store update with React Query mutation
      const completedAt = new Date().toISOString();
      console.log('TODO: Update prayer completion for:', prayerId, completedAt);

      try {
        const { data } = await supabase.functions.invoke('complete-prayer', {
          body: { prayerId, userId: user.id }
        });
        
        // Unlock PRAYLOCK if it was active
        if (data?.prayerTimeOfDay && Platform.OS === 'ios' && praylockSettings?.enabled) {
          try {
            const period = data.prayerTimeOfDay === 'morning' ? 'morning' : 'evening';
            await markPrayerCompleted(period);
          } catch (error) {
            console.error('Error unlocking PRAYLOCK:', error);
          }
        }
      } catch (error) {
        console.error('Error marking prayer as completed:', error);
        // TODO: Revert optimistic update on failure when mutation is implemented
      }
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleDone = () => {
    console.log('Done button pressed');
    if (onBack) {
      onBack();
    } else {
      router.dismissAll();
    }
  };

  const handlePageChange = (index: number) => {
    setCurrentIndex(index);
  };

  return {
    // State
    liked,
    prayer,
    timeOfDay,
    verse,
    prayerPeople,
    currentIndex,
    slides,
    isLoadingPeople,
    prayerId,
    hasCompletedPrayer,
    fontSize,
    showShareModal,
    showConfetti,
    showOptionsMenu,
    
    // Refs
    flatListRef,
    confettiRef,
    
    // Actions
    setFontSize,
    setShowShareModal,
    setShowOptionsMenu,
    handleLike,
    handleAmenPress,
    handleBack,
    handleDone,
    handlePageChange,
  };
}; 