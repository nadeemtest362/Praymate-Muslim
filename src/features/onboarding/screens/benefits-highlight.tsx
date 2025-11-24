import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/queryClient";
import { Button } from "../../../shared/ui";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "../../../hooks/useAuth";
import { useOnboardingStore } from "../../../stores/onboardingStore";
import { revenueCatService } from "../../../lib/revenueCatService";
import type { PurchasesOfferings } from "react-native-purchases";

import useResponsive from "../../../hooks/useResponsive";
import { OnboardingFlowContext } from "../../../contexts/OnboardingFlowContext";
import { completeOnboarding } from "../../../services/onboardingCompletionService";
import PaymentBottomSheet from "../../../components/shared/PaymentBottomSheet";

const createStyles = (R: ReturnType<typeof useResponsive>) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        scrollContent: {
            flexGrow: 1,
            paddingHorizontal: R.w(6),
            paddingBottom: R.h(15), // Space for footer
        },
        header: {
            marginTop: R.h(18),
            marginBottom: R.h(3),
            alignItems: "center",
        },
        emoji: {
            fontSize: R.font(96),
            marginBottom: R.h(2),
        },
        title: {
            fontSize: R.font(36),
            fontFamily: "SNPro-Black",
            color: "white",
            textAlign: "center",
            marginBottom: R.h(1),
            letterSpacing: -0.5,
        },
        discountBadge: {
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            paddingHorizontal: R.w(4),
            paddingVertical: R.h(2),
            borderRadius: R.w(5),
            marginBottom: R.h(2),
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.3)",
        },
        discountText: {
            fontSize: R.font(20),
            fontFamily: "SNPro-Heavy",
            color: "rgba(255, 255, 255, 0.9)",
        },
        subtitle: {
            fontSize: R.font(16),
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            lineHeight: R.font(22),
            paddingHorizontal: R.w(4),
        },

        subtitle2: {
            fontSize: R.font(24),
            fontFamily: "SNPro-Heavy",
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            lineHeight: R.font(28),
            paddingHorizontal: R.w(4),
            marginTop: R.h(2),
        },
        benefitsWrapper: {
            marginTop: R.h(1),
        },
        benefitsTitle: {
            fontSize: R.font(18),
            fontWeight: "600",
            color: "white",
            marginBottom: R.h(2),
            marginLeft: R.w(1),
        },
        benefitsContainer: {
            gap: R.h(2),
        },
        benefitCard: {
            flexDirection: "row",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: R.w(4),
            padding: R.w(5),
            gap: R.w(4),
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
        },
        benefitIconContainer: {
            width: 48, // Fixed size for consistency
            height: 48,
            borderRadius: R.w(3),
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            justifyContent: "center",
            alignItems: "center",
        },
        benefitIcon: {
            fontSize: R.font(24),
        },
        benefitContent: {
            flex: 1,
        },
        benefitTitle: {
            fontSize: R.font(16),
            fontWeight: "600",
            color: "white",
            marginBottom: R.h(0.5),
        },
        benefitDescription: {
            fontSize: R.font(14),
            color: "rgba(255, 255, 255, 0.8)",
            lineHeight: R.font(20),
        },
        footer: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: R.w(6),
            paddingTop: R.h(2),
            backgroundColor: "rgba(0, 0, 0, 0.3)",
        },
        progressContainer: {
            marginBottom: R.h(2),
        },
        progressBar: {
            height: 4,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 2,
            overflow: "hidden",
        },
        progressFill: {
            height: "100%",
            backgroundColor: "white",
            borderRadius: 2,
        },
        loadingContainer: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
        },
        loadingText: {
            fontSize: R.font(16),
            fontWeight: "600",
            color: "white",
            marginLeft: R.w(2),
        },
        closeButton: {
            position: "absolute",
            top: R.h(6),
            right: R.w(4),
            zIndex: 10,
            padding: R.w(2),
            opacity: 0.35,
        },
    });

