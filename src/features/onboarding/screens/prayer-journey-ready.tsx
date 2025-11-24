import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingGradientBackground from '../../../components/shared/OnboardingGradientBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AreaChart, LineChart } from 'react-native-svg-charts';
import * as shape from 'd3-shape';
import { Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import useResponsive from '../../../hooks/useResponsive';
import { OnboardingFlowContext } from '../../../contexts/OnboardingFlowContext';

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: R.w(5),
  },
  content: {
    paddingBottom: R.h(5),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: R.h(3),
  },
  logoEmoji: {
    fontSize: R.font(32),
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: R.h(1.5),
  },
  mainTitle: {
    fontSize: R.font(32),
    fontFamily: 'SNPro-Black',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: R.h(1),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mainSubtitle: {
    fontSize: R.font(18),
    fontFamily: 'SNPro-Bold',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: R.h(1.5),
    lineHeight: R.font(24),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  journeySection: {
    marginBottom: R.h(2),
  },
  chartWrapper: {
    height: R.h(36),
  },
  chartContainer: {
    height: R.h(26),
    width: '100%',
  },
  milestonesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: R.w(8),
    marginTop: R.h(2),
  },
  milestone: {
    alignItems: 'center',
  },
  milestoneDot: {
    width: R.w(3),
    height: R.w(3),
    borderRadius: R.w(1.5),
    marginBottom: R.h(1),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  milestoneText: {
    fontSize: R.font(12),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  milestoneLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: R.w(2.5),
    marginBottom: R.h(3.5),
  },
  socialProofCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: R.w(4),
    padding: R.w(5),
    marginBottom: R.h(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statNumber: {
    color: '#FFD700',
    fontSize: R.font(22),
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: R.font(16),
    textAlign: 'center',
    lineHeight: R.font(26),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ctaButton: {
    borderRadius: R.w(4),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: R.h(2.5),
  },
  ctaGradient: {
    paddingVertical: R.h(2.2),
    paddingHorizontal: R.w(8),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: R.font(18),
    fontWeight: '700',
    color: '#1A1B4B',
    letterSpacing: -0.2,
  },
  socialProof: {
    fontSize: R.font(14),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: R.h(5),
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});


interface PrayerJourneyReadyConfig {
  title: string;
  subtitle: string;
  backgroundGradient: string[];
  progressVisualization: {
    enabled: boolean;
    timeline: {
      duration: string;
      milestones: {
        day: string;
        label: string;
      }[];
    };
    resultLabel: string;
    progressCurve: {
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      color: string;
    };
  };
  socialProof: {
    enabled: boolean;
    statistic: string;
    description: string;
    highlightedText: string;
  };
  cta: {
    text: string;
    gradient: string[];
    icon: string;
  };
  tracking: {
    screenViewEvent: string;
    ctaTappedEvent: string;
  };
}

interface PrayerJourneyReadyScreenProps {
  config: PrayerJourneyReadyConfig;
  onNext: () => void;
  logSduiEvent?: (eventName: string, eventData?: Record<string, any>) => void;
}

const PrayerJourneyReadyScreenCore: React.FC<PrayerJourneyReadyScreenProps> = ({
  config,
  onNext,
  logSduiEvent,
}) => {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height, R]);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;
  
  const [isChartVisible, setIsChartVisible] = useState(false);
  
  // Individual animation values for each element
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const chartOpacity = useRef(new Animated.Value(0)).current;
  const chartScale = useRef(new Animated.Value(0.95)).current;
  const socialProofOpacity = useRef(new Animated.Value(0)).current;
  const socialProofTranslateY = useRef(new Animated.Value(10)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Orchestrated animation sequence
    Animated.sequence([
      // Logo appears first with subtle scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      
      // Title slides up and fades in
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      
      // Subtitle fades in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      
      // Chart appears with scale and opacity
      Animated.parallel([
        Animated.timing(chartOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(chartScale, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      
      // Social proof slides up subtly
      Animated.parallel([
        Animated.timing(socialProofOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(socialProofTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      
      // CTA button appears last with emphasis
      Animated.parallel([
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(ctaScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Delay chart visibility to sync with animation
    const chartTimer = setTimeout(() => {
      setIsChartVisible(true);
    }, 1800); // Appears when chart animation starts

    return () => clearTimeout(chartTimer);
  }, [chartOpacity, chartScale, config.tracking.screenViewEvent, ctaOpacity, ctaScale, logSduiEvent, logoOpacity, logoScale, socialProofOpacity, socialProofTranslateY, subtitleOpacity, titleOpacity, titleTranslateY]);

  const handleContinue = async () => {
    // Log the continue event - single event call
    if (config.tracking?.ctaTappedEvent && logSduiEvent) {
      logSduiEvent(config.tracking.ctaTappedEvent);
    }

    onNext();
  };

  // Refined spiritual growth data - 30-day journey with proper alignment
  const chartData = [
    { value: 20 },   // Day 1: Starting point
    { value: 25 },   // Day 4
    { value: 32 },   // Day 7
    { value: 42 },   // Day 10
    { value: 55 },   // Day 14: Growing milestone
    { value: 68 },   // Day 18
    { value: 78 },   // Day 21
    { value: 85 },   // Day 25
    { value: 90 },   // Day 28: Flourishing milestone
    { value: 92 },   // Day 30: Final point (not at edge)
  ];

  const chartHeight = R.h(26); // Increased height for better visibility

  // Milestone positions that align with chart data points
  const milestoneIndices = [0, 4, 8]; // Positions 0, 4, 8 in our data array
  const milestoneLabels = config.progressVisualization.timeline.milestones.map(m => m.label);
  const milestoneColors = ['#FFD700', '#7DD3FC', '#4CAF50'];
  
  // Separate labels for bottom milestone dots only
  const bottomMilestoneLabels = config.progressVisualization.timeline.milestones.map(m => m.day);

  // Custom decorator for aligned milestones
  const Decorator = ({ x, y, data }: any) => {
    return milestoneIndices.map((dataIndex, milestoneIndex) => {
      const color = milestoneColors[milestoneIndex];
      const label = milestoneLabels[milestoneIndex];
      const isFirst = milestoneIndex === 0;
      const isLast = milestoneIndex === milestoneIndices.length - 1;
      
      return (
        <Svg key={dataIndex}>
          {/* Milestone dots on the line */}
          <Circle
            cx={x(dataIndex)}
            cy={y(data[dataIndex].value)}
            r={isFirst || isLast ? R.w(2) : R.w(1.5)}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth={isFirst || isLast ? 2 : 1}
            opacity={1}
          />
          
          {/* Labels above dots with better positioning */}
          <SvgText
            x={x(dataIndex)}
            y={y(data[dataIndex].value) - (isLast ? R.h(3) : R.h(2.5))}
            fill={color}
            fontSize={R.font(12).toString()}
            fontWeight="700"
            textAnchor="middle"
          >
            {label}
          </SvgText>
        </Svg>
      );
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <OnboardingGradientBackground />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: R.insets.top + R.h(2.5) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Animated.View style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }]
            }
          ]}>
            <Text style={styles.logoEmoji}>🙏</Text>
          </Animated.View>

          {/* Simplified header - just one clear headline */}
          <View style={styles.headerContainer}>
            <Animated.Text style={[
              styles.mainTitle,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }]
              }
            ]}>
              {config.title}
            </Animated.Text>
            <Animated.Text style={[
              styles.mainSubtitle,
              { opacity: subtitleOpacity }
            ]}>
              {config.subtitle}
            </Animated.Text>
          </View>

          {/* Journey Visualization */}
          {config.progressVisualization.enabled && (
            <Animated.View style={[
              styles.journeySection,
              {
                opacity: chartOpacity,
                transform: [{ scale: chartScale }]
              }
            ]}>
              {isChartVisible && (
                <View style={styles.chartWrapper}>
                  {/* Chart container for proper alignment */}
                  <View style={{ position: 'relative', height: chartHeight, width: '100%' }}>
                    {/* Area chart for gradient fill only */}
                    <View style={styles.chartContainer}>
                      <LineChart
                        style={{ height: chartHeight }}
                        data={chartData}
                        yAccessor={({ item }: { item: any }) => item.value}
                        xAccessor={({ index }: { index: number }) => index}
                        svg={{ 
                          stroke: '#FFD700',
                          strokeWidth: 3
                        }}
                        contentInset={{ top: R.h(5), bottom: R.h(2.5), left: R.w(8), right: R.w(8) }}
                        curve={shape.curveCardinal}
                      >
                        <Decorator />
                      </LineChart>
                      <AreaChart
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        data={chartData}
                        yAccessor={({ item }: { item: any }) => item.value}
                        svg={{
                          fill: 'url(#gradient)',
                          opacity: 0.3
                        }}
                        contentInset={{ top: R.h(5), bottom: R.h(2.5), left: R.w(8), right: R.w(8) }}
                        curve={shape.curveCardinal}
                      >
                        <Defs>
                          <SvgLinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <Stop offset="0%" stopColor="#FFD700" stopOpacity={0.8} />
                            <Stop offset="100%" stopColor="#FFD700" stopOpacity={0.1} />
                          </SvgLinearGradient>
                        </Defs>
                      </AreaChart>
                    </View>
                  </View>
                  
                  {/* Journey milestones below the chart - properly aligned */}
                  <View style={styles.milestonesContainer}>
                    {bottomMilestoneLabels.map((label, index) => (
                      <React.Fragment key={label}>
                        <View style={styles.milestone}>
                          <View style={[
                            styles.milestoneDot, 
                            { backgroundColor: milestoneColors[index] }
                          ]} />
                          <Text style={styles.milestoneText}>{label}</Text>
                        </View>
                        {index < bottomMilestoneLabels.length - 1 && (
                          <View style={styles.milestoneLine} />
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {/* Social Proof Section */}
          {config.socialProof.enabled && (
            <Animated.View style={[
              styles.socialProofCard,
              {
                opacity: socialProofOpacity,
                transform: [{ translateY: socialProofTranslateY }]
              }
            ]}>
              <Text style={styles.statDescription}>
                <Text style={styles.statNumber}>{config.socialProof.statistic}</Text>
                {config.socialProof.description}
                <Text style={styles.statNumber}>{config.socialProof.highlightedText}</Text>
              </Text>
            </Animated.View>
          )}

          {/* CTA Button */}
          <Animated.View style={{
            opacity: ctaOpacity,
            transform: [{ scale: ctaScale }]
          }}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={config.cta.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>{config.cta.text}</Text>
                <Ionicons 
                  name={config.cta.icon as any} 
                  size={R.w(5)} 
                  color="#1a1a2e" 
                  style={{ marginLeft: R.w(2) }} 
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
};


export default PrayerJourneyReadyScreenCore;