import React, { useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import OnboardingGradientBackground from "../../../components/shared/OnboardingGradientBackground";
import { FloatingParticles } from "../../../components/shared/FloatingParticles";
import useResponsive from "../../../hooks/useResponsive";
import { OnboardingFlowContext } from "../../../contexts/OnboardingFlowContext";
import { Button } from "../../../shared/ui";

const createStyles = (R: ReturnType<typeof useResponsive>) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        scrollView: {
            flex: 1,
        },
        contentContainer: {
            flexGrow: 1,
            alignItems: "center",
        },
        title: {
            fontSize: R.font(30),
            fontFamily: "SNPro-Heavy",
            color: "#FFFFFF",
            textAlign: "center",
            marginBottom: R.h(1.2),
            letterSpacing: -1.2,
            textShadowColor: "rgba(0, 0, 0, 0.3)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 8,
        },
        subtitle: {
            fontSize: R.font(18),
            fontFamily: "SNPro-SemiBold",
            color: "rgba(255, 255, 255, 0.95)",
            textAlign: "center",
            marginBottom: R.h(4),
            paddingHorizontal: R.w(5),
            opacity: 0.95,
            lineHeight: R.font(28),
            textShadowColor: "rgba(0, 0, 0, 0.2)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
        },
        goalsContainer: {
            width: "100%",
            marginBottom: R.h(5),
        },
        goalWrapper: {
            width: "100%",
            marginBottom: R.h(2.2),
        },
        goalTouchable: {
            borderRadius: R.w(4),
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
        },
        goalOption: {
            padding: R.w(5),
            height: R.h(11),
            borderWidth: 1.5,
            borderColor: "rgba(255, 255, 255, 0.25)",
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderRadius: R.w(4),
            overflow: "hidden",
            justifyContent: "center",
        },
        selectedGoalOption: {
            backgroundColor: "rgba(255, 255, 255, 0.25)",
            borderColor: "rgba(255, 255, 255, 0.6)",
            shadowColor: "#FFFFFF",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
        },
        goalContent: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        textContent: {
            flex: 1,
        },
        daysText: {
            fontSize: R.font(26),
            fontFamily: "SNPro-Heavy",
            color: "#FFFFFF",
            letterSpacing: -0.8,
            marginBottom: R.h(0.3),
            textShadowColor: "rgba(0, 0, 0, 0.3)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
        },
        selectedDaysText: {
            fontSize: R.font(28),
            textShadowColor: "rgba(0, 0, 0, 0.4)",
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
        },
        emojiText: {
            fontSize: R.font(28),
            marginLeft: R.w(2),
            textShadowColor: "rgba(0, 0, 0, 0.2)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
        },
        selectedEmojiText: {
            fontSize: R.font(32),
            transform: [{ scale: 1.1 }],
        },
        primaryText: {
            fontSize: R.font(16),
            color: "rgba(255, 255, 255, 0.9)",
            fontFamily: "SNPro-SemiBold",
            lineHeight: R.font(20),
            textShadowColor: "rgba(0, 0, 0, 0.2)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
        },
        selectedPrimaryText: {
            color: "#FFFFFF",
            fontFamily: "SNPro-Heavy",
            fontSize: R.font(14),
        },
        buttonContainer: {
            width: "100%",
            marginTop: "auto",
        },
    });

interface GoalOption {
    id: string;
    daysText: string;
    emoji: string;
    primaryText: string;
    value: number;
}

interface StreakGoalScreenConfig {
    title: string;
    subtitle: string;
    goalOptions: GoalOption[];
    continueButton: {
        text: string;
        action: string;
        navigateTo: string;
    };
    tracking?: {
        screenViewEvent?: string;
        goalSelectedEventPrefix?: string;
    };
}

interface StreakGoalScreenProps {
    config: StreakGoalScreenConfig;
    onNext: (selectedOptionData?: any) => void;
    logSduiEvent?: (eventName: string, eventData?: Record<string, any>) => void;
}

interface GoalOptionCardProps {
    option: GoalOption;
    index: number;
    isSelected: boolean;
    optionScale: Animated.SharedValue<number>;
    styles: any;
    onSelectGoal: (option: GoalOption) => void;
}