interface BenefitsHighlightScreenProps {
    config: {
        screen_name?: string;
        title?: string;
        subtitle?: string;
        benefits?: {
            icon?: string | { type: string; name: string };
            title: string;
            description: string;
        }[];
        buttonText?: string;
        emoji?: string;
        color?: string;
    };
    onNext: () => void;
    onBack?: () => void;
    progress?: number;
}

export default function BenefitsHighlightScreen({
    config,
    onNext,
    progress = 0,
}: BenefitsHighlightScreenProps) {
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();
    const R = useResponsive();
    const styles = useMemo(() => createStyles(R), [R]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [offering, setOffering] = useState<PurchasesOfferings | null>(null);
    const [showPaymentSheet, setShowPaymentSheet] = useState(false);
    const [selectedPlan] = useState<"weekly" | "annual">("weekly");
    const [products] = useState<any[]>([]);
    const flowContext = React.useContext(OnboardingFlowContext);
    const logEvent = flowContext?.logEvent;
    const logScreen = flowContext?.logScreen;

    // Get RevenueCat offerings
    const getOfferings = async () => {
        try {
            const offerings = await revenueCatService.getOfferings();
            if (
                offerings.current !== null &&
                offerings.current.availablePackages.length !== 0
            ) {
                console.log(
                    "[BenefitsHighlight] Offerings:",
                    JSON.stringify(offerings, null, 2),
                );
                setOffering(offerings);
            }
        } catch (error) {
            console.error(
                "[BenefitsHighlight] Error fetching offerings:",
                error,
            );
            if (logEvent) {
                logEvent("benefits_highlight_offerings_failed", {
                    error: error instanceof Error
                        ? error.message
                        : String(error),
                });
            }
        }
    };

    useEffect(() => {
        getOfferings();
    }, []);

    // Effect to monitor user changes
    React.useEffect(() => {
        console.log("[BenefitsHighlight] User state changed:", {
            userId: user?.id,
            email: user?.email,
            isAnonymous: user?.app_metadata?.provider === "anonymous",
        });
    }, [user]);

    // Complete onboarding and navigate to home
    const handleCompleteOnboarding = async () => {
        // Log current auth state for debugging
        console.log("[BenefitsHighlight] Current auth state:", {
            userId: user?.id,
            userEmail: user?.email,
            isAnonymous: user?.app_metadata?.provider === "anonymous",
            hasProfile: !!profile,
        });

        if (!user?.id) {
            console.error("[BenefitsHighlight] No user found for bypass");
            if (logEvent) {
                logEvent("benefits_highlight_bypass_failed", {
                    reason: "missing_user",
                });
            }
            Alert.alert(
                "Account Setup Error",
                "Your account is still being set up. Please wait a moment and try again.",
                [{ text: "OK" }],
            );
            return;
        }

        // Prevent double-clicks
        if (isProcessing) {
            console.log(
                "[BenefitsHighlight] Already processing, ignoring click",
            );
            if (logEvent) {
                logEvent("benefits_highlight_bypass_ignored");
            }
            return;
        }

        setIsProcessing(true);

        try {
            console.log(
                "[BenefitsHighlight] Starting onboarding completion...",
            );

            await completeOnboarding({
                userId: user.id,
                queryClient,
                logEvent,
                eventPrefix: "benefits_highlight",
            });

            console.log(
                "[BenefitsHighlight] Onboarding completion successful!",
            );
        } catch (error) {
            console.error(
                "[BenefitsHighlight] Onboarding completion failed:",
                error,
            );
            if (logEvent) {
                logEvent("benefits_highlight_bypass_failed", {
                    reason: error instanceof Error
                        ? error.message
                        : String(error),
                });
            }
            // Always reset processing state on error
            setIsProcessing(false);

            // Show user-friendly error
            Alert.alert(
                "Setup Failed",
                "There was an issue setting up your account. Please try again.",
                [{ text: "OK", onPress: () => onNext() }],
            );
        }
    };

    // Handle showing payment sheet
    const handleClaimDiscount = () => {
        console.log("[BenefitsHighlight] Showing payment sheet");
        setShowPaymentSheet(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (logEvent) {
            logEvent("benefits_highlight_claim_discount_clicked");
        }
    };

    // Handle payment success
    const handlePaymentSuccess = async () => {
        console.log("[BenefitsHighlight] Payment successful");
        setShowPaymentSheet(false);
        setIsProcessing(true);
        if (logEvent) {
            logEvent("benefits_highlight_payment_success");
        }

        try {
            await handleCompleteOnboarding();
        } catch (error) {
            console.error(
                "[BenefitsHighlight] Error after payment success:",
                error,
            );
            setIsProcessing(false);
        }
    };

    // Handle payment failure
    const handlePaymentFailure = () => {
        console.log("[BenefitsHighlight] Payment failed");
        setShowPaymentSheet(false);
        if (logEvent) {
            logEvent("benefits_highlight_payment_failed");
        }
    };

    // Handle continuing without payment
    const handleContinueWithoutPayment = async () => {
        console.log("[BenefitsHighlight] Continue without payment");
        setShowPaymentSheet(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (logEvent) {
            logEvent("benefits_highlight_continue_without_payment_clicked");
        }

        try {
            await handleCompleteOnboarding();
        } catch (error) {
            console.error(
                "[BenefitsHighlight] Error continuing without payment:",
                error,
            );
        }
    };

    // Handle closing payment sheet
    const handleClosePaymentSheet = () => {
        console.log("[BenefitsHighlight] Payment sheet closed");
        setShowPaymentSheet(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (logEvent) {
            logEvent("benefits_highlight_payment_sheet_closed");
        }
    };

    const benefits = config.benefits || [
        {
            icon: "🙏",
            title: "Personal Prayer Companion",
            description: "Never feel alone in your spiritual journey",
        },
        {
            icon: "❤️",
            title: "Remember Everyone",
            description: "Keep loved ones close in your daily prayers",
        },
        {
            icon: "📈",
            title: "Build Lasting Habits",
            description: "Grow stronger in faith, one day at a time",
        },
        {
            icon: "✨",
            title: "Tailored to You",
            description: "Prayers that understand your unique path",
        },
    ];

    return (
        <View style={[styles.container, { paddingTop: R.insets.top }]}>
            <LinearGradient
                colors={["#003366", "#B94A5A", "#FF8C42"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Close Button */}
            <TouchableOpacity
                style={styles.closeButton}
                onPress={handleContinueWithoutPayment}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons
                    name="close"
                    size={R.w(6)}
                    color="rgba(255, 255, 255, 0.95)"
                />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    {config.emoji
                        ? <Text style={styles.emoji}>{config.emoji}</Text>
                        : <Text style={styles.emoji}>🎁</Text>}
                    <Text style={styles.title}>
                        {config.title || "Special New Member Discount"}
                    </Text>
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                            SPECIAL 20% OFF DISCOUNT TODAY
                        </Text>
                    </View>
                    {config.subtitle
                        ? <Text style={styles.subtitle}>{config.subtitle}</Text>
                        : (
                            <Text style={styles.subtitle}>
                                Your prayer was just the first step!
                            </Text>
                        )}

                    <Text style={styles.subtitle2}>
                        Support this mission! Your support helps us continue
                        helping more believers grow in their faith...
                    </Text>
                </View>
            </ScrollView>

            <View
                style={[styles.footer, {
                    paddingBottom: R.insets.bottom + R.h(2.5),
                }]}
            >
                {isProcessing
                    ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="white" />
                            <Text style={styles.loadingText}>
                                Setting up your account...
                            </Text>
                        </View>
                    )
                    : (
                        <Button
                            onPress={handleClaimDiscount}
                            variant="gradient"
                            fullWidth
                        >
                            {config.buttonText || "Try It Free Today"}
                        </Button>
                    )}
            </View>

            {/* Payment Bottom Sheet */}
            <PaymentBottomSheet
                isVisible={showPaymentSheet}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentFailure={handlePaymentFailure}
                onClose={handleClosePaymentSheet}
                products={products}
                selectedPlan={selectedPlan}
                offering={offering}
                customPackageIdentifier="pray_weekly_discount_399"
            />
        </View>
    );
}
