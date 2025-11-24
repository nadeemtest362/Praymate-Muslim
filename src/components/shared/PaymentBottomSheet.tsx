import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { revenueCatService } from "../../lib/revenueCatService";
import type {
    PurchasesOfferings,
    PurchasesPackage,
} from "react-native-purchases";
// Adapty imports removed - using RevenueCat instead
import { SUBSCRIPTION_PRODUCTS } from "../../config/constants";
import useResponsive from "../../hooks/useResponsive";
import { captureException } from "../../lib/sentry";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

interface PaymentBottomSheetProps {
    isVisible: boolean;
    onPaymentSuccess: () => void;
    onPaymentFailure: () => void;
    onClose: () => void;
    products: any[];
    selectedPlan: "weekly" | "annual";
    offering?: PurchasesOfferings | null;
    customPackageIdentifier?: string;
    logEvent?: (eventName: string, properties?: Record<string, any>) => void;
    paywallSource?: 'prayer_begin' | 'journey_upgrade' | 'praylock_toggle' | null;
}

const PaymentBottomSheet: React.FC<PaymentBottomSheetProps> = ({
    isVisible,
    onPaymentSuccess,
    onPaymentFailure,
    onClose,
    products,
    selectedPlan,
    offering,
    customPackageIdentifier,
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
        [translateY],
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
                    paywall_type: 'payment',
                });
            }

            // Get the selected package from offering
            if (!offering?.current) {
                throw new Error("No subscription packages available");
            }

            let selectedPackage: PurchasesPackage | null = null;

            // Check for custom package identifier first
            if (customPackageIdentifier) {
                selectedPackage = offering.current.availablePackages.find(
                    (pkg: any) => pkg.identifier === customPackageIdentifier,
                ) || null;
            }

            // Fall back to default plan-based selection
            if (!selectedPackage) {
                if (selectedPlan === "weekly" && offering.current.weekly) {
                    selectedPackage = offering.current.weekly;
                } else if (
                    selectedPlan === "annual" && offering.current.annual
                ) {
                    selectedPackage = offering.current.annual;
                }
            }

            if (!selectedPackage) {
                // Fallback to available packages
                const availablePackages = offering.current.availablePackages;
                if (availablePackages.length > 0) {
                    selectedPackage = selectedPlan === "weekly"
                        ? availablePackages.find((pkg: any) =>
                            pkg.packageType === "WEEKLY"
                        ) ||
                            availablePackages[0]
                        : availablePackages.find((pkg: any) =>
                            pkg.packageType === "ANNUAL"
                        ) ||
                            availablePackages[0];
                }
            }

            if (!selectedPackage) {
                throw new Error(
                    "No subscription package found for selected plan",
                );
            }

            // Make the purchase using RevenueCat service
            const { customerInfo } = await revenueCatService.purchasePackage(
                selectedPackage,
            );

            // Check if the user has any active entitlements
            const hasActiveSubscription =
                Object.keys(customerInfo.entitlements.active).length > 0;

            if (hasActiveSubscription) {
                // Purchase success logged via RevenueCat
                Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                );
                onPaymentSuccess();
            } else {
                throw new Error(
                    "Purchase completed but no active subscription found",
                );
            }
        } catch (error: any) {
            // Check if user cancelled the purchase (expected; no logging/capture)
            if (error?.userCancelled) {
                onClose();
                return;
            }

            console.error(
                "[PaymentBottomSheet] Purchase error:",
                error?.message || String(error),
            );
            captureException(error, { area: "paymentBottomSheet.purchase" });

            // Purchase failure logged via RevenueCat

            Alert.alert(
                "Purchase Failed",
                error.message || "Something went wrong. Please try again.",
                [
                    { text: "Cancel", style: "cancel", onPress: onClose },
                    { text: "Try Again", onPress: () => handlePayment() },
                ],
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };
    const styles = useMemo(() => createStyles(R), [R.width, R.height]);
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
            Extrapolate.CLAMP,
        );
        return {
            opacity: withTiming(opacity, { duration: 300 }),
        };
    });

    // Get the selected package and its pricing
    const getSelectedPackageInfo = () => {
        if (!offering?.current) {
            return {
                price: selectedPlan === "weekly" ? "$4.99" : "$49.99",
                isFreeTrial: false,
                package: null,
            };
        }

        let selectedPackage: PurchasesPackage | null = null;

        // Check for custom package identifier first
        if (customPackageIdentifier) {
            selectedPackage = offering.current.availablePackages.find(
                (pkg: any) => pkg.identifier === customPackageIdentifier,
            ) || null;
        }

        // Fall back to default plan-based selection
        if (!selectedPackage) {
            if (selectedPlan === "weekly" && offering.current.weekly) {
                selectedPackage = offering.current.weekly;
            } else if (selectedPlan === "annual" && offering.current.annual) {
                selectedPackage = offering.current.annual;
            } else {
                // Fallback to available packages
                const availablePackages = offering.current.availablePackages;
                if (availablePackages.length > 0) {
                    selectedPackage = selectedPlan === "weekly"
                        ? availablePackages.find((pkg: any) =>
                            pkg.packageType === "WEEKLY"
                        ) ||
                            availablePackages[0]
                        : availablePackages.find((pkg: any) =>
                            pkg.packageType === "ANNUAL"
                        ) ||
                            availablePackages[0];
                }
            }
        }

        const price = selectedPackage?.product?.priceString ||
            (selectedPlan === "weekly" ? "$4.99" : "$49.99");
        const isFreeTrial = selectedPackage?.product?.introPrice !== null &&
            selectedPackage?.product?.introPrice !== undefined;

        return { price, isFreeTrial, package: selectedPackage };
    };

    const {
        price: selectedProductPrice,
        isFreeTrial,
        package: selectedPackage,
    } = getSelectedPackageInfo();

    const getHeadline = () => {
        switch (paywallSource) {
            case 'prayer_begin':
                return 'Start Your Days With God';
            case 'journey_upgrade':
                return 'Unlock Your Complete Prayer Journey';
            case 'praylock_toggle':
                return 'Block Distractions. Prioritize Prayer.';
            default:
                return "You're Just One Step Away";
        }
    };

    if (!isVisible) return null;

    return (
        <View style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.backdrop, animatedBackdropStyle]} />

            <Animated.View style={[styles.sheetContainer, animatedSheetStyle]}>
                <LinearGradient
                    colors={["#2D1854", "#1B1740", "#0F0A2C"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.content, {
                        paddingBottom: insets.bottom + 24,
                    }]}
                >
                    <View style={styles.topGlow} />

                    {/* Close Button */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleClose}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="close"
                            size={24}
                            color="rgba(255, 255, 255, 0.8)"
                        />
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
                              
                                <Text style={styles.title}>
                                    {getHeadline()}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {isFreeTrial
                                        ? "Support the mission and get access to all Praymate+ features free for 3 days"
                                        : "Unlock your personalized prayer experience with premium access"}
                                </Text>
                            </View>

                            {/* Subscription Title - Required by Apple Guideline 3.1.2 */}
                            <View style={styles.subscriptionTitleContainer}>
                                <Text style={styles.subscriptionTitle}>
                                    {selectedPackage?.product?.title || "Praymate+"}
                                </Text>
                            </View>

                            {/* How Your Free Trial Works / Plan Summary */}
                            <View style={styles.planSummary}>
                                {isFreeTrial
                                    ? (
                                        <>
                                            <Text style={styles.timelineTitle}>
                                                How your free access trial works
                                            </Text>

                                            {/* Timeline Item 1: Today */}
                                            <View style={styles.timelineItem}>
                                                <View
                                                    style={styles
                                                        .timelineIconContainer}
                                                >
                                                    <View
                                                        style={[
                                                            styles.timelineIcon,
                                                            styles
                                                                .timelineIconActive,
                                                        ]}
                                                    >
                                                        <MaterialCommunityIcons
                                                            name="gift"
                                                            size={20}
                                                            color="#1A1B4B"
                                                        />
                                                    </View>
                                                    <View
                                                        style={styles
                                                            .timelineLineConnector}
                                                    />
                                                </View>
                                                <View
                                                    style={styles
                                                        .timelineContent}
                                                >
                                                    <Text
                                                        style={styles
                                                            .timelineDate}
                                                    >
                                                        Today: Get instant
                                                        access
                                                    </Text>
                                                    <Text
                                                        style={styles
                                                            .timelineDescription}
                                                    >
                                                        Start your journey with
                                                        personalized daily
                                                        prayers
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Timeline Item 2: Trial Reminder */}
                                            <View style={styles.timelineItem}>
                                                <View
                                                    style={styles
                                                        .timelineIconContainer}
                                                >
                                                    <View
                                                        style={styles
                                                            .timelineIcon}
                                                    >
                                                        <MaterialCommunityIcons
                                                            name="bell-outline"
                                                            size={20}
                                                            color="rgba(255, 255, 255, 0.6)"
                                                        />
                                                    </View>
                                                    <View
                                                        style={styles
                                                            .timelineLineConnector}
                                                    />
                                                </View>
                                                <View
                                                    style={styles
                                                        .timelineContent}
                                                >
                                                    <Text
                                                        style={styles
                                                            .timelineDate}
                                                    >
                                                        {(() => {
                                                            const reminderDate =
                                                                new Date();
                                                            reminderDate
                                                                .setDate(
                                                                    reminderDate
                                                                        .getDate() +
                                                                        2,
                                                                );
                                                            return reminderDate
                                                                .toLocaleDateString(
                                                                    "en-US",
                                                                    {
                                                                        month:
                                                                            "short",
                                                                        day: "numeric",
                                                                        year:
                                                                            "numeric",
                                                                    },
                                                                );
                                                        })()}: Trial reminder
                                                    </Text>
                                                    <Text
                                                        style={styles
                                                            .timelineDescription}
                                                    >
                                                        We'll send you a
                                                        reminder. Cancel
                                                        anytime.
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Timeline Item 3: Trial Ends */}
                                            <View style={styles.timelineItem}>
                                                <View
                                                    style={styles
                                                        .timelineIconContainer}
                                                >
                                                    <View
                                                        style={styles
                                                            .timelineIcon}
                                                    >
                                                        <MaterialCommunityIcons
                                                            name="currency-usd"
                                                            size={20}
                                                            color="rgba(255, 255, 255, 0.6)"
                                                        />
                                                    </View>
                                                </View>
                                                <View
                                                    style={[
                                                        styles.timelineContent,
                                                        { paddingBottom: 0 },
                                                    ]}
                                                >
                                                    <Text
                                                        style={styles
                                                            .timelineDate}
                                                    >
                                                        {(() => {
                                                            const endDate =
                                                                new Date();
                                                            endDate.setDate(
                                                                endDate
                                                                    .getDate() +
                                                                    3,
                                                            );
                                                            return endDate
                                                                .toLocaleDateString(
                                                                    "en-US",
                                                                    {
                                                                        month:
                                                                            "short",
                                                                        day: "numeric",
                                                                        year:
                                                                            "numeric",
                                                                    },
                                                                );
                                                        })()}: Trial ends
                                                    </Text>
                                                    <View
                                                        style={styles
                                                            .billingAmountContainer}
                                                    >
                                                        <Text
                                                            style={styles
                                                                .billingAmount}
                                                        >
                                                            {selectedProductPrice}
                                                        </Text>
                                                        <Text
                                                            style={styles
                                                                .billingPeriod}
                                                        >
                                                            per week
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        style={styles
                                                            .timelineDescription}
                                                    >
                                                        {`You'll be charged this amount unless you cancel before trial ends.`}
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    )
                                    : (
                                        <>
                                            <View style={styles.planHeader}>
                                                <Text style={styles.planType}>
                                                    💎 YEARLY ACCESS
                                                </Text>
                                                {selectedPlan === "annual" && (
                                                    <View
                                                        style={styles
                                                            .savingsBadge}
                                                    >
                                                        <Text
                                                            style={styles
                                                                .savingsBadgeText}
                                                        >
                                                            BEST VALUE
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.planDetails}>
                                                <Text style={styles.planPrice}>
                                                    {selectedProductPrice}
                                                </Text>
                                                <Text
                                                    style={styles
                                                        .planDescription}
                                                >
                                                    {selectedPlan === "weekly"
                                                        ? "per week"
                                                        : "per year"}
                                                </Text>
                                            </View>

                                            <View style={styles.planFeatures}>
                                                <View
                                                    style={styles.featureItem}
                                                >
                                                    <MaterialCommunityIcons
                                                        name="check"
                                                        size={16}
                                                        color="#4CAF50"
                                                    />
                                                    <Text
                                                        style={styles
                                                            .featureText}
                                                    >
                                                        Personalized daily
                                                        prayers
                                                    </Text>
                                                </View>
                                                <View
                                                    style={styles.featureItem}
                                                >
                                                    <MaterialCommunityIcons
                                                        name="check"
                                                        size={16}
                                                        color="#4CAF50"
                                                    />
                                                    <Text
                                                        style={styles
                                                            .featureText}
                                                    >
                                                        Prayer journey tracking
                                                    </Text>
                                                </View>
                                                <View
                                                    style={styles.featureItem}
                                                >
                                                    <MaterialCommunityIcons
                                                        name="check"
                                                        size={16}
                                                        color="#4CAF50"
                                                    />
                                                    <Text
                                                        style={styles
                                                            .featureText}
                                                    >
                                                        Unlimited prayer
                                                        intentions
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                            </View>

                            {/* Payment Button */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentButton,
                                    isLoading && styles.paymentButtonDisabled,
                                ]}
                                onPress={handlePayment}
                                disabled={isLoading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={["#FFD700", "#FF8C42"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.paymentGradient}
                                >
                                    {isLoading
                                        ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="#1A1B4B"
                                            />
                                        )
                                        : (
                                            <>
                                                <MaterialCommunityIcons
                                                    name="lock-outline"
                                                    size={20}
                                                    color="#1A1B4B"
                                                />
                                                <Text
                                                    style={styles
                                                        .paymentButtonText}
                                                >
                                                    {isFreeTrial
                                                        ? "TRY PRAYMATE+ FREE"
                                                        : "Subscribe Now"}
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
                                    <Text style={styles.trustText}>
                                        Cancel anytime
                                    </Text>
                                </View>
                            </View>

                            {/* Footer Links */}
                            <View style={styles.footerLinks}>
                                <TouchableOpacity
                                    onPress={() =>
                                        Linking.openURL(
                                            "https://trypraymate.com/#terms",
                                        )}
                                >
                                    <Text style={styles.footerLink}>Terms</Text>
                                </TouchableOpacity>
                                <Text style={styles.footerDivider}>•</Text>
                                <TouchableOpacity
                                    onPress={() =>
                                        Linking.openURL(
                                            "https://trypraymate.com/#privacy",
                                        )}
                                >
                                    <Text style={styles.footerLink}>
                                        Privacy
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.footerDivider}>•</Text>
                                <TouchableOpacity
                                    onPress={() =>
                                        Linking.openURL(
                                            "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
                                        )}
                                >
                                    <Text style={styles.footerLink}>EULA</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Disclaimer */}
                            <Text style={styles.disclaimer}>
                                {isFreeTrial
                                    ? "Free trial automatically continues to paid subscription unless cancelled 24 hours before trial ends."
                                    : "Subscription will auto-renew unless cancelled 24 hours before the current period ends."}
                            </Text>
                        </View>
                    </ScrollView>
                </LinearGradient>
            </Animated.View>
        </View>
    );
};

