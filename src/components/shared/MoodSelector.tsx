import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { APP_MOOD_OPTIONS } from '../../constants/moodConstants';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import useResponsive from '../../hooks/useResponsive';

interface MoodSelectorProps {
  userMood: string;
  isCollapsed: boolean;
  onUpdateMood: (mood: string) => void;
  onToggleCollapse: (isCollapsed: boolean) => void;
  showRefreshButton?: boolean;
  verticalLayout?: boolean;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({
  userMood,
  isCollapsed,
  onUpdateMood,
  onToggleCollapse,
  showRefreshButton = true,
  verticalLayout = false,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height]);

  const getSelectedMoodDetails = () => {
    return APP_MOOD_OPTIONS.find(m => m.id === userMood);
  };

  const halfLength = Math.ceil(APP_MOOD_OPTIONS.length / 2);
  const moodOptionsRow1 = APP_MOOD_OPTIONS.slice(0, halfLength);
  const moodOptionsRow2 = APP_MOOD_OPTIONS.slice(halfLength);

  return (
    <Animated.View 
      style={styles.moodSectionWrapper}
      layout={Layout.springify()}
    >
      {isCollapsed ? (
        // --- Collapsed State: Summary Card ---
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <TouchableOpacity
            style={styles.moodSummaryCard}
            onPress={() => showRefreshButton ? onToggleCollapse(false) : undefined}
            activeOpacity={showRefreshButton ? 0.8 : 1}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            disabled={!showRefreshButton}
          >
            <View style={styles.moodSummaryContent}>
              <Text style={styles.moodSummaryEmoji}>{getSelectedMoodDetails()?.emoji || '🤔'}</Text>
              <Text style={styles.moodSummaryText}>Feeling {getSelectedMoodDetails()?.label || 'Okay'}</Text>
            </View>
            {showRefreshButton && (
              <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.7)" />
            )}
          </TouchableOpacity>
        </Animated.View>
      ) : (
        // --- Expanded State: Full Mood Selector ---
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          {verticalLayout ? (
            // Grid layout (3 across) for single-stage mood selection
            <View style={styles.moodGridContainer}>
              {APP_MOOD_OPTIONS.map(mood => (
                <TouchableOpacity
                  key={mood.id}
                  style={[styles.moodOptionGrid, userMood === mood.id && styles.selectedMoodOptionGrid]}
                  onPress={() => onUpdateMood(mood.id)}
                  activeOpacity={0.6}
                >
                  <View style={styles.moodGridContent}>
                    <Text style={styles.moodEmojiGrid}>{mood.emoji}</Text>
                    <Text 
                      style={[styles.moodLabelGrid, userMood === mood.id && styles.selectedMoodLabelGrid]}
                    >
                      {mood.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            // Horizontal layout (existing)
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moodScrollContent}
              style={styles.moodScrollView}
            >
            <View style={styles.moodRowsContainer}>
              {/* Row 1 */}
              <View style={styles.moodRow}>
                {moodOptionsRow1.map(mood => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[styles.moodOption, userMood === mood.id && styles.selectedMoodOption]}
                    onPress={() => onUpdateMood(mood.id)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text 
                      style={[styles.moodLabel, userMood === mood.id && styles.selectedMoodLabel]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Row 2 */}
              <View style={styles.moodRow}>
                {moodOptionsRow2.map(mood => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[styles.moodOption, userMood === mood.id && styles.selectedMoodOption]}
                    onPress={() => onUpdateMood(mood.id)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text 
                      style={[styles.moodLabel, userMood === mood.id && styles.selectedMoodLabel]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};

// Simplified styles - more compact
const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  moodSectionWrapper: {
    marginBottom: 12, // Reduced spacing
  },
  moodScrollView: {
    marginBottom: 0,
  },
  moodScrollContent: {
    paddingRight: 20,
  },
  moodRowsContainer: {
    // Container for both rows
  },
  moodRow: {
    flexDirection: 'row',
    marginBottom: 8, 
  },
  moodOption: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100, 
    height: 62,
    marginRight: 8,
    marginLeft: 0,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectedMoodOption: {
    backgroundColor: 'rgba(108, 99, 255, 0.3)',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    fontFamily: 'SNPro-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedMoodLabel: {
    color: '#FFFFFF',
    fontFamily: 'SNPro-SemiBold',
  },
  moodSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.4)',
  },
  moodSummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodSummaryEmoji: {
    fontSize: R.font(28),
    marginRight: 10,
  },
  moodSummaryText: {
    fontSize: R.font(20),
    fontFamily: 'SNPro-Heavy',
    color: '#FFFFFF',
  },
  moodGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: R.w(2.5),
  },
  moodOptionGrid: {
    width: '31%',
    height: R.h(8.5),
    borderRadius: R.w(2),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedMoodOptionGrid: {
    backgroundColor: 'rgba(108, 99, 255, 0.25)',
    borderWidth: 2,
    borderColor: '#7C71E0',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  moodGridContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmojiGrid: {
    fontSize: R.font(32),
    marginBottom: R.h(0.6),
  },
  moodLabelGrid: {
    fontSize: R.font(16),
    fontFamily: 'SNPro-Heavy',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: R.w(1),
  },
  selectedMoodLabelGrid: {
    color: '#FFFFFF',
    fontFamily: 'SNPro-Heavy',
  },
});

export default MoodSelector; 