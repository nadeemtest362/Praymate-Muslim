import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { revenueCatService } from "../../lib/revenueCatService";
import useResponsive from "../../hooks/useResponsive";
import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases";
import { captureException } from "../../lib/sentry";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75; // Increased from 0.65 to 0.75 for better content fit


interface RenewalBottomSheetProps {
  isVisible: boolean;
  onPaymentSuccess: () => void;
  onPaymentFailure: () => void;
  onClose: () => void;
  products: any[];
  selectedPlan: "weekly" | "annual";
  offering?: PurchasesOfferings | null;
  userStatus?: "expired" | "trial_expired";
  logEvent?: (eventName: string, properties?: Record<string, any>) => void;
  paywallSource?: 'prayer_begin' | 'journey_upgrade' | 'praylock_toggle' | null;
}


const RenewalBottomSheet: React.FC<RenewalBottomSheetProps> = ({
  isVisible,
  onPaymentSuccess,
  onPaymentFailure,
  onClose,
  products,
  selectedPlan,
  offering,
  userStatus = "expired",
  logEvent,
  paywallSource,
}) => {
  const R = useResponsive();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);
  const [isLoading, setIsLoading] = useState(false);

  const scrollTo = useCallback(
    (destination: number) => {
      "worklet";
      translateY.value = withSpring(destination, {
        damping: 45,
        stiffness: 350,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });
    },
    [translateY]
  );

  useEffect(() => {
    if (isVisible) {
      scrollTo(0);
    } else {
      scrollTo(SHEET_HEIGHT);
    }
  }, [isVisible, scrollTo]);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (logEvent && paywallSource) {
        logEvent(`${paywallSource}_paywall_cta_clicked`, {
          selected_plan: selectedPlan,
          user_status: userStatus,
          paywall_type: 'renewal',
        });
      }

      // Get the selected package from offering
      if (!offering?.current) {
        throw new Error("No subscription packages available");
      }

      let selectedPackage: PurchasesPackage | null = null;

      if (selectedPlan === "weekly" && offering.current.weekly) {
        selectedPackage = offering.current.weekly;
      } else if (selectedPlan === "annual" && offering.current.annual) {
        selectedPackage = offering.current.annual;
      }

      if (!selectedPackage) {
        // Fallback to available packages
        const availablePackages = offering.current.availablePackages;
        if (availablePackages.length > 0) {
          selectedPackage =
            selectedPlan === "weekly"
              ? availablePackages.find((pkg: any) => pkg.packageType === "WEEKLY") ||
                availablePackages[0]
              : availablePackages.find((pkg: any) => pkg.packageType === "ANNUAL") ||
                availablePackages[0];
        }
      }

      if (!selectedPackage) {
        throw new Error("No subscription package found for selected plan");
      }

      // Make the purchase using RevenueCat service
      const { customerInfo } = await revenueCatService.purchasePackage(selectedPackage);

      // Check if the user has any active entitlements
      const hasActiveSubscription =
        Object.keys(customerInfo.entitlements.active).length > 0;

      if (hasActiveSubscription) {
        // Purchase success logged via RevenueCat
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPaymentSuccess();
      } else {
        throw new Error("Purchase completed but no active subscription found");
      }
    } catch (error: any) {
      // Check if user cancelled the purchase (expected; no logging/capture)
      if (error?.userCancelled) {
        onClose();
        return;
      }

      console.error("[RenewalBottomSheet] Purchase error:", error?.message || String(error));
      captureException(error, { area: "renewalBottomSheet.purchase" });

      // Purchase failure logged via RevenueCat

      Alert.alert(
        "Renewal Failed",
        error.message || "Something went wrong. Please try again.",
        [
          { text: "Cancel", style: "cancel", onPress: onClose },
          { text: "Try Again", onPress: () => handlePayment() },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const styles = useMemo(() => createStyles(R), [R.width, R.height]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SHEET_HEIGHT],
      [0.7, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity: withTiming(opacity, { duration: 300 }),
    };
  });

  // Get the selected package and its pricing (no free trial for returning users)
  const getSelectedPackageInfo = () => {
    if (!offering?.current) {
      return {
        price: selectedPlan === "weekly" ? "$4.99" : "$49.99",
        package: null,
      };
    }

    let selectedPackage: PurchasesPackage | null = null;

    if (selectedPlan === "weekly" && offering.current.weekly) {
      selectedPackage = offering.current.weekly;
    } else if (selectedPlan === "annual" && offering.current.annual) {
      selectedPackage = offering.current.annual;
    } else {
      // Fallback to available packages
      const availablePackages = offering.current.availablePackages;
      if (availablePackages.length > 0) {
        selectedPackage =
          selectedPlan === "weekly"
            ? availablePackages.find((pkg: any) => pkg.packageType === "WEEKLY") ||
              availablePackages[0]
            : availablePackages.find((pkg: any) => pkg.packageType === "ANNUAL") ||
              availablePackages[0];
      }
    }

    const price =
      selectedPackage?.product?.priceString ||
      (selectedPlan === "weekly" ? "$4.99" : "$49.99");

    // No free trial for returning users
    return { price, package: selectedPackage };
  };

  const { price: selectedProductPrice, package: selectedPackage } =
    getSelectedPackageInfo();

  // Dynamic content based on user status
  // NOTE: This component is ONLY shown to users who are NOT trial eligible
  // (expired or trial_expired users)
  const getHeadline = () => {
    switch (paywallSource) {
      case 'prayer_begin':
        return 'Welcome Back — Renew Your Prayer Journey';
      case 'journey_upgrade':
        return 'Restore Your Prayer Journey';
      case 'praylock_toggle':
        return 'Renew to Unlock PRAYBLOCK';
      default:
        return 'Renew Praymate+ 🙏';
    }
  };

  const getContent = () => {
    // All users seeing this sheet are expired or trial_expired - NOT eligible for trial
    return {
      title: getHeadline(),
      subtitle:
        "Continue your prayer journey with us.",
      description: "Deepen your faith with daily talks with God",
      features: [
        "Personalized daily prayers",
        "Prayer journey tracking",
        "Unlimited prayer intentions",
        "Cancel anytime",
      ],
      buttonText: "Subscribe Now",
    };
  };

  const content = getContent();

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />

      <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
        <LinearGradient
          colors={["#1A1B4B", "#2D1854", "#4A1C5A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={styles.topGlow} />

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.mainContent}>
            {/* Header */}
            <View style={styles.header}>
              
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.subtitle}>{content.subtitle}</Text>
            </View>

            {/* Subscription Title - Required by Apple Guideline 3.1.2 */}
            <View style={styles.subscriptionTitleContainer}>
              <Text style={styles.subscriptionTitle}>
                {selectedPackage?.product?.title || "Praymate+"}
              </Text>
            </View>

            {/* Renewal Plan Summary */}
            <View style={styles.planSummary}>
              <View style={styles.planHeader}>
                <Text style={styles.planType}>
                  {selectedPlan === "weekly" ? "Praymate Plus - Weekly Access" : "Praymate Plus - Annual Access"}
                </Text>
                {selectedPlan === "annual" && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>BEST VALUE</Text>
                  </View>
                )}
              </View>

              <View style={styles.planDetails}>
                <Text style={styles.planPrice}>{selectedProductPrice}</Text>
                <Text style={styles.planDescription}>
                  {selectedPlan === "weekly" ? "per week" : "per year"}
                </Text>
              </View>

              <Text style={styles.renewalDescription}>
                {content.description}
              </Text>

              <View style={styles.planFeatures}>
                {content.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={R.w(5)}
                      color="#4CAF50"
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Renewal Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.renewalButton,
                    isLoading && styles.renewalButtonDisabled,
                  ]}
                  onPress={handlePayment}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={["#FFD700", "#FF8C42"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.renewalGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#1A1B4B" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="crown-outline"
                          size={R.w(5)}
                          color="#1A1B4B"
                        />
                        <Text style={styles.renewalButtonText}>
                        {content.buttonText}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Trust Indicators */}
            <View style={styles.trustSection}>
              <View style={styles.trustItem}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color="#4CAF50"
                />
                <Text style={styles.trustText}>
                  Secure payment via App Store
                </Text>
              </View>
              <View style={styles.trustItem}>
                <MaterialCommunityIcons
                  name="refresh"
                  size={16}
                  color="#4CAF50"
                />
                <Text style={styles.trustText}>Cancel anytime</Text>
              </View>
            </View>

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              Subscription will auto-renew unless cancelled 24 hours before the
              current period ends. Your prayer data will be preserved.
            </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheetContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    marginBottom: 16,
    height: SHEET_HEIGHT + 120, // Increased from 100 to 120 for better content fit
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  closeButton: {
    position: "absolute",
    opacity: 0.5,
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
   
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Extra padding at bottom for better scrolling
  },
  mainContent: {
    flex: 1,
    paddingTop: 42, // Increased from 32 to 42 (32 + 10px padding)
  },
  header: {
    alignItems: "center",
    marginBottom: R.h(2),
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  title: {
    fontSize: R.font(32),
    fontFamily: "SNPro-Black",
   
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: R.h(1),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: R.font(18),
    fontFamily: "SNPro-Bold",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: R.lineHeight(18),
    paddingHorizontal: 16,
  },
  subscriptionTitleContainer: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderRadius: R.w(4),
    paddingVertical: R.h(1.5),
    paddingHorizontal: R.w(6),
    marginBottom: R.h(2),
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
    alignItems: "center",
  },
  subscriptionTitle: {
    fontSize: R.font(20),
    fontFamily: "SNPro-Bold",
    color: "#FFD700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  planSummary: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: R.w(5),
    padding: 0,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  planHeader: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingVertical: R.h(1.5),
    paddingHorizontal: R.w(5),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  planType: {
    fontSize: R.font(15),
    fontFamily: "SNPro-Bold",
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.95)",
    flex: 1,
  },
  savingsBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: R.w(3),
    paddingVertical: R.h(0.5),
    borderRadius: R.w(2),
  },
  savingsBadgeText: {
    fontSize: R.font(12),
    fontWeight: "800",
    color: "#1A1B4B",
    letterSpacing: 0.5,
  },
  planDetails: {
    alignItems: "center",
    paddingVertical: R.h(3),
    paddingHorizontal: R.w(5),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  trialBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: R.w(3),
    paddingVertical: R.h(0.5),
    borderRadius: R.w(2),
    marginBottom: R.h(1),
  },
  trialBadgeText: {
    fontSize: R.font(12),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  planPrice: {
    fontSize: R.font(48),
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: R.font(52),
  },
  planDescription: {
    fontSize: R.font(16),
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: R.h(0.5),
  },
  renewalDescription: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingVertical: R.h(2),
    paddingHorizontal: R.w(5),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  planFeatures: {
    paddingTop: R.h(2.5),
    paddingHorizontal: R.w(5),
    paddingBottom: R.h(1.5),
    gap: R.h(1.5),
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: R.w(3),
  },
  featureText: {
    fontSize: R.font(15),
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.95)",
    flex: 1,
  },
  buttonContainer: {
    padding: R.w(5),
    paddingTop: 0,
  },
  renewalButton: {
    borderRadius: R.w(4),
    overflow: "hidden",
  },
  renewalButtonDisabled: {
    opacity: 0.6,
  },
  renewalGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: R.h(2.5),
    gap: R.w(2),
  },
  renewalButtonText: {
    fontSize: R.font(18),
    fontWeight: "800",
    color: "#1A1B4B",
    letterSpacing: -0.3,
  },
  trustSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  disclaimer: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    lineHeight: 15,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default RenewalBottomSheet;
