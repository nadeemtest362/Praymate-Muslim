import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import { BibleVerse } from '../../data/dailyVerses';
import useResponsive from '../../hooks/useResponsive';

interface GradientTheme {
  id: string;
  name: string;
  colors: [string, string, string];
  textColor: string;
  accentColor: string;
  icon?: string;
}

const GRADIENT_THEMES: GradientTheme[] = [
  {
    id: 'brand',
    name: 'Brand',
    colors: ['#4F46E5', '#7C3AED', '#7DD3FC'],
    textColor: '#FFFFFF',
    accentColor: 'rgba(255, 255, 255, 0.95)',
  },
  {
    id: 'golden',
    name: 'Golden',
    colors: [ '#EC4899', '#EF4444','#F59E0B'],
    textColor: '#FFFFFF',
    accentColor: 'rgba(255, 255, 255, 0.95)',
  },
  {
    id: 'royal',
    name: 'Royal',
    colors: ['#050b2b', '#ff00c3', '#672d8c'],
    textColor: '#FFFFFF',
    accentColor: 'rgba(255, 255, 255, 0.95)',
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: ['#2b2e4a', '#813c7a', '#e84545'],
    textColor: '#FFFFFF',
    accentColor: 'rgba(255, 255, 255, 0.95)',
  },
];

interface DotIndicatorProps {
  index: number;
  scrollX: Animated.SharedValue<number>;
  cardWidth: number;
  cardSpacing: number;
  styles: any;
}

const DotIndicator: React.FC<DotIndicatorProps> = ({ index, scrollX, cardWidth, cardSpacing, styles }) => {
  const animatedDotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (cardWidth + cardSpacing),
      index * (cardWidth + cardSpacing),
      (index + 1) * (cardWidth + cardSpacing),
    ];

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1.2, 0.8],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View
      style={[styles.dot, animatedDotStyle]}
    />
  );
};

interface VerseShareCardProps {
  verse: BibleVerse;
  theme: GradientTheme;
  userName?: string;
  onShare: () => void;
}

