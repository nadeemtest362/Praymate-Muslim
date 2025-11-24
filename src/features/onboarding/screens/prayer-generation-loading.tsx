import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  withRepeat,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { useOnboardingStore } from '../../../stores/onboardingStore';
import { Avatar } from '../../../shared/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { PRAYER_TOPICS, PrayerTopicId } from '../../../constants/prayerConstants';
import useResponsive from '../../../hooks/useResponsive';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

const morningEmoji = require('../../../../assets/images/morning1.png');
const eveningEmoji = require('../../../../assets/images/evening1.png');

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  glowBackground: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: R.w(76),
    height: R.w(76),
    marginLeft: -R.w(38),
    marginTop: -R.w(38),
    borderRadius: R.w(38),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ scale: 3 }],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: R.w(6),
  },
  progressContainer: {
    width: '100%',
    marginBottom: R.h(1.5),
    position: 'relative',
  },
  progressBackground: {
    height: R.h(2),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  stageIndicator: {
    flexDirection: 'row',
    gap: R.w(3),
    marginBottom: R.h(5),
  },
  stageDot: {
    width: R.w(2),
    height: R.w(2),
    borderRadius: R.w(1),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stageDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  stageDotCurrent: {
    backgroundColor: '#FFD700',
    transform: [{ scale: 1.5 }],
  },
  stageContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  
  },
  stageContentWrapper: {
    flex: 1,
    width: '100%',
    paddingBottom: R.h(5),
  },
  stageHeader: {
    alignItems: 'center',
    marginBottom: R.h(1),
  },
  stageTitle: {
    fontSize: R.font(32),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: R.h(1),
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  inlineEmojiImage: {
    width: R.font(24),
    height: R.font(24),
    marginRight: R.w(0.5),
  },
  stageSubtitle: {
    fontSize: R.font(18),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontFamily: 'SNPro-SemiBold',
    lineHeight: R.font(24),
    paddingHorizontal: R.w(4),
  
  },
  stageContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  
  },
  // Profile stage styles
  profileIconContainer: {
    marginBottom: R.h(4),
  },
  profileEmoji: {
    fontSize: R.font(64),
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  profileDetails: {
    gap: R.h(2.5),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.w(3),
  },
  detailText: {
    fontSize: R.font(16),
    color: '#FFFFFF',
    fontFamily: 'SNPro-SemiBold',
  },
  // People stage styles
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  personCard: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  personCardName: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
    fontFamily: 'SNPro-Heavy',
  },
  peopleCount: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  // Plan stage styles
  planVisual: {
    alignItems: 'center',
    gap: 32,
  },
  planCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 3,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planNumber: {
    fontSize: 48,
    fontFamily: 'SNPro-Heavy',
    color: '#FFD700',
  },
  planLabel: {
    fontSize: 16,
    color: '#FFD700',
    fontFamily: 'SNPro-SemiBold',
  },
  planDetails: {
    gap: 16,
  },
  planDetailText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Prayer stage styles
  prayerPreview: {
    width: '100%',
    marginBottom: 24,
  },
  prayerBlur: {
    padding: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  prayerPreviewText: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 28,
    fontStyle: 'italic',
  },
  prayerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  prayerNote: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Stage progress
  stageProgressContainer: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stageProgressText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: R.insets.bottom + R.h(2),
    gap: R.h(1),
   
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    
  },
  logoText: {
    fontSize: R.font(20),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textTransform: 'lowercase',
  },
  logoAccent: {
    fontSize: R.font(20),
    fontFamily: 'SNPro-Heavy',
    color: '#7DD3FC',
    letterSpacing: -0.5,
    textTransform: 'lowercase',
  },
  footerSubtitle: {
    fontSize: R.font(18),
    color: '#FFFFFF',
    fontFamily: 'SNPro-Bold',
    textAlign: 'center',
    marginBottom: R.h(2),
 
  },
  // Faith foundation styles
  foundationVisual: {
    alignItems: 'center',
    gap: R.h(3),
  },
  faithSymbol: {
    width: R.w(25),
    height: R.w(25),
    borderRadius: R.w(12.5),
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faithEmoji: {
    fontSize: R.font(48),
  },
  stageImage: {
    width: R.w(85),
    height: R.h(60),

  },
  foundationText: {
    fontSize: R.font(24),
    color: '#FFFFFF',
    fontFamily: 'SNPro-Heavy',
    textAlign: 'center',
  },
  foundationPillars: {
    flexDirection: 'row',
    gap: R.w(8),
  },
  pillar: {
    alignItems: 'center',
    gap: R.h(1),
  },
  pillarEmoji: {
    fontSize: R.font(26),
  },
  pillarText: {
    fontSize: R.font(12),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  // Schedule styles
  scheduleVisual: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: R.w(4),
    marginBottom: R.h(3),
  },
  timeSlot: {
    alignItems: 'center',
    padding: R.w(4),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(4),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: R.w(25),
  },
  timeEmoji: {
    fontSize: R.font(28),
    marginBottom: R.h(1),
  },
  timeText: {
    fontSize: R.font(12),
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  scheduleText: {
    fontSize: R.font(16),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  // Heart connections styles  
  sectionTitle: {
    fontSize: R.font(18),
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: R.h(3),
  },
  peopleList: {
    gap: R.h(2),
    width: '100%',
  },
  heartPersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(4),
    padding: R.w(3),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heartPersonInfo: {
    marginLeft: R.w(3),
    flex: 1,
  },
  heartPersonName: {
    fontSize: R.font(14),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heartPrayerCategory: {
    fontSize: R.font(12),
    color: '#7DD3FC',
    fontWeight: '500',
    marginTop: R.h(0.5),
  },
  prayerTopicPill: {
    backgroundColor: 'rgba(125, 211, 252, 0.2)',
    borderRadius: R.w(3),
    paddingHorizontal: R.w(2.5),
    paddingVertical: R.h(0.4),
    marginTop: R.h(0.7),
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.4)',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.w(1.5),
  },
  prayerTopicEmoji: {
    fontSize: R.font(12),
  },
  prayerTopicText: {
    fontSize: R.font(10),
    color: '#7DD3FC',
    fontWeight: '600',
    textAlign: 'center',
  },
  prayerInclusionBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(5),
    paddingHorizontal: R.w(2),
    paddingVertical: R.h(1),
    marginLeft: R.w(3),
  },
  prayerInclusionEmoji: {
    fontSize: R.font(14),
  },
  prayerInclusionText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Growth styles
  growthVisual: {
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  growthArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  growthIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  growthEmoji: {
    fontSize: 26,
  },
  growthText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // New growth needs grid styles
  growthNeedsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: R.w(3),
    marginBottom: R.h(1),
    width: '100%',
  },
  growthNeedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(125, 211, 252, 0.2)',
    borderRadius: R.w(5),
    paddingHorizontal: R.w(4),
    paddingVertical: R.h(1.2),
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: R.w(2),
    maxWidth: '48%',
  },
  customGrowthPill: {
    backgroundColor: 'rgba(125, 211, 252, 0.15)',
    borderColor: 'rgba(125, 211, 252, 0.3)',
    maxWidth: '100%',
  },
  growthNeedEmoji: {
    fontSize: R.font(16),
  },
  growthNeedText: {
    fontSize: R.font(12),
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  growthNote: {
    fontSize: R.font(14),
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Commitment styles
  commitmentVisual: {
    alignItems: 'center',
    gap: R.h(3),
    width: '100%',
  },
  commitmentTitle: {
    fontSize: R.font(18),
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: R.h(2),
  },
  journeyPath: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: R.w(2.5),
    marginBottom: R.h(2),
    paddingHorizontal: R.w(3),
    width: '100%',
  },
  pathStep: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: R.w(3),
    padding: R.w(2.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: R.w(16),
    minHeight: R.h(7),
  },
  pathEmoji: {
    fontSize: R.font(18),
    marginBottom: R.h(0.5),
  },
  pathText: {
    fontSize: R.font(10),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  journeyDescription: {
    fontSize: R.font(16),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: R.h(2.5),
  },
  commitmentBenefits: {
    flexDirection: 'row',
    gap: R.w(8),
  },
  // Complete experience styles
  completeVisual: {
    alignItems: 'center',
    gap: 24,
  },
  completeEmoji: {
    fontSize: 80,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // New growth need card styles
  growthNeedCard: {
    backgroundColor: 'rgba(125, 211, 252, 0.15)',
    borderRadius: R.w(4),
    paddingVertical: R.h(1.5),
    paddingHorizontal: R.w(4.5),
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: R.h(1.2),
    width: '100%',
    minHeight: R.h(6),
  },
  growthNeedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  growthNeedTitle: {
    fontSize: R.font(14),
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'left',
    flex: 1,
    paddingRight: R.w(3),
    lineHeight: R.font(18),
  },
  growthNeedCheck: {
    marginTop: R.h(0.1),
  },
  growthNeedDescription: {
    fontSize: R.font(12),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    lineHeight: R.font(16),
    textAlign: 'left',
  },
  // Reviews styles
  reviewsContainer: {
    width: '100%',
  },
  review: {
    paddingVertical: R.h(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  reviewLast: {
    borderBottomWidth: 0,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: R.w(0.8),
    marginBottom: R.h(0.6),
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: R.w(3),
  },
  reviewAvatar: {
    width: R.w(10),
    height: R.w(10),
    borderRadius: R.w(4.5),
   
  },
  reviewAvatarText: {
    fontSize: R.font(16),
    color: '#FFFFFF',
    fontFamily: 'SNPro-Bold',
  },
  reviewContent: {
    flex: 1,
  },
  reviewText: {
    fontSize: R.font(16),
    color: '#FFFFFF',
    fontFamily: 'SNPro-SemiBold',
    lineHeight: R.font(24),
    marginBottom: R.h(1),
    marginTop: R.h(0.5),
    
  },
  reviewAuthor: {
    fontSize: R.font(14),
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'SNPro-SemiBold',
  },
});


// Prayer needs mapping from actual config
const PRAYER_NEED_OPTIONS = {
  // Spiritual Growth
  'faith_deepening': { text: 'Strengthen My Faith', description: 'Help me trust God more deeply in all areas of life' },
  'spiritual_discipline': { text: 'Prayer & Bible Study', description: 'Develop consistent habits of connecting with God' },
  'discernment': { text: 'Hearing God\'s Voice', description: 'Learn to recognize and follow God\'s guidance' },
  'worship': { text: 'Heart of Worship', description: 'Cultivate a spirit of praise and thanksgiving' },
  
  // Inner Peace  
  'anxiety_peace': { text: 'Calm My Anxious Heart', description: 'Find God\'s peace in the midst of worry and stress' },
  'emotional_healing': { text: 'Emotional Healing', description: 'Healing from past hurts, grief, or emotional pain' },
  'mental_clarity': { text: 'Clear Mind & Focus', description: 'Mental clarity and freedom from overwhelming thoughts' },
  'rest': { text: 'True Rest', description: 'Finding soul rest and renewal in God\'s presence' },
  
  // Relationships
  'family_harmony': { text: 'Family Unity', description: 'Peace, understanding, and love in family relationships' },
  'forgiveness': { text: 'Forgiveness & Reconciliation', description: 'Grace to forgive others and seek reconciliation' },
  'compassion': { text: 'Love Like Jesus', description: 'A heart full of compassion and love for others' },
  'community': { text: 'Christian Community', description: 'Meaningful connections with fellow believers' },
  
  // Purpose & Direction
  'life_purpose': { text: 'God\'s Purpose for My Life', description: 'Understanding how God wants to use my gifts and talents' },
  'wisdom_decisions': { text: 'Wisdom in Decisions', description: 'Divine wisdom for important life choices and decisions' },
  'breakthrough': { text: 'Breakthrough & Open Doors', description: 'God\'s favor and breakthrough in challenging situations' },
  'provision': { text: 'God\'s Provision', description: 'Trust in God\'s provision for all my needs' }
};

// Helper function to get prayer need info by ID
const getPrayerNeedInfo = (needId: string) => {
  return PRAYER_NEED_OPTIONS[needId as keyof typeof PRAYER_NEED_OPTIONS] || { text: needId, description: needId };
};

// Helper function to format faith tradition
const getFaithTraditionText = (tradition: string) => {
  switch (tradition) {
    case 'catholic':
      return 'Catholic';
    case 'christian_non_catholic':
      return 'Christian';
    case 'other':
      return 'spiritual';
    default:
      return 'spiritual';
  }
};


interface PrayerGenerationLoadingScreenProps {
  config: {
    title: string;
    backgroundGradient: string[];
    progressBar: {
      enabled: boolean;
      color: string;
      backgroundColor: string;
    };
    animation: {
      type: string;
      color: string;
      size: number;
    };
    tracking: {
      screenViewEvent: string;
      stageCompletedEventPrefix: string;
    };
  };
  onNext: () => void;
}

// Progressive journey building stages - showing EVERYTHING they're creating
// Much slower durations for better viewing experience
const createPrayerBuildingStages = (mockData?: any) => {
  const data = mockData || useOnboardingStore.getState();
  const faithTradition = data.faithTradition || 'faith';
  const streakGoal = data.streakGoalDays || 30;
  
  return [
    {
      id: 'faith_foundation',
      type: 'faith_foundation',
      title: 'Praymate+ gives you a truly personalized daily prayer experience',
      subtitle: `Start with Peace, End With Reflection`,
      duration: 5000 
    },
    {
      id: 'daily_rhythm',
      type: 'daily_rhythm',
      title: 'Each morning 🌅 and evening 🌆, you\'ll receive a new prayer tailored just for you',
      subtitle: 'You can add unlimited people and intentions to your daily prayers',
      duration: 6000 
    },
    {
      id: 'heart_connections',
      type: 'heart_connections',
      title: 'From Distraction To Devotion With PRAYBLOCK',
      subtitle: 'Spend less time on distracting apps and more time in God\'s presence',
      duration: 6000
    },
    {
      id: 'spiritual_growth',
      type: 'spiritual_growth',
      title: 'Feel Your Faith Growing With Each And Every Prayer',
      subtitle: 'Your prayer journey is crafted to help you grow closer to God and your loved ones',
      duration: 7000 
    },
    {
      id: 'commitment_power',
      type: 'commitment_power',
      title: `Loved By Believers Everywhere`,
      subtitle: '',
      duration: 7000 
    },
    {
      id: 'complete_experience',
      type: 'complete_experience',
      title: 'Your complete prayer experience',
      subtitle: 'everything is ready for your spiritual journey',
      duration: 4000 
    }
  ];
};

function PrayerGenerationLoadingScreenCore({ 
  config, 
  onNext,
}: PrayerGenerationLoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;

  const mockData = (config as any).mockData;

  const onboardingSnapshotRef = useRef<any>(null);
  if (!onboardingSnapshotRef.current) {
    onboardingSnapshotRef.current = mockData || useOnboardingStore.getState();
  }
  const dataSource = onboardingSnapshotRef.current;

  const stagesRef = useRef<ReturnType<typeof createPrayerBuildingStages> | null>(null);
  if (!stagesRef.current) {
    stagesRef.current = createPrayerBuildingStages(dataSource);
  }

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  
  // Animation values
  const progressWidth = useSharedValue(0);
  const glowIntensity = useSharedValue(0.3);
  
  // Animation values for 3-item sequences (pillars, benefits)
  const pillar1Opacity = useSharedValue(0.3);
  const pillar2Opacity = useSharedValue(0.3);
  const pillar3Opacity = useSharedValue(0.3);
  const pillar1Scale = useSharedValue(0.8);
  const pillar2Scale = useSharedValue(0.8);
  const pillar3Scale = useSharedValue(0.8);
  
  // Track mounted state and timers for cleanup
  const isMounted = useRef(true);
  const timers = useRef<(ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>)[]>([]);
  const startNextStageRef = useRef<((stageIndex: number) => void) | null>(null);
  const hasStartedStagesRef = useRef(false);
  const onNextRef = useRef(onNext);
  
  // Create stages with proper data
  const PRAYER_BUILDING_STAGES = stagesRef.current ?? [];
  
  // Get user data for personalization display
  const streakGoal = dataSource.streakGoalDays || 30;
  const prayerTimes = dataSource.prayerTimes || [];
  const faithTradition = dataSource.faithTradition || 'faith';

  
  // Cleanup function
  useEffect(() => {
    return () => {
      isMounted.current = false;
      const currentTimers = timers.current;
      currentTimers.forEach((timer) => {
        // Clear both timeouts and intervals
        clearTimeout(timer);
        clearInterval(timer);
      });
      // Removed stage opacity and scale animations
      cancelAnimation(progressWidth);
      cancelAnimation(glowIntensity);
      cancelAnimation(pillar1Opacity);
      cancelAnimation(pillar2Opacity);
      cancelAnimation(pillar3Opacity);
      cancelAnimation(pillar1Scale);
      cancelAnimation(pillar2Scale);
      cancelAnimation(pillar3Scale);
    };
  }, []); // Run only once on mount
  
  const startNextStage = useCallback((stageIndex: number) => {
    if (!isMounted.current) {
      return;
    }

    const stages = stagesRef.current;
    if (!stages || stageIndex < 0 || stageIndex >= stages.length) {
      return;
    }

    const stage = stages[stageIndex];
    
    // Stage transition without animations
    // Removed animations for stability
    
    // Reset and animate 3-item sequences for specific stages
    if (stage.type === 'faith_foundation' || stage.type === 'commitment_power') {
      // Reset all pillar animations to inactive state
      pillar1Opacity.value = 0.3;
      pillar2Opacity.value = 0.3;
      pillar3Opacity.value = 0.3;
      pillar1Scale.value = 0.8;
      pillar2Scale.value = 0.8;
      pillar3Scale.value = 0.8;
      
      // Animate them to light up one by one over the stage duration
      const itemDelay = stage.duration / 4; // Space them across 3/4 of the stage duration
      
      // Item 1 - lights up first
      const pillar1Timer = setTimeout(() => {
        if (!isMounted.current) return;
        pillar1Opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
        pillar1Scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });
      }, 500);
      timers.current.push(pillar1Timer);
      
      // Item 2 - lights up second
      const pillar2Timer = setTimeout(() => {
        if (!isMounted.current) return;
        pillar2Opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
        pillar2Scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });
      }, 500 + itemDelay);
      timers.current.push(pillar2Timer);
      
      // Item 3 - lights up third
      const pillar3Timer = setTimeout(() => {
        if (!isMounted.current) return;
        pillar3Opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
        pillar3Scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });
      }, 500 + itemDelay * 2);
      timers.current.push(pillar3Timer);
    }
    
    // Animate progress bar for this stage
    const progressEnd = ((stageIndex + 1) / stages.length) * 100;
    
    progressWidth.value = withTiming(progressEnd, { 
      duration: stage.duration,
      easing: Easing.inOut(Easing.cubic)
    });
    
    const stageTimer = setTimeout(() => {
      if (!isMounted.current) return;
      
      if (isMounted.current && stageIndex + 1 < stages.length) {
        setCurrentStageIndex(stageIndex + 1);
        
        const nextStageTimer = setTimeout(() => {
          if (isMounted.current) {
            startNextStage(stageIndex + 1);
          }
        }, 500);
        timers.current.push(nextStageTimer);
      } else if (isMounted.current) {
        const completionTimer = setTimeout(() => {
          if (!isMounted.current) {
            return;
          }

          onNextRef.current?.();
        }, 600);

        timers.current.push(completionTimer);
      }
    }, stage.duration);
    
    timers.current.push(stageTimer);
  }, [logEvent, progressWidth]);

  useEffect(() => {
    startNextStageRef.current = startNextStage;
  }, [startNextStage]);

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  
  // Start the personalization journey on mount only
  useEffect(() => {
    if (hasStartedStagesRef.current) {
      return;
    }

    hasStartedStagesRef.current = true;

    // Ambient glow animation
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    // Start first stage after initial delay
    const startTimer = setTimeout(() => {
      startNextStageRef.current?.(0);
    }, 1000);

    timers.current.push(startTimer);
    
    return () => {
      clearTimeout(startTimer);
    };
  }, [glowIntensity]);
  
  // Animated styles (stage animations removed)
  
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));
  
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value,
  }));
  
  // Animated styles for 3-item sequences
  const pillar1Style = useAnimatedStyle(() => ({
    opacity: pillar1Opacity.value,
    transform: [{ scale: pillar1Scale.value }],
  }));
  
  const pillar2Style = useAnimatedStyle(() => ({
    opacity: pillar2Opacity.value,
    transform: [{ scale: pillar2Scale.value }],
  }));
  
  const pillar3Style = useAnimatedStyle(() => ({
    opacity: pillar3Opacity.value,
    transform: [{ scale: pillar3Scale.value }],
  }));
  
  const currentStage =
    PRAYER_BUILDING_STAGES[currentStageIndex] ||
    PRAYER_BUILDING_STAGES[PRAYER_BUILDING_STAGES.length - 1];

  if (!currentStage) {
    return null;
  }
  
  // Render different content based on stage type - showing them building their complete spiritual journey
  const renderStageContent = () => {
    switch (currentStage.type) {
      case 'faith_foundation':
        return (
          <View style={styles.stageContent}>
            <Image
              source={require('../../../../assets/images/ob_stage1.png')}
              style={styles.stageImage}
              resizeMode="cover"
            />
          </View>
        );
        
      case 'daily_rhythm':
        return (
          <View style={styles.stageContent}>
            <Image
              source={require('../../../../assets/images/ob_stage2.png')}
              style={styles.stageImage}
              resizeMode="contain"
            />
          </View>
        );
        
      case 'heart_connections':
        return (
          <View style={styles.stageContent}>
            <Image
              source={require('../../../../assets/images/ob_stage3.png')}
              style={styles.stageImage}
              resizeMode="cover"
            />
          </View>
        );
        
      case 'spiritual_growth':
        return (
          <View style={styles.stageContent}>
            <Image
              source={require('../../../../assets/images/ob_stage4.png')}
              style={styles.stageImage}
              resizeMode="contain"
            />
          </View>
        );
        
            case 'commitment_power':
        return (
          <View style={styles.stageContent}>
            <View style={styles.reviewsContainer}>
              <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.review}>
                <View style={styles.reviewRow}>
                  <Image
                    source={require('../../../../assets/images/IMG_5495.png')}
                    style={styles.reviewAvatar}
                  />
                  <View style={styles.reviewContent}>
                    <View style={styles.reviewStars}>
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                    </View>
                    <Text style={styles.reviewText}>Praymate has become my daily anchor. It's so easy to add someone to your prayer list and the prayers are so personal and relevant.</Text>
                    <Text style={styles.reviewAuthor}>Dr Deb Legge - Williamsville, NY</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeIn.delay(350).duration(400)} style={styles.review}>
                <View style={styles.reviewRow}>
                  <Image
                    source={require('../../../../assets/images/IMG_3333.png')}
                    style={styles.reviewAvatar}
                  />
                  <View style={styles.reviewContent}>
                    <View style={styles.reviewStars}>
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                    </View>
                    <Text style={styles.reviewText}>The personalized prayers feel like they were written just for me. Truly transformative.</Text>
                    <Text style={styles.reviewAuthor}>Erik J. - San Juan, Puerto Rico</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.review}>
                <View style={styles.reviewRow}>
                  <Image
                    source={require('../../../../assets/images/IMG_2222.png')}
                    style={styles.reviewAvatar}
                  />
                  <View style={styles.reviewContent}>
                    <View style={styles.reviewStars}>
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                    </View>
                    <Text style={styles.reviewText}>I've never been more consistent with my prayer life. This app changed everything.</Text>
                    <Text style={styles.reviewAuthor}>Marissa Cerullo - Los Angeles, CA</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeIn.delay(650).duration(400)} style={[styles.review, styles.reviewLast]}>
                <View style={styles.reviewRow}>
                  <Image
                    source={require('../../../../assets/images/IMG_7342.png')}
                    style={styles.reviewAvatar}
                  />
                  <View style={styles.reviewContent}>
                    <View style={styles.reviewStars}>
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                      <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
                    </View>
                    <Text style={styles.reviewText}>I use Praymate every day and it has changed my life and my faith. I never thought an app could do this, but I have seriously never felt more connected to God than I do now.</Text>
                    <Text style={styles.reviewAuthor}>Jay Hannon - Buffalo, NY</Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          </View>
        );
        
      case 'complete_experience':
        return (
          <View style={styles.stageContent}>
            <Animated.View 
              entering={FadeIn.delay(500).duration(1200)}
              style={styles.completeVisual}
            >
              <Text style={styles.completeEmoji}>🙏</Text>
              <Text style={styles.completeTitle}>
                personalizing your prayer experience...
              </Text>
            </Animated.View>
          </View>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <OnboardingGradientBackground />
      
      {/* Ambient glow */}
      <Animated.View style={[styles.glowBackground, glowStyle]} />
      
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        
        
    
        
        {/* Main stage content */}
        <View style={styles.stageContainer}>
          {/* Hide title/subtitle on final stage */}
          {currentStage.type !== 'complete_experience' && (
            <View style={styles.stageHeader}>
              {currentStage.type === 'daily_rhythm' ? (
                <Text style={styles.stageTitle}>
                  Every{' '}
                  <Image source={morningEmoji} style={styles.inlineEmojiImage} resizeMode="contain" />
                  {''}morning and{' '}
                  <Image source={eveningEmoji} style={styles.inlineEmojiImage} resizeMode="contain" />
                  {'\u00A0'}evening, you'll receive new personalized prayers
                </Text>
              ) : (
                <Text style={styles.stageTitle}>{currentStage.title}</Text>
              )}
              <Text style={styles.stageSubtitle}>{currentStage.subtitle}</Text>
            </View>
          )}
          
          <Animated.View 
            key={currentStageIndex}
            entering={FadeIn.duration(300)} 
            exiting={FadeOut.duration(200)}
            style={styles.stageContentWrapper}
          >
          {renderStageContent()}
          </Animated.View>
        </View>
        
        {/* Bottom branding */}
      
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View style={[styles.progressFill, progressBarStyle]}>
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C42']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>

        <View style={styles.footer}>
        {currentStage.type !== 'complete_experience' && (
            <Text style={styles.footerSubtitle}>creating your personalized prayer experience</Text>
          )}
         
        
          
        </View>
      </View>
      
    </View>
  );
}


export default PrayerGenerationLoadingScreenCore; 