const createStyles = (R: ReturnType<typeof useResponsive>) =>
    StyleSheet.create({
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
            borderTopLeftRadius: R.w(12),
            borderTopRightRadius: R.w(12),
            paddingHorizontal: R.w(6),
            shadowColor: "#000",
            shadowOpacity: 0.4,
            shadowRadius: R.w(12),
            shadowOffset: { width: 0, height: R.h(-8) },
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
            top: R.h(2),
            right: R.w(6),
            zIndex: 10,
            padding: 8,
            opacity: 0.35,
        },
        scrollContainer: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            paddingBottom: R.h(6),
        },
        mainContent: {
            flex: 1,
            paddingTop: R.h(4.5),
        },
        header: {
            alignItems: "center",
            marginBottom: R.h(2),
        },
        iconContainer: {
            width: R.w(12),
            height: R.w(12),
            borderRadius: R.w(6),
            backgroundColor: "rgba(255, 215, 0, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: R.h(2),
            borderWidth: 2,
            borderColor: "rgba(255, 215, 0, 0.3)",
        },
        title: {
            fontSize: R.font(32),
            fontFamily: "SNPro-Black",
            color: "#FFFFFF",
            textAlign: "center",
            marginTop: R.h(2),
            marginBottom: R.h(1),
            letterSpacing: -0.5,
        },
        subtitle: {
            fontSize: R.font(18),
            fontFamily: "SNPro-Regular",
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            lineHeight: R.lineHeight(20),
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
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderRadius: R.w(8),
            padding: 20,
            marginBottom: R.h(1.5),
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.15)",
        },
        timelineTitle: {
            fontSize: R.font(18),
            fontFamily: "SNPro-Bold",
            color: "#FFFFFF",
            marginBottom: R.h(2.5),
            textAlign: "left",
        },
        timelineItem: {
            flexDirection: "row",
            marginBottom: R.h(0.5),
        },
        timelineIconContainer: {
            alignItems: "center",
            marginRight: R.w(3),
        },
        timelineIcon: {
            width: R.w(8),
            height: R.w(8),
            borderRadius: R.w(4),
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            alignItems: "center",
            justifyContent: "center",
        },
        timelineIconActive: {
            backgroundColor: "#FFD700",
        },
        timelineLineConnector: {
            width: R.w(0.5),
            flex: 1,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            marginTop: R.h(0.5),
            marginBottom: R.h(0.5),
        },
        timelineContent: {
            flex: 1,
            paddingBottom: 24,
        },
        timelineDate: {
            fontSize: R.font(16),
            fontFamily: "SNPro-Bold",
            color: "#FFFFFF",
            marginBottom: R.h(0.5),
        },
        timelineDescription: {
            fontSize: R.font(16),
            fontFamily: "SNPro-Regular",
            color: "rgba(255, 255, 255, 0.7)",
            lineHeight: R.lineHeight(18),
        },
        planHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: R.h(1.5),
        },
        planType: {
            fontSize: R.font(16),
            fontFamily: "SNPro-Bold",
            color: "#FFD700",
            letterSpacing: 0.5,
        },
        savingsBadge: {
            backgroundColor: "#FF6B6B",
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: R.w(4),
        },
        savingsBadgeText: {
            fontSize: R.font(12),
            fontFamily: "SNPro-Bold",
            color: "#FFFFFF",
            letterSpacing: 0.5,
        },
        planDetails: {
            alignItems: "center",
            marginBottom: 16,
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
        paymentButton: {
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 20,
        },
        paymentButtonDisabled: {
            opacity: 0.6,
        },
        paymentGradient: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 18,
            gap: 8,
        },
        paymentButtonText: {
            fontSize: R.font(20),
            fontFamily: "SNPro-Black",
            color: "#1A1B4B",
            letterSpacing: -0.3,
        },
        trustSection: {
            flexDirection: "row",
            justifyContent: "space-around",
            marginBottom: R.h(2),
            paddingHorizontal: R.w(6),
        },
        trustItem: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
        },
        trustText: {
            fontSize: R.font(16),
            fontFamily: "SNPro-Regular",
            color: "rgba(255, 255, 255, 0.8)",
        },
        disclaimer: {
            fontSize: R.font(14),
            fontFamily: "SNPro-Regular",
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "center",
            lineHeight: R.lineHeight(18),
            paddingHorizontal: R.w(6),
            paddingBottom: R.h(2),
        },
        billingAmountContainer: {
            alignItems: "flex-start",
            marginTop: R.h(1.2),
            marginBottom: R.h(0.8),
            paddingVertical: R.h(0.8),
            paddingHorizontal: R.w(2.5),
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: R.w(2),
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.15)",
        },
        billingAmount: {
            fontSize: R.font(24),
            fontFamily: "SNPro-Bold",
            color: "#FFFFFF",
            letterSpacing: -0.3,
            marginBottom: R.h(0.1),
        },
        billingPeriod: {
            fontSize: R.font(15),
            fontFamily: "SNPro-Medium",
            color: "rgba(255, 255, 255, 0.75)",
            letterSpacing: -0.1,
        },
        footerLinks: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: R.h(1),
            marginBottom: R.h(1),
            paddingHorizontal: R.w(4),
        },
        footerLink: {
            fontSize: R.font(14),
            fontFamily: "SNPro-Medium",
            color: "rgba(255, 255, 255, 0.7)",
            textDecorationLine: "underline",
            paddingHorizontal: R.w(2),
        },
        footerDivider: {
            fontSize: R.font(14),
            color: "rgba(255, 255, 255, 0.3)",
            marginHorizontal: R.w(0.5),
        },
    });

export default PaymentBottomSheet;