const VerseShareCard: React.FC<VerseShareCardProps> = ({
  verse,
  theme,
  userName,
  onShare,
}) => {
  const viewShotRef = useRef<ViewShot>(null);
  const scale = useSharedValue(1);
  const responsive = useResponsive();
  const styles = getResponsiveStyles(responsive);

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (!viewShotRef.current) return;
      
      const uri = await (viewShotRef.current as any).capture({
        format: 'png',
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Please try saving to gallery instead');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share this verse',
      });
      
      onShare();
    } catch (error) {
      console.error('Error sharing verse card:', error);
      Alert.alert('Error', 'Failed to share verse card');
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle]}>
      <View style={styles.cardContainer}>
        <ViewShot 
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={styles.cardWrapper}
        >
          <LinearGradient
            colors={theme.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.logoWrapper}>
                <Text style={[styles.logoText, { color: theme.textColor }]}>pray</Text>
                <Text style={[styles.logoAccent, { color: '#7DD3FC' }]}>mate</Text>
                <Text style={styles.logoEmoji}>🙏</Text>
              </View>
            </View>

            {/* Verse Content */}
            <View style={styles.verseContainer}>
              <Text style={[styles.verseText, { color: theme.textColor }]}>
                <Text style={[styles.openQuote, { color: theme.textColor }]}>"</Text>
                {verse.text}
                <Text style={[styles.closeQuote, { color: theme.textColor }]}>"</Text>
              </Text>
            </View>

            {/* Reference */}
            <View style={styles.referenceContainer}>
              <Text style={[styles.reference, { color: theme.textColor }]}>
                — {verse.reference} —
              </Text>
            </View>


          </LinearGradient>
        </ViewShot>
        
        {/* Share Button - Outside ViewShot */}
        <TouchableOpacity
          style={[styles.shareButtonOverlay, { backgroundColor: theme.accentColor }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="share-outline" 
            size={responsive.font(20)} 
            color={theme.textColor === '#FFFFFF' ? '#333' : '#FFF'} 
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

interface VerseShareCarouselProps {
  verse: BibleVerse;
  userName?: string;
  onClose: () => void;
}

const VerseShareCarousel: React.FC<VerseShareCarouselProps> = ({
  verse,
  userName,
  onClose,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const responsive = useResponsive();

  const styles = getResponsiveStyles(responsive);
  
  // Get responsive card dimensions
  const CARD_WIDTH = responsive.w(85);
  const CARD_SPACING = responsive.w(5);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = contentOffsetX;
  };

  const handleShare = () => {
    // Close modal after successful share
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Style</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={responsive.font(24)} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="center"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {GRADIENT_THEMES.map((theme, index) => (
          <View key={theme.id} style={styles.cardSlot}>
            <VerseShareCard
              verse={verse}
              theme={theme}
              userName={userName}
              onShare={handleShare}
            />
          </View>
        ))}
      </ScrollView>

      {/* Page Indicator */}
      <View style={styles.pageIndicator}>
        {GRADIENT_THEMES.map((_, index) => (
          <DotIndicator 
            key={index} 
            index={index} 
            scrollX={scrollX}
            cardWidth={CARD_WIDTH}
            cardSpacing={CARD_SPACING}
            styles={styles}
          />
        ))}
      </View>
    </View>
  );
};

const getResponsiveStyles = (responsive: ReturnType<typeof useResponsive>) => {
  const { font, lineHeight, w, h, width } = responsive;

  // Responsive card dimensions
  const CARD_WIDTH = w(85);
  const CARD_HEIGHT = h(60);
  const CARD_SPACING = w(5);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: w(5),
      paddingTop: h(2),
      paddingBottom: h(1.5),
      borderBottomWidth: 1,
      borderBottomColor: '#E9ECEF',
    },
    title: {
      fontSize: font(20),
      fontFamily: 'SNPro-Heavy',
      color: '#333',
    },
    closeButton: {
      padding: w(1),
    },
    scrollContent: {
      paddingLeft: (width - CARD_WIDTH) / 2,
      paddingRight: (width - CARD_WIDTH) / 2,
      paddingVertical: h(2.5),
    },
    cardSlot: {
      width: CARD_WIDTH,
      marginHorizontal: CARD_SPACING / 2,
    },
    cardContainer: {
      width: '100%',
    },
    cardWrapper: {
      borderRadius: w(5),
      overflow: 'hidden',
    },
    card: {
      width: '100%',
      height: CARD_HEIGHT,
      borderRadius: w(5),
      padding: w(6),
      position: 'relative',
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: h(2.5),
    },
    logoWrapper: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    logoText: {
      fontSize: font(20),
      fontFamily: 'SNPro-Heavy',
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    logoAccent: {
      fontSize: font(20),
      fontFamily: 'SNPro-Heavy',
      letterSpacing: -0.5,
      textShadowColor: 'rgba(125, 211, 252, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    logoEmoji: {
      fontSize: font(16),
    },
    shareButtonOverlay: {
      position: 'absolute',
      top: h(2.5),
      right: w(5),
      width: w(10),
      height: w(10),
      borderRadius: w(5),
      alignItems: 'center',
      opacity: 0.6,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    verseContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: w(1),
    },
    quoteWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    openQuote: {
      fontSize: font(32),
      fontFamily: 'SNPro-Regular',
      opacity: 0.6,
      marginTop: h(-0.5),
      marginRight: w(0.5),
    },
    closeQuote: {
      fontSize: font(24),
      fontFamily: 'SNPro-Regular',
      opacity: 0.6,
      marginTop: -2,
      marginLeft: 2,
    },
    verseText: {
      fontSize: font(24),
      fontFamily: 'SNPro-Heavy',
      textAlign: 'center',
      lineHeight: lineHeight(24),
      letterSpacing: -0.5,
      marginVertical: h(0.5),
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    referenceContainer: {
      alignItems: 'center',
      marginBottom: h(2.5),
    },
    reference: {
      fontSize: font(16),
      fontWeight: '400',
      letterSpacing: 1.5,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
      opacity: 0.85,
    },
    pageIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: h(2.5),
      gap: w(2),
    },
    dot: {
      width: w(2),
      height: w(2),
      borderRadius: w(1),
      backgroundColor: '#007AFF',
    },
  });
};

export default VerseShareCarousel;
