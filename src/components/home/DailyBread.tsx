import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import useResponsive from "../../hooks/useResponsive";
import { createDesignSystem } from "../../styles/designSystem";
import { getDailyVerse } from "../../data/dailyVerses";
import VerseShareModal from "../shared/VerseShareModal";
import { useAuth } from "../../hooks/useAuth";

interface DailyBreadProps {
    currentStreak: number;
    streakGoalDays: number | null;
    onViewPlan?: () => void;
}

// Styles creation function
const createStyles = (R: ReturnType<typeof useResponsive>) => {
    const ds = createDesignSystem(R);

    return StyleSheet.create({
        container: {
            marginVertical: R.h(0.5),
        },
        content: {
            gap: ds.spacing.md,
        },

        // Progress Section Styles
        progressSection: {
            backgroundColor: ds.card.background,
            borderRadius: ds.radius.card,
            padding: ds.card.padding,
            borderWidth: 1,
            borderColor: ds.card.border,
            ...ds.card.shadow,
        },
        progressHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: ds.spacing.sm,
        },
        progressHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: ds.spacing.md,
        },
        progressIcon: {
            ...ds.typography.h2,
        },
        progressTitle: {
            ...ds.typography.h3,
            color: ds.colors.white,
        },
        viewPlanButton: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: ds.colors.whiteAlpha10,
            paddingHorizontal: ds.spacing.md,
            paddingVertical: ds.spacing.sm,
            borderRadius: ds.radius.badge,
            borderWidth: 1,
            borderColor: ds.colors.whiteAlpha15,
        },
        viewPlanText: {
            ...ds.typography.bodySmall,
            color: ds.colors.whiteAlpha90,
            marginRight: ds.spacing.xs,
        },

        // Streak Display
        streakDisplay: {
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: ds.spacing.md,
        },
        streakMain: {
            flex: 1,
        },
        currentStreak: {
            ...ds.typography.display,
            color: ds.colors.primary,
            lineHeight: ds.typography.display.fontSize,
        },
        streakLabel: {
            ...ds.typography.body,
            color: ds.colors.whiteAlpha70,
            marginTop: ds.spacing.xs,
        },
        goalDisplay: {
            alignItems: "flex-end",
        },
        goalText: {
            ...ds.typography.bodyLarge,
            color: ds.colors.whiteAlpha90,
        },
        goalSubtext: {
            ...ds.typography.bodySmall,
            color: ds.colors.whiteAlpha50,
            marginTop: ds.spacing.xs,
        },

        // Progress Bar
        progressBarContainer: {
            marginBottom: ds.spacing.sm,
            marginTop: ds.spacing.sm,
        },
        progressBar: {
            height: R.h(0.9),
            backgroundColor: ds.colors.whiteAlpha15,
            borderRadius: ds.radius.badge,
            overflow: "hidden",
        },
        progressFill: {
            height: "100%",
            backgroundColor: ds.colors.primary,
            borderRadius: ds.radius.badge,
        },
        progressStats: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: ds.spacing.sm,
        },
        progressStatsText: {
            ...ds.typography.bodySmall,
            color: ds.colors.whiteAlpha50,
        },

        // Daily Bread
        dailyBreadCard: {
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderRadius: R.w(5),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255, 255, 255, 0.15)",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 2,
        },
        dailyBreadContent: {
            paddingHorizontal: R.w(4),
            paddingVertical: R.h(3),
        },
        breadHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: R.h(1.5),
        },
        breadTitleSection: {
            flexDirection: "row",
            alignItems: "center",
            gap: R.w(1),
        },
        breadIcon: {
            fontSize: R.font(30),
        },
        breadTitle: {
            color: "rgba(255, 255, 255, 0.98)",
            fontSize: R.font(24),
            fontFamily: "SNPro-Black",
            textTransform: "capitalize",
            fontWeight: "800",
            letterSpacing: -0.5,
        },
        timeIndicatorBadge: {
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderRadius: R.w(3),
            paddingHorizontal: R.w(2.5),
            paddingVertical: R.h(0.7),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255, 255, 255, 0.2)",
        },
        timeIndicatorText: {
            color: "rgba(255, 255, 255, 0.8)",
            fontSize: R.font(11),
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
        },
        timeIndicatorIcon: {
            marginRight: R.w(1),
        },
        verseText: {
            color: "rgba(255, 255, 255, 0.93)",
            fontSize: R.font(18),
            lineHeight: R.font(26),
            fontWeight: "400",
            fontStyle: "italic",
        },
        openQuote: {
            color: "rgba(255, 255, 255, 0.35)",
            fontSize: R.font(36),
            lineHeight: R.font(28),
            marginBottom: -R.h(0.8),
            marginTop: -R.h(0.3),
            marginLeft: R.w(-1.5),
        },
        verseBody: {
            marginVertical: R.h(1.5),
            paddingHorizontal: R.w(4),
        },
        verseFooter: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: R.h(1.5),
        },
        verseReferenceContainer: {
            marginLeft: R.w(2.5),
        },
        verseReference: {
            color: "rgba(255, 255, 255, 0.95)",
            fontSize: R.font(24),
            fontFamily: "SNPro-Black",
           
        },
        verseBook: {
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: R.font(12),
            fontWeight: "700",
            textTransform: "uppercase",
          
            marginTop: R.h(0.4),
        },
        shareButton: {
            padding: R.w(2),
            borderRadius: R.w(3.5),
            backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
    });
};

