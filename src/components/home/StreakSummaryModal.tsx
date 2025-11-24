import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    Image,
} from "react-native";
import { PLAN_MORNING_ICON, PLAN_EVENING_ICON } from "../../utils/warmPlanIcons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import useResponsive from "../../hooks/useResponsive";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useAuth } from "../../hooks/useAuth";
import {
    getCurrentPeriod,
    isInPrayerWindow,
    onMinuteTick,
    setCanonicalTimezone,
} from "../../lib/time/Clock";
import { getPrayerDayStart } from "../../lib/time/Clock";
import { startOfWeek, addDays, isSameDay } from "date-fns";
import { FloatingParticles } from "../shared/FloatingParticles";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type Prayer = {
    id: string;
    generated_at: string | null;
    completed_at: string | null;
    slot?: string | null;
};

interface StreakSummaryModalProps {
    visible: boolean;
    onClose: () => void;
    currentStreak: number;
    prayers: Prayer[];
    morningCompleted: boolean;
    eveningCompleted: boolean;
    todayHasPrayer: boolean;  // NEW
    isPerfectDayToday: boolean;  // NEW
}

const StreakSummaryModal: React.FC<StreakSummaryModalProps> = ({
    visible,
    onClose,
    currentStreak,
    prayers: _prayers,
    morningCompleted,
    eveningCompleted,
    todayHasPrayer,  // NEW
    isPerfectDayToday,  // NEW
}) => {
    const R = useResponsive();
    const [isSharing, setIsSharing] = useState(false);
    const [isCloseVisible, setIsCloseVisible] = useState(true);
    const shareCardRef = useRef<ViewShot>(null);
    const { profile } = useAuth();
    const timezone = profile?.timezone ?? undefined;
    const [currentPeriod, setCurrentPeriod] = useState<"morning" | "evening">(
        () => getCurrentPeriod(timezone),
    );
    const [isWindowAvailable, setIsWindowAvailable] = useState(() =>
        isInPrayerWindow(timezone),
    );

    const sheetTranslateY = useSharedValue(R.h(100));
    const overlayOpacity = useSharedValue(0);
    const emojiScale = useSharedValue(0.86);
    const borderFill = useSharedValue(0);
    const contentOpacity = useSharedValue(0);
    const contentTranslate = useSharedValue(24);
    const closeOpacity = useSharedValue(0);

    useEffect(() => {
        let closeTimer: ReturnType<typeof setTimeout> | null = null;

        if (visible) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsSharing(false);
            setIsCloseVisible(false);
            closeOpacity.value = 0;

            closeTimer = setTimeout(() => {
                setIsCloseVisible(true);
                closeOpacity.value = withTiming(1, {
                    duration: 240,
                    easing: Easing.out(Easing.cubic),
                });
            }, 620);
        } else {
            setIsCloseVisible(false);
            closeOpacity.value = 0;
        }

        return () => {
            if (closeTimer) {
                clearTimeout(closeTimer);
            }
        };
    }, [visible, closeOpacity]);

    useEffect(() => {
        if (timezone) {
            setCanonicalTimezone(timezone);
        }
        setCurrentPeriod(getCurrentPeriod(timezone));
        setIsWindowAvailable(isInPrayerWindow(timezone));
    }, [timezone]);

    useEffect(() => {
        const unsubscribe = onMinuteTick(() => {
            setCurrentPeriod(getCurrentPeriod(timezone));
            setIsWindowAvailable(isInPrayerWindow(timezone));
        });

        return unsubscribe;
    }, [timezone]);

    useEffect(() => {
        if (visible) {
            overlayOpacity.value = withTiming(1, { duration: 180 });
            sheetTranslateY.value = withSpring(0, {
                damping: 20,
                stiffness: 220,
                overshootClamping: true,
            });

            emojiScale.value = withTiming(1, {
                duration: 960,
                easing: Easing.out(Easing.cubic),
            });

            borderFill.value = withDelay(
                90,
                withTiming(1, {
                    duration: 260,
                    easing: Easing.out(Easing.quad),
                }),
            );

            contentOpacity.value = withDelay(
                120,
                withTiming(1, {
                    duration: 660,
                    easing: Easing.out(Easing.cubic),
                }),
            );

            contentTranslate.value = withDelay(
                90,
                withTiming(0, {
                    duration: 260,
                    easing: Easing.out(Easing.cubic),
                }),
            );
        } else {
            overlayOpacity.value = withTiming(0, { duration: 140 });
            sheetTranslateY.value = withTiming(R.h(100), { duration: 200 });
            emojiScale.value = 0.86;
            borderFill.value = 0;
            contentOpacity.value = 0;
            contentTranslate.value = 24;
        }
    }, [
        visible,
        overlayOpacity,
        sheetTranslateY,
        emojiScale,
        borderFill,
        contentOpacity,
        contentTranslate,
        R,
    ]);

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sheetTranslateY.value }],
    }));

    const emojiAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: emojiScale.value }],
    }));

    const circleAnimatedStyle = useAnimatedStyle(() => ({}));

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentTranslate.value }],
    }));

    const closeAnimatedStyle = useAnimatedStyle(() => ({
        opacity: closeOpacity.value,
        transform: [
            {
                scale: interpolate(closeOpacity.value, [0, 1], [0.85, 1]),
            },
            {
                translateY: interpolate(closeOpacity.value, [0, 1], [-6, 0]),
            },
        ],
    }));

    const styles = useMemo(
        () =>
            StyleSheet.create({
                overlay: {
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.7)",
                },
                sheetContainer: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingBottom: R.insets.bottom,
                    backgroundColor: "transparent",
                },
                backgroundGradient: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                },
                closeButton: {
                    position: "absolute",
                    top: R.insets.top + R.h(1),
                    right: R.w(4),
                    padding: R.w(2.5),
               
                  
                    zIndex: 10,
                },
                closeText: {
                    fontSize: R.font(28),
                    color: "#777777",
                    fontFamily: "SNPro-Heavy",
                    letterSpacing: -1,

                },
                contentWrapper: {
                    flex: 1,
                },
                content: {
                    paddingHorizontal: R.w(4),
                    paddingBottom: R.insets.bottom + R.h(6),
                },
                liveContent: {
                    paddingTop: R.insets.top + R.h(4),
                },
                shareContent: {
                    paddingTop: R.h(3),
                    paddingBottom: R.h(3),
                },
                liveShot: {
                    flex: 1,
                },
                shareShot: {
                    width: R.width,
                    height: (R.width * 4) / 3,
                    alignSelf: "center",
                },
                liveFrame: {
                    flex: 1,
                },
                shareFrame: {
                    flex: 1,
                    borderRadius: R.w(5),
                    overflow: "hidden",
                },
                hiddenShareZone: {
                    position: "absolute",
                    left: -9999,
                    top: 0,
                    opacity: 0,
                },
                heroContainer: {
                    alignItems: "center",
                    marginBottom: R.h(1.5),
                },
                perfectDayCircle: {
                    width: R.w(30),
                    height: R.w(30),
                    borderRadius: R.w(15),
                    backgroundColor: "rgba(59, 227, 124, 0.18)",
                    position: "relative",
                    overflow: "hidden",
                    borderWidth: R.w(2),
                    borderColor: "rgba(28, 176, 83, 0.48)",
                    marginBottom: R.h(2),
                    shadowColor: "rgba(28, 176, 83, 0.32)",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 6,
                },
                perfectDayContent: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                },
                badgeIcon: {
                    fontSize: R.font(70),
                },
                streakTitle: {
                    fontSize: R.font(48),
                    fontFamily: "SNPro-Black",
                    color: "#FFFFFF",
                    textAlign: "center",
                    letterSpacing: -1,
                    marginBottom: R.h(1),
                    lineHeight: R.lineHeight(40),
                },
                helperText: {
                    fontSize: R.font(24),
                    fontFamily: "SNPro-Medium",
                    color: "rgba(255, 255, 255, 0.8)",
                    textAlign: "center",
                    lineHeight: R.lineHeight(24),
                    
                    marginBottom: R.h(2),
                    paddingHorizontal: R.w(4),
                },
                todayCard: {
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    borderRadius: R.w(5),
                    paddingVertical: R.h(2.4),
                    paddingHorizontal: R.w(4),
                    marginBottom: 0,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    alignSelf: "stretch",
                },
                todayCardClip: {
                    overflow: "hidden",
                    borderRadius: R.w(5),
                    alignSelf: "stretch",
                },
                todayCardWrapper: {
                    alignItems: "stretch",
                    alignSelf: "stretch",
                    position: "relative",
                    paddingBottom: 0,
                    marginBottom: R.h(3.2),
                },
                todayHeader: {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: R.h(0.5),
                    marginBottom: R.h(1.2),
                },
                todayTitle: {
                    fontSize: R.font(16),
                    fontFamily: "SNPro-Black",
                    color: "#FFFFFF",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                },
                todayCount: {
                    fontSize: R.font(15),
                    fontFamily: "SNPro-Bold",
                    color: "#FFFFFF",
                },
                progressChips: {
                    flexDirection: "row",
                    gap: R.w(2),
                    marginTop: R.h(1.2),
                },
                chip: {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: R.w(3),
                    paddingVertical: R.h(1.2),
                    paddingHorizontal: R.w(3),
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                },
                chipCompleted: {
                    backgroundColor: "rgba(74, 222, 128, 0.18)",
                    borderColor: "rgba(74, 222, 128, 0.32)",
                },
                chipMorningAvailable: {
                    backgroundColor: "rgba(255, 215, 0, 0.1)",
                    borderColor: "rgba(255, 215, 0, 0.25)",
                },
                chipEveningAvailable: {
                    backgroundColor: "rgba(139, 92, 246, 0.12)",
                    borderColor: "rgba(214, 188, 250, 0.35)",
                },
                chipEmoji: {
                    width: R.w(5.2),
                    height: R.w(5.2),
                    marginRight: R.w(2),
                },
                chipLabel: {
                    fontSize: R.font(13),
                    fontFamily: "SNPro-Bold",
                    color: "#FFFFFF",
                    flex: 1,
                },
                chipLabelMorningAvailable: {
                    color: "#FFD700",
                },
                chipLabelEveningAvailable: {
                    color: "#D6BCFA",
                },
                chipStatus: {
                    fontSize: R.font(11),
                    fontFamily: "SNPro-Bold",
                    color: "rgba(255, 255, 255, 0.6)",
                },
                chipStatusComplete: {
                    color: "#FFFFFF",
                },
                chipStatusMorningAvailable: {
                    color: "#FFD700",
                },
                chipStatusEveningAvailable: {
                    color: "#D6BCFA",
                },
                chipStatusIconWrap: {
                    marginLeft: "auto",
                    justifyContent: "center",
                    alignItems: "center",
                    minWidth: R.w(4),
                },
                chipStatusCompleteWrap: {
                    marginLeft: "auto",
                    justifyContent: "center",
                    alignItems: "center",
                    minWidth: R.w(5.5),
                },
                checkGradient: {
                    width: R.w(5),
                    height: R.w(5),
                    borderRadius: R.w(2.5),
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "rgba(74, 222, 128, 0.4)",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.6,
                    shadowRadius: 4,
                },
                weekStrip: {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: R.h(1.6),
                },
                cardDivider: {
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: "rgba(255, 255, 255, 0.18)",
                    marginVertical: R.h(1.4),
                },
                dayChip: {
                    width: R.w(11),
                    alignItems: "center",
                },
                dayLabel: {
                    fontSize: R.font(11),
                    fontFamily: "SNPro-SemiBold",
                    color: "rgba(255, 255, 255, 0.7)",
                    marginBottom: R.h(0.5),
                },
                dayCircle: {
                    width: R.w(10),
                    height: R.w(10),
                    borderRadius: R.w(5),
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                },
                dayCircleActive: {
                    backgroundColor: "rgba(59, 227, 124, 0.24)",
                    borderWidth: R.w(.75),
                    borderColor: "rgba(28, 176, 83, 0.8)",
                    shadowColor: "rgba(28, 176, 83, 0.38)",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.75,
                    shadowRadius: 6,
                    elevation: 4,
                },
                dayCircleToday: {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    borderWidth: R.w(.75),
                    borderColor: "rgba(255, 255, 255, 0.45)",
                },
                todayRing: {
                    position: "absolute",
                    top: -R.w(1),
                    left: -R.w(1),
                    right: -R.w(1),
                    bottom: -R.w(1),
                    borderRadius: R.w(6),
                
                    borderColor: "rgba(255, 255, 255, 0.55)",
                },
                dayEmoji: {
                    fontSize: R.font(16),
                },
                continueButton: {
                    marginTop: R.h(2),
                    marginHorizontal: R.w(6),
                    backgroundColor: "#FFFFFF",
                    borderRadius: R.w(6),
                    paddingVertical: R.h(2.2),
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                },
                continueText: {
                    fontSize: R.font(18),
                    fontFamily: "SNPro-Bold",
                    color: "#1a1a1a",
                    letterSpacing: 0.5,
                },
                brandBadge: {
                    position: "absolute",
                    top: "100%",
                    right: R.w(4),
                    marginTop: -StyleSheet.hairlineWidth,
                    flexDirection: "row",
                    alignItems: "center",
                  
                    
                    paddingVertical: R.h(0.75),
                   
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.22,
                    shadowRadius: 7,
                    elevation: 5,
                    zIndex: 2,
                },
                brandBadgePrefix: {
                    fontSize: R.font(10),
                    fontFamily: "SNPro-Regular",
                    color: "rgba(255,255,255,0.72)",
                    marginRight: R.w(0.5),
                    marginTop: R.h(0.2),
                },
                brandBadgeText: {
                    fontSize: R.font(14),
                    fontFamily: "SNPro-Heavy",
                    color: "#FFFFFF",
                    letterSpacing: -0.2,
                    textTransform: "lowercase",
                },
                brandBadgeAccent: {
                    fontSize: R.font(14),
                    fontFamily: "SNPro-Heavy",
                    color: "#7DD3FC",
                    letterSpacing: -0.2,
                    textTransform: "lowercase",
                    marginLeft: R.w(0.1),
                },
                brandBadgeEmoji: {
                    fontSize: R.font(10),
                    marginLeft: R.w(0.2),
                },
                footerArea: {
                    paddingHorizontal: R.w(6),
                    paddingBottom: R.insets.bottom + R.h(3),
                    paddingTop: R.h(2),
                },
                footerWrapper: {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "transparent",
                },
                shareRow: {
                    width: "100%",
                },
                primaryAction: {
                    width: "100%",
                    borderRadius: R.w(8),
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.18,
                    shadowRadius: 10,
                    elevation: 5,
                   
                },
                primaryGradient: {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: R.w(2),
                    paddingVertical: R.h(2),
                },
                primaryIcon: {
                    marginRight: R.w(1),
                },
                primaryActionText: {
                    fontSize: R.font(18),
                    fontFamily: "SNPro-Heavy",
                    color: "#0F172A",
                    
                    paddingVertical: R.h(0.75),
                },
                secondaryAction: {
                    display: "none",
                },
                secondaryActionDisabled: {
                    display: "none",
                },
                secondaryIcon: {
                    display: "none",
                },
                secondaryActionText: {
                    display: "none",
                },
            }),
        [R],
    );

    const handleClose = useCallback(() => {
        setIsSharing(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    }, [onClose]);

    // Build a week-anchored current-streak strip with weekday labels
    const last7Days = useMemo(() => {
        const todayTz = getPrayerDayStart(timezone);
        
        let streak = typeof currentStreak === 'number' ? currentStreak : 0;
        if (streak < 0) streak = 0;
        
        // Start from the first day of the streak (or today if no streak)
        const streakStart = streak > 0 ? addDays(todayTz, -(streak - 1)) : todayTz;
        
        const days: { date: Date; label: string; hasPrayer: boolean; isPerfect: boolean; isToday: boolean }[] = [];
        
        // Show streak days + future days (always 7 total)
        for (let i = 0; i < 7; i++) {
            const date = addDays(streakStart, i);
            const d = date.getDay();
            const label = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d];
            const isToday = isSameDay(date, todayTz);
            
            // Streak days are those from start up to (and including) today if today has prayer
            const isStreakDay = i < streak;
            
            days.push({
                date,
                label,
                hasPrayer: isStreakDay,
                isPerfect: isToday && isPerfectDayToday,
                isToday,
            });
        }

        return days;
    }, [timezone, currentStreak, todayHasPrayer, isPerfectDayToday]);

    const completedToday = morningCompleted && eveningCompleted ? 2 : (morningCompleted || eveningCompleted ? 1 : 0);
    const morningAvailable = !morningCompleted && currentPeriod === "morning" && isWindowAvailable;
    const eveningAvailable = !eveningCompleted && currentPeriod === "evening" && isWindowAvailable;

    const renderCardContent = useMemo(() => (
        <>
            <View style={styles.heroContainer}>
                <Animated.View
                    style={[
                        styles.perfectDayCircle,
                        emojiAnimatedStyle,
                        circleAnimatedStyle,
                    ]}
                >
                    <View style={styles.perfectDayContent}>
                        <Text style={styles.badgeIcon}>🙏</Text>
                    </View>
                </Animated.View>

                <Text style={styles.streakTitle}>
                    {currentStreak > 0
                        ? `You're on a ${currentStreak}-Day Prayer Streak`
                        : "Start your prayer streak today"}
                </Text>

                <Text style={styles.helperText}>
                    {isPerfectDayToday
                        ? "Blessed Day! You completed both prayers. Come back tomorrow."
                        : todayHasPrayer
                            ? (morningCompleted && !eveningCompleted
                                ? "Complete your evening prayer for a Blessed Day Bonus!"
                                : "Great job! Come back tomorrow to continue your streak.")
                            : currentStreak > 0
                                ? "Complete a prayer today to keep your streak going"
                                : "Complete a prayer to start your streak"}
                </Text>
            </View>

            <View style={styles.todayCardWrapper}>
                <View style={styles.todayCardClip}>
                    <View style={styles.todayCard}>
                        <View style={styles.weekStrip}>
                            {last7Days.map((day, idx) => (
                                <View key={idx} style={styles.dayChip}>
                                    <Text style={styles.dayLabel}>{day.label}</Text>
                                    <View
                                        style={[
                                            styles.dayCircle,
                                            day.isPerfect
                                                ? styles.dayCircleActive
                                                : day.isToday
                                                    ? styles.dayCircleToday
                                                    : undefined,
                                        ]}
                                    >
                                        {day.hasPrayer && (
                                            <Text style={styles.dayEmoji}>🙏</Text>
                                        )}
                                        {!day.hasPrayer && day.isToday && (
                                            <View style={styles.todayRing} />
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.todayHeader}>
                            <Text style={styles.todayTitle}>Today</Text>
                            <Text style={styles.todayCount}>{completedToday}/2</Text>
                        </View>
                        <View style={styles.progressChips}>
                            <View
                                style={[
                                    styles.chip,
                                    morningCompleted && styles.chipCompleted,
                                    morningAvailable && styles.chipMorningAvailable,
                                ]}
                            >
                                <Image
                                    source={PLAN_MORNING_ICON}
                                    style={styles.chipEmoji}
                                />
                                <Text
                                    style={[
                                        styles.chipLabel,
                                        morningAvailable && !morningCompleted &&
                                            styles.chipLabelMorningAvailable,
                                        morningCompleted && styles.chipStatusComplete,
                                    ]}
                                >
                                    Morning
                                </Text>
                                {morningCompleted ? (
                                    <View style={[styles.chipStatusIconWrap, styles.chipStatusCompleteWrap]}>
                                        <LinearGradient
                                            colors={["#3BE37C", "#1CB053"]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.checkGradient}
                                        >
                                            <Ionicons
                                                name="checkmark"
                                                size={R.font(13)}
                                                color="#FFFFFF"
                                            />
                                        </LinearGradient>
                                    </View>
                                ) : morningAvailable ? (
                                    <Text
                                        style={[
                                            styles.chipStatus,
                                            styles.chipStatusMorningAvailable,
                                        ]}
                                    >
                                        Available
                                    </Text>
                                ) : (
                                    <View style={styles.chipStatusIconWrap}>
                                        <Ionicons
                                            name="time-outline"
                                            size={R.font(15)}
                                            color="rgba(255, 255, 255, 0.7)"
                                        />
                                    </View>
                                )}
                            </View>
                            <View
                                style={[
                                    styles.chip,
                                    eveningCompleted && styles.chipCompleted,
                                    eveningAvailable && styles.chipEveningAvailable,
                                ]}
                            >
                                <Image
                                    source={PLAN_EVENING_ICON}
                                    style={styles.chipEmoji}
                                />
                                <Text
                                    style={[
                                        styles.chipLabel,
                                        eveningAvailable && !eveningCompleted &&
                                            styles.chipLabelEveningAvailable,
                                        eveningCompleted && styles.chipStatusComplete,
                                    ]}
                                >
                                    Evening
                                </Text>
                                {eveningCompleted ? (
                                    <View style={[styles.chipStatusIconWrap, styles.chipStatusCompleteWrap]}>
                                        <LinearGradient
                                            colors={["#3BE37C", "#1CB053"]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.checkGradient}
                                        >
                                            <Ionicons
                                                name="checkmark"
                                                size={R.font(13)}
                                                color="#FFFFFF"
                                            />
                                        </LinearGradient>
                                    </View>
                                ) : eveningAvailable ? (
                                    <Text
                                        style={[
                                            styles.chipStatus,
                                            styles.chipStatusEveningAvailable,
                                        ]}
                                    >
                                        Available
                                    </Text>
                                ) : (
                                    <View style={styles.chipStatusIconWrap}>
                                        <Ionicons
                                            name="time-outline"
                                            size={R.font(15)}
                                            color="rgba(255, 255, 255, 0.7)"
                                        />
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.brandBadge}>
                    <Text style={styles.brandBadgePrefix}>guided by</Text>
                    <Text style={styles.brandBadgeText}>pray</Text>
                    <Text style={styles.brandBadgeAccent}>mate</Text>
                    <Text style={styles.brandBadgeEmoji}>🙏</Text>
                </View>
            </View>
        </>
    ), [
        styles,
        emojiAnimatedStyle,
        circleAnimatedStyle,
        currentStreak,
        last7Days,
        completedToday,
        morningCompleted,
        morningAvailable,
        eveningCompleted,
        eveningAvailable,
        R,
    ]);

    const handleShare = useCallback(async () => {
        if (isSharing) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsSharing(true);
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const uri = shareCardRef.current
                ? await captureRef(shareCardRef, {
                      result: "tmpfile",
                      quality: 1,
                  })
                : undefined;

            if (uri) {
                const isAvailable = await Sharing.isAvailableAsync();
                if (!isAvailable) {
                    Alert.alert("Sharing not available", "Your device does not support sharing images.");
                } else {
                    await Sharing.shareAsync(uri, {
                        mimeType: "image/png",
                        dialogTitle: "Share your streak",
                        UTI: "image/png",
                    });
                }
            }
        } catch (error) {
            console.error("[StreakSummaryModal] Share error", error);
            Alert.alert("Share failed", "Unable to share your streak right now.");
        } finally {
            setIsSharing(false);
        }
    }, [isSharing]);

    if (!visible) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <Animated.View style={[styles.overlay, overlayStyle]}>
                <Animated.View style={[styles.sheetContainer, sheetStyle]}>
                    <LinearGradient
                        colors={["#141941", "#3b2f7f", "#b44da6"]}
                        style={styles.backgroundGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    
                    {isCloseVisible && (
                        <AnimatedTouchableOpacity
                            style={[styles.closeButton, closeAnimatedStyle]}
                            onPress={handleClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </AnimatedTouchableOpacity>
                    )}

                    <Animated.View style={[styles.contentWrapper, contentAnimatedStyle]}>
                        <View style={styles.liveFrame}>
                            <LinearGradient
                                colors={["#141941", "#3b2f7f", "#b44da6"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} pointerEvents="none">
                                <FloatingParticles />
                            </View>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={[
                                    styles.content,
                                    styles.liveContent,
                                ]}
                            >
                                {renderCardContent}
                            </ScrollView>
                        </View>
                    </Animated.View>

                    <View style={styles.hiddenShareZone} collapsable={false}>
                        <ViewShot
                            ref={shareCardRef}
                            options={{ format: "png", quality: 1 }}
                            style={styles.shareShot}
                        >
                            <View style={styles.shareFrame}>
                                <LinearGradient
                                    colors={["#141941", "#3b2f7f", "#b44da6"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={[
                                        styles.content,
                                        styles.shareContent,
                                    ]}
                                >
                                    {renderCardContent}
                                </ScrollView>
                            </View>
                        </ViewShot>
                    </View>

                    <View style={styles.footerWrapper}>
                            <View style={styles.footerArea}>
                                <View style={styles.shareRow}>
                                    <TouchableOpacity
                                        style={styles.primaryAction}
                                        onPress={handleShare}
                                        activeOpacity={0.9}
                                        disabled={isSharing}
                                    >
                                        <LinearGradient
                                            colors={["#FFD873", "#FF8C42"]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.primaryGradient}
                                        >
                                            {isSharing ? (
                                                <ActivityIndicator color="#0F172A" />
                                            ) : (
                                                <>
                                                    <Ionicons
                                                        name="share-outline"
                                                        size={R.font(18)}
                                                        color="#0F172A"
                                                        style={styles.primaryIcon}
                                                    />
                                                    <Text style={styles.primaryActionText}>SHARE & INSPIRE OTHERS TO PRAY</Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                    </View>
                </Animated.View>
            </Animated.View>

        </Modal>
    );
};

export default StreakSummaryModal;