function GoalOptionCard({
    option,
    index,
    isSelected,
    optionScale,
    styles,
    onSelectGoal,
}: GoalOptionCardProps) {
    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: isSelected ? optionScale.value : 1 },
        ],
    }));

    return (
        <Animated.View
            key={option.id}
            entering={FadeInDown.delay(500 + index * 150).duration(600)}
            style={[styles.goalWrapper, animStyle]}
        >
            <TouchableOpacity
                style={styles.goalTouchable}
                onPress={() => onSelectGoal(option)}
                activeOpacity={0.8}
            >
                <BlurView
                    intensity={25}
                    tint="dark"
                    style={[
                        styles.goalOption,
                        isSelected && styles.selectedGoalOption,
                    ]}
                >
                    <View style={styles.goalContent}>
                        <View style={styles.textContent}>
                            <Text
                                style={[
                                    styles.daysText,
                                    isSelected && styles.selectedDaysText,
                                ]}
                            >
                                {option.daysText}
                            </Text>
                            <Text
                                style={[
                                    styles.primaryText,
                                    isSelected && styles.selectedPrimaryText,
                                ]}
                            >
                                {option.primaryText}
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.emojiText,
                                isSelected && styles.selectedEmojiText,
                            ]}
                        >
                            {option.emoji}
                        </Text>
                    </View>
                </BlurView>
            </TouchableOpacity>
        </Animated.View>
    );
}

function StreakGoalScreenCore({
    config,
    onNext,
    logSduiEvent,
}: StreakGoalScreenProps) {
    const R = useResponsive();
    const styles = useMemo(() => createStyles(R), [R]);

    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const flowContext = React.useContext(OnboardingFlowContext);
    const logEvent = flowContext?.logEvent;

    // Enhanced animation values
    const optionScale = useSharedValue(1);
    const headerScale = useSharedValue(1);
    const handleSelectGoal = (option: GoalOption) => {
        // Enhanced haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        setSelectedGoalId(option.id);

        // Enhanced selection animation with header feedback
        optionScale.value = withSequence(
            withTiming(0.95, { duration: 100 }),
            withTiming(1.08, { duration: 200 }),
            withTiming(1, { duration: 150 }),
        );

        headerScale.value = withSequence(
            withTiming(1.02, { duration: 150 }),
            withTiming(1, { duration: 150 }),
        );

        // Log the selection event - single event call
        if (config.tracking?.goalSelectedEventPrefix && logSduiEvent) {
            logSduiEvent(
                `${config.tracking.goalSelectedEventPrefix}${option.id}`,
                { goal_id: option.id, goal_value: option.value }
            );
        }
    };

    const handleContinue = async () => {
        if (!selectedGoalId) {
            // Enhanced haptic feedback for error
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (logEvent) {
                logEvent('streak_goal_continue_blocked');
            }
            return;
        }

        const selectedGoal = config.goalOptions.find((option) =>
            option.id === selectedGoalId
        );

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (logEvent) {
            logEvent('streak_goal_continue_clicked', {
                goal_id: selectedGoalId,
                goal_value: selectedGoal?.value,
            });
        }

        // Slight delay for visual feedback before navigation
        setTimeout(() => {
            onNext(selectedGoal);
        }, 200);
    };

    const headerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: headerScale.value }],
    }));

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Background gradient */}
            <OnboardingGradientBackground />

            {/* Enhanced floating particles */}
            <FloatingParticles />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.contentContainer,
                    {
                        paddingTop: R.insets.top + R.h(7),
                        paddingBottom: R.insets.bottom + R.h(3.5),
                        paddingLeft: R.insets.left + R.w(5),
                        paddingRight: R.insets.right + R.w(5),
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Enhanced header with animation */}
                <Animated.View style={headerAnimatedStyle}>
                    <Animated.Text
                        entering={FadeIn.duration(800)}
                        style={styles.title}
                    >
                        {config.title}
                    </Animated.Text>

                    <Animated.Text
                        entering={FadeIn.delay(300).duration(800)}
                        style={styles.subtitle}
                    >
                        {config.subtitle}
                    </Animated.Text>
                </Animated.View>

                {/* Enhanced goal options with better styling */}
                <View style={styles.goalsContainer}>
                    {config.goalOptions.map((option, index) => (
                        <GoalOptionCard
                            key={option.id}
                            option={option}
                            index={index}
                            isSelected={selectedGoalId === option.id}
                            optionScale={optionScale}
                            styles={styles}
                            onSelectGoal={handleSelectGoal}
                        />
                    ))}
                </View>

                {/* Enhanced continue button */}
                <Animated.View
                    entering={FadeIn.delay(800).duration(800)}
                    style={styles.buttonContainer}
                >
                    <Button
                        onPress={handleContinue}
                        variant="primary"
                        fullWidth
                        disabled={!selectedGoalId}
                    >
                        Continue
                    </Button>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// Export directly without error boundary
export default StreakGoalScreenCore;