const DailyBread: React.FC<DailyBreadProps> = ({
    currentStreak,
    streakGoalDays,
    onViewPlan,
}) => {
    const R = useResponsive();
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const { profile } = useAuth();

    const styles = useMemo(() => {
        if (!R || typeof R !== "object") {
            console.error(
                "[DailyBread] useResponsive returned invalid value:",
                R,
            );
            return createStyles(
                {
                    w: () => 0,
                    h: () => 0,
                    font: () => 14,
                    lineHeight: () => 20,
                    width: 0,
                    height: 0,
                } as any,
            );
        }
        return createStyles(R);
    }, [R]);

    // Get daily verse for current time period
    const dailyVerse = useMemo(() => {
        return getDailyVerse();
    }, []);

    // Parse verse reference for better display
    const parsedReference = useMemo(() => {
        const ref = dailyVerse.reference;
        const bookMatch = ref.match(/^([A-Za-z\s]+)\s+(\d+.*)/);
        if (bookMatch) {
            return {
                book: bookMatch[1].trim(),
                chapter: bookMatch[2],
            };
        }
        return { book: ref, chapter: "" };
    }, [dailyVerse.reference]);

    // Format verse text with proper typography
    const formattedVerse = useMemo(() => {
        const text = dailyVerse.text;

        // Handle quoted speech from Jesus or direct quotes
        if (text.includes('"') || text.includes("'")) {
            return text;
        }

        // Split into sentences for better reading rhythm
        const sentences = text.split(". ");
        if (sentences.length > 2) {
            // For longer passages, break into readable chunks
            const midPoint = Math.ceil(sentences.length / 2);
            const firstHalf = sentences.slice(0, midPoint).join(". ");
            const secondHalf = sentences.slice(midPoint).join(". ");
            return `${firstHalf}.\n\n${secondHalf}`;
        }

        return text;
    }, [dailyVerse.text]);

    // Determine current time of day
    const currentTime = useMemo(() => {
        const hour = new Date().getHours();
        return hour < 16 ? "morning" : "evening";
    }, []);



    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShareModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <View
                style={styles.content}
            >
              

                {/* Daily Bread */}
                <View
                    style={styles.dailyBreadCard}
                >
                    {/* Background image */}
                    <ExpoImage
                        source={require("../../../assets/images/jesus-bg.png")}
                        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: 0.25 }}
                        contentFit="cover"
                        priority="high"
                        cachePolicy="memory"
                        transition={0}
                        pointerEvents="none"
                    />
                    <View style={styles.dailyBreadContent}>
                        <View style={styles.breadHeader}>
                            <View style={styles.breadTitleSection}>
                                <Text style={styles.breadIcon}>🍞</Text>
                                <Text style={styles.breadTitle}>
                                    Daily Bread
                                </Text>
                            </View>
                            
                        </View>

                        <View style={styles.verseBody}>
                     
                            <Text style={styles.verseText}>
                         
                                {formattedVerse}</Text>
                        </View>

                        <View style={styles.verseFooter}>
                            <View style={styles.verseReferenceContainer}>
                                <Text style={styles.verseReference}>
                                    {parsedReference.chapter}
                                </Text>
                                <Text style={styles.verseBook}>
                                    {parsedReference.book}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.shareButton}
                                onPress={handleShare}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="share-outline"
                                    size={16}
                                    color="rgba(255, 255, 255, 0.8)"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
            
            {/* Share Modal */}
            <VerseShareModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                verse={dailyVerse}
                userName={profile?.display_name || undefined}
            />
        </View>
    );
};

export default DailyBread;
