import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import OnboardingGradientBackground from "../../../components/shared/OnboardingGradientBackground";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "../../../stores/onboardingStore";
import useResponsive from "../../../hooks/useResponsive";
import * as Haptics from "expo-haptics";
import PrayerShareModal from "../../../components/shared/PrayerShareModal";
import { getSimpleSubscriptionStatus } from "../../../utils/subscriptionManager";
import { useAuth } from "../../../hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { OnboardingFlowContext } from "../../../contexts/OnboardingFlowContext";
import { completeOnboarding } from "../../../services/onboardingCompletionService";

// Prayer Share Screen - Encourages users to share their prayer
// Theme: "Small acts, big miracles" - Multiplication/Loaves & fishes

interface PrayerShareScreenProps {
  config: any;
  onNext?: () => void;
  onBack?: () => void;
}

export default function PrayerShareScreen({
  config = {},
  onNext,
  onBack,
}: PrayerShareScreenProps) {
  const insets = useSafeAreaInsets();
  const R = useResponsive();
  const styles = React.useMemo(() => createStyles(R), [R.width, R.height, R]);
  const { firstPrayerContent } = useOnboardingStore();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [hasShared, setHasShared] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const flowContext = React.useContext(OnboardingFlowContext);
  const logEvent = flowContext?.logEvent;

  // Debug logging
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const breadScale = useRef(new Animated.Value(0.3)).current;
  const fishScale = useRef(new Animated.Value(0.3)).current;
  const multiplyAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Sequential scaling animations for multiplication effect
    Animated.sequence([
      Animated.spring(breadScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(fishScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(multiplyAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [breadScale, fadeAnim, fishScale, glowAnim, multiplyAnim]);

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (logEvent) {
      logEvent('prayer_share_modal_opened');
    }
    setShowShareModal(true);
  };

  // Complete onboarding and navigate to home
  const handleCompleteOnboarding = async () => {
    if (!user?.id) {
      if (logEvent) {
        logEvent('prayer_share_bypass_failed', {
          reason: 'missing_user',
        });
      }
      return;
    }

    if (isProcessing) {
      if (logEvent) {
        logEvent('prayer_share_bypass_ignored');
      }
      return;
    }

    setIsProcessing(true);

    try {
      await completeOnboarding({
        userId: user.id,
        queryClient,
        logEvent,
        eventPrefix: 'prayer_share',
      });
    } catch (error) {
      if (logEvent) {
        logEvent('prayer_share_bypass_failed', {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      setIsProcessing(false);
    }
  };

  // Smart navigation based on subscription status
  const handleSmartNavigation = async () => {
    try {
      setIsProcessing(true);
      const status = await getSimpleSubscriptionStatus();

      // Skip paywall for users with active subscriptions
      const shouldSkipPaywall = [
        "active",
        "trial_active",
        "cancelled_but_active",
      ].includes(status);

      if (shouldSkipPaywall) {
        if (logEvent) {
          logEvent('prayer_share_routing_to_home', {
            subscription_status: status,
          });
        }
        await handleCompleteOnboarding();
      } else {
        if (logEvent) {
          logEvent('prayer_share_routing_to_benefits', {
            subscription_status: status,
          });
        }
        if (onNext) onNext();
      }
    } catch (error) {
      if (logEvent) {
        logEvent('prayer_share_subscription_check_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      // On error, proceed to paywall (safe default)
      if (onNext) onNext();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSmartNavigation();
  };
  
  const handleSkipSharing = () => {
    if (logEvent) {
      logEvent('prayer_share_skip_clicked');
    }
    handleContinue();
  };
  
  const handleSharedContinue = () => {
    if (logEvent) {
      logEvent('prayer_share_continue_after_sharing');
    }
    handleContinue();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <OnboardingGradientBackground />


      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + R.h(2),
            paddingBottom: insets.bottom + R.h(4),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim || 1, // Fallback to 1 if animation fails
          }}
        >
          {/* Multiplication Visual */}
          <View style={styles.multiplicationContainer}>
            <Animated.View
              style={[
                styles.itemContainer,
                {
                  transform: [{ scale: breadScale }],
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ]}
            >
              <View style={styles.iconBubble}>
                <Text style={styles.breadEmoji}>🍞</Text>
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: multiplyAnim }}>
              <Ionicons name="add" size={24} color="rgba(255, 215, 0, 0.6)" />
            </Animated.View>

            <Animated.View
              style={[
                styles.itemContainer,
                {
                  transform: [{ scale: fishScale }],
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
              ]}
            >
              <View style={styles.iconBubble}>
                <Text style={styles.fishEmoji}>🐟</Text>
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: multiplyAnim }}>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="rgba(255, 215, 0, 0.6)"
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.itemContainer,
                {
                  opacity: multiplyAnim,
                  transform: [
                    {
                      scale: multiplyAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.iconBubble, styles.miracleBubble]}>
                <Ionicons name="sparkles" size={32} color="#FFD700" />
              </View>
            </Animated.View>
          </View>

          {/* Message */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {config.title || `One Prayer Shared${"\n"}Feeds Many Souls`}
            </Text>
            <Text style={styles.subtitle}>
              {config.subtitle ||
                "Like the loaves and fishes, your simple act multiplies"}
            </Text>
          </View>

          {/* Multiplication Story */}
          <View style={styles.storyContainer}>
            <LinearGradient
              colors={["rgba(255, 215, 0, 0.08)", "rgba(255, 215, 0, 0.02)"]}
              style={styles.storyGradient}
            >
              <MaterialCommunityIcons
                name="book-open-variant"
                size={24}
                color="#FFD700"
                style={{ marginBottom: R.h(1) }}
              />
              <Text style={styles.storyText}>
                Jesus took five loaves and two fish,{"\n"}
                gave thanks, and fed thousands
              </Text>
              <View style={styles.divider} />
              <Text style={styles.applicationText}>
                Your prayer + God's blessing = Countless hearts touched
              </Text>
            </LinearGradient>
          </View>

          

          {/* Share Button */}
          <TouchableOpacity
            style={[
              styles.shareButton,
              hasShared && styles.sharedButton,
              isProcessing && { opacity: 0.6 },
            ]}
            onPress={hasShared ? handleSharedContinue : handleShare}
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={
                hasShared ? ["#4CAF50", "#45A049"] : ["#FFD700", "#FFA500"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareGradient}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={hasShared ? "#FFFFFF" : "#1A1B4B"}
                  />
                  <Text
                    style={[
                      styles.shareText,
                      { color: hasShared ? "#FFFFFF" : "#1A1B4B" },
                    ]}
                  >
                    {hasShared ? "Loading..." : "Checking..."}
                  </Text>
                </>
              ) : hasShared ? (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.shareText}>Continue to App</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="share-variant"
                    size={24}
                    color="#1A1B4B"
                  />
                  <Text style={[styles.shareText, { color: "#1A1B4B" }]}>
                    {config.shareButtonText || "Share This Prayer"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip Option */}
          {!hasShared && (
            <TouchableOpacity
              style={[styles.skipButton, isProcessing && { opacity: 0.6 }]}
              onPress={handleSkipSharing}
              disabled={isProcessing}
            >
              <Text style={styles.skipText}>
                {isProcessing
                  ? "Checking subscription..."
                  : config.skipButtonText || "Keep it personal for now"}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Prayer Share Modal */}
      <PrayerShareModal
        visible={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setHasShared(true);
          // Celebration animation after sharing
          Animated.sequence([
            Animated.timing(breadScale, {
              toValue: 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(breadScale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }}
        prayer={firstPrayerContent || ""}
        verse=""
        timeOfDay={new Date().getHours() < 16 ? "morning" : "evening"}
      />
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: R.w(5),
      minHeight: R.height, // Ensure content has minimum height
    },
    multiplicationContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: R.h(3),
      gap: R.w(2),
    },
    itemContainer: {
      alignItems: "center",
    },
    iconBubble: {
      width: R.w(15),
      height: R.w(15),
      borderRadius: R.w(7.5),
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "rgba(255, 215, 0, 0.2)",
    },
    miracleBubble: {
      width: R.w(18),
      height: R.w(18),
      borderRadius: R.w(9),
      backgroundColor: "rgba(255, 215, 0, 0.15)",
      borderColor: "rgba(255, 215, 0, 0.4)",
    },
    breadEmoji: {
      fontSize: R.font(28),
    },
    fishEmoji: {
      fontSize: R.font(28),
    },
    header: {
      alignItems: "center",
      marginBottom: R.h(3),
    },
    title: {
      fontSize: R.font(32),
      fontFamily: "SNPro-Black",
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: R.h(1),
      letterSpacing: -0.5,
      lineHeight: R.font(36),
    },
    subtitle: {
      fontSize: R.font(15),
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.75)",
      textAlign: "center",
      lineHeight: R.font(22),
    },
    storyContainer: {
      marginBottom: R.h(3),
    },
    storyGradient: {
      borderRadius: R.w(4),
      padding: R.w(5),
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 215, 0, 0.15)",
    },
    storyText: {
      fontSize: R.font(14),
      color: "rgba(255, 255, 255, 0.85)",
      textAlign: "center",
      lineHeight: R.font(20),
      marginBottom: R.h(1.5),
    },
    divider: {
      width: R.w(20),
      height: 1,
      backgroundColor: "rgba(255, 215, 0, 0.3)",
      marginBottom: R.h(1.5),
    },
    applicationText: {
      fontSize: R.font(16),
      fontWeight: "600",
      color: "#FFD700",
      textAlign: "center",
    },
    impactContainer: {
      marginBottom: R.h(3),
    },
    impactTitle: {
      fontSize: R.font(14),
      color: "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      marginBottom: R.h(2),
    },
    impactFlow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: R.w(3),
    },
    impactStep: {
      alignItems: "center",
    },
    impactNumber: {
      width: R.w(10),
      height: R.w(10),
      borderRadius: R.w(5),
      backgroundColor: "rgba(255, 215, 0, 0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: R.h(0.5),
    },
    numberText: {
      fontSize: R.font(18),
      fontWeight: "700",
      color: "#FFD700",
    },
    impactText: {
      fontSize: R.font(11),
      color: "rgba(255, 255, 255, 0.6)",
      textAlign: "center",
    },
    ctaContainer: {
      marginBottom: R.h(2),
    },
    ctaText: {
      fontSize: R.font(16),
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
    },
    shareButton: {
      borderRadius: R.w(3),
      overflow: "hidden",
      marginBottom: R.h(2),
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    sharedButton: {
      shadowColor: "#4CAF50",
    },
    shareGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: R.h(2),
      gap: R.w(2),
    },
    shareText: {
      fontSize: R.font(17),
      fontWeight: "700",
      color: "#FFFFFF",
    },
    skipButton: {
      alignItems: "center",
      paddingVertical: R.h(1),
    },
    skipText: {
      fontSize: R.font(13),
      color: "rgba(255, 255, 255, 0.5)",
      textDecorationLine: "underline",
    },
  });
