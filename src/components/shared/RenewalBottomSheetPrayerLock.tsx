import React, { useEffect, useCallback, useState } from "react";
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
// Adapty imports removed - using RevenueCat instead
import useResponsive from "../../hooks/useResponsive";
import type { PurchasesOfferings, PurchasesPackage } from "react-native-purchases";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75; // Increased from 0.65 to 0.75 for better content fit

interface RenewalBottomSheetPrayerLockProps {
  isVisible: boolean;
  onPaymentSuccess: () => void;
  onPaymentFailure: () => void;
  onClose: () => void;
  products: any[];
  selectedPlan: "weekly" | "annual";
  offering?: PurchasesOfferings | null;
  userStatus?: "expired" | "trial_expired";
}

const RenewalBottomSheetPrayerLock: React.FC<
  RenewalBottomSheetPrayerLockProps
> = ({
  isVisible,
  onPaymentSuccess,
  onPaymentFailure,
  onClose,
  products,
  selectedPlan,
  offering,
  userStatus = "expired",
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

      console.log("[RenewalBottomSheet] Starting renewal purchase");
      console.log("[RenewalBottomSheet] Selected plan:", selectedPlan);
      console.log("[RenewalBottomSheet] Offering:", offering?.current);

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

      console.log("[RenewalBottomSheet] Selected package:", selectedPackage);

      // Make the purchase using RevenueCat service
      const { customerInfo } = await revenueCatService.purchasePackage(selectedPackage);

      console.log(
        "[RenewalBottomSheet] Purchase successful, customer info:",
        customerInfo
      );

      // Check if the user has any active entitlements
      const hasActiveSubscription =
        Object.keys(customerInfo.entitlements.active).length > 0;

      if (hasActiveSubscription) {
        console.log("[RenewalBottomSheet] User has renewed subscription");
        // await logPurchaseSuccess();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPaymentSuccess();
      } else {
        console.log("[RenewalBottomSheet] No active entitlements found");
        throw new Error("Purchase completed but no active subscription found");
      }
    } catch (error: any) {
      console.error("[RenewalBottomSheet] Purchase error:", error);

      // Check if user cancelled the purchase
      if (error.userCancelled) {
        console.log("[RenewalBottomSheet] Purchase cancelled by user");
        onClose();
        return;
      }

      // await logPurchaseFailure(); 

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
  const getContent = () => {
    // All users seeing this sheet are expired or trial_expired
    return {
      icon: "refresh-circle",
      iconColor: "#4CAF50",
      title: "Time to Renew 📿",
      subtitle:
        "Your subscription has expired, but your spiritual journey doesn't have to pause.",
      planType:
        selectedPlan === "weekly" ? "🌟 RESTART WEEKLY" : "🌟 RESTART YEARLY",
      description: "Reconnect with your daily prayer practice",
      features: [
        "Restore your personalized prayers",
        "Access all your prayer history",
        "Continue growing in faith",
      ],
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
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={content.icon as any}
                  size={R.w(8)}
                  color={content.iconColor}
                />
              </View>
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.subtitle}>{content.subtitle}</Text>
            </View>

            {/* Renewal Plan Summary */}
            <View style={styles.planSummary}>
              <View style={styles.planHeader}>
                <Text style={styles.planType}>{content.planType}</Text>
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
                      size={16}
                      color="#4CAF50"
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Renewal Button */}
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
                colors={["#4CAF50", "#45A049"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.renewalGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="refresh"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.renewalButtonText}>
                      Renew Subscription
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

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

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheetContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
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
    marginBottom: 32,
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
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  planSummary: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  planType: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFD700",
    letterSpacing: 0.5,
  },
  savingsBadge: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  planDetails: {
    alignItems: "center",
    marginBottom: 12,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
  },
  renewalDescription: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 16,
  },
  planFeatures: {
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
  },
  renewalButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  renewalButtonDisabled: {
    opacity: 0.6,
  },
  renewalGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  renewalButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
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
  },
});

export default RenewalBottomSheetPrayerLock;
