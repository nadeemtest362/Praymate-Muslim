import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import useResponsive from "../../hooks/useResponsive";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { getSimpleSubscriptionStatus } from "../../utils/subscriptionManager";

interface PraylockModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: () => void;
  onGetStarted?: () => void;
}

const PraylockModal: React.FC<PraylockModalProps> = ({
  visible,
  onClose,
  onNavigate,
  onGetStarted,
}) => {
  const R = useResponsive();
  const router = useRouter();
  const { updateUIFlag } = useAuth();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 150 });
      scale.value = withSequence(
        withTiming(1.1, { duration: 200, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
    } else {
      opacity.value = 0;
      scale.value = 0;
    }
  }, [visible, opacity, scale]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleGetStarted = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    onNavigate?.();

    // Mark that user has seen praylock intro (safe addition - won't break existing)
    updateUIFlag("has_seen_praylock_intro", true);

    // Check subscription status and update UI flag accordingly
    // try {
    //   const subscriptionStatus = await getSimpleSubscriptionStatus();
    //   const hasActiveSubscription =
    //     subscriptionStatus === "active" ||
    //     subscriptionStatus === "trial_active";
    //   updateUIFlag("has_seen_praylock_intro", hasActiveSubscription);
    // } catch (error) {
    //   console.error("Error checking subscription status:", error);
    //   updateUIFlag("has_seen_praylock_intro", false);
    // }

    // Use the custom handler if provided (for subscription check), otherwise use default behavior
    if (onGetStarted) {
      onGetStarted();
    } else {
      router.push({
        pathname: "/praylock-setup",
        params: { isEnabled: "false" },
      });
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalOverlay: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        container: {
          width: "85%",
          maxWidth: 400,
          borderRadius: R.w(6),
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10,
        },
        gradient: {
          padding: R.w(8),
        },
        content: {
          alignItems: "center",
        },
        iconContainer: {
          alignItems: "center",
          justifyContent: "center",
          marginBottom: R.h(2),
        },
        title: {
          fontSize: R.font(56),
          fontFamily: "SNPro-Black",
          color: "white",
          textAlign: "center",
          marginBottom: R.h(0.5),
          letterSpacing: -1.5,
        },
        subtitle: {
          fontSize: R.font(24),
          fontFamily: "SNPro-Bold",
          color: "#FFD700",
          textAlign: "center",
          marginBottom: R.h(3),
        },
        description: {
          fontSize: R.font(18),
          fontFamily: "SNPro-Medium",
          color: "rgba(255, 255, 255, 0.85)",
          textAlign: "center",
          lineHeight: R.lineHeight(18),
          marginBottom: R.h(4),
          paddingHorizontal: R.w(2),
        },
        featureList: {
          width: "100%",
          marginBottom: R.h(4),
        },
        featureItem: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: R.h(2.5),
          paddingHorizontal: R.w(2),
        },
        featureEmoji: {
          width: R.w(8),
          height: R.w(8),
          marginRight: R.w(3),
        },
        featureText: {
          flex: 1,
          fontSize: R.font(18),
          color: "rgba(255, 255, 255, 0.9)",
          lineHeight: R.lineHeight(15),
          fontFamily: "SNPro-Bold",
          marginLeft: R.w(1),
        },
        primaryButton: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderRadius: R.w(5),
          paddingVertical: R.h(2),
          paddingHorizontal: R.w(8),
          shadowColor: "rgba(255, 255, 255, 0.5)",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 5,
        },
        buttonText: {
          color: "#7C3AED",
          fontSize: R.font(18),
          fontFamily: "SNPro-Black",
          textAlign: "center",
        },
        requirements: {
          marginTop: R.h(3),
        },
        requirementsText: {
          fontSize: R.font(12),
          color: "rgba(255, 255, 255, 0.6)",
          textAlign: "center",
          lineHeight: R.lineHeight(12),
        },
      }),
    [R]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View style={[styles.container, animatedContainerStyle]}>
          <LinearGradient
            colors={["#8B5FBF", "#7C3AED", "#6B21A8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Image
                  source={require("../../../assets/images/praylock-icon.png")}
                  style={{ width: 100, height: 100 }}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.title}>PRAYBLOCK</Text>
              <Text style={styles.subtitle}>
                Turn Distraction Into Devotion
              </Text>

              <Text style={styles.description}>
                Block distracting apps until you complete your morning/evening prayer.
                Build a positive prayer habit.
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Image
                    source={require("../../../assets/images/praylock-icon.png")}
                    style={styles.featureEmoji}
                    resizeMode="contain"
                  />
                  <Text style={styles.featureText}>
                    Apps stay locked until you pray
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <Image
                    source={require("../../../assets/images/morning1.png")}
                    style={styles.featureEmoji}
                    resizeMode="contain"
                  />
                  <Text style={styles.featureText}>
                    Resets at 4am for a fresh start
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <Image
                    source={require("../../../assets/images/jesus-old.png")}
                    style={styles.featureEmoji}
                    resizeMode="contain"
                  />
                  <Text style={styles.featureText}>
                    Start with God, not social media
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Get Started</Text>
              </TouchableOpacity>

              <View style={styles.requirements}>
                <Text style={styles.requirementsText}>
                  Requires iOS 16+ • Uses Family Controls
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

export default PraylockModal;
