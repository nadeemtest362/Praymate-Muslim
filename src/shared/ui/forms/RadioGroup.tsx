/**
 * RadioGroup Component
 *
 * Radio button group with chip-style design from Personal Prayers app
 * Supports both radio button and chip visual styles
 */

import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    Layout,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { Size } from "../types";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(
    TouchableOpacity,
);

export interface RadioOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

export interface RadioGroupProps {
    value?: string;
    onValueChange?: (value: string) => void;
    options: RadioOption[];
    variant?: "radio" | "chip";
    size?: Size;
    color?: string;
    disabled?: boolean;
    haptic?: boolean;
    horizontal?: boolean;
    style?: any;
}

// Separate component for radio option to use hooks properly
const RadioOptionComponent: React.FC<{
    option: RadioOption;
    isSelected: boolean;
    isDisabled: boolean;
    onPress: () => void;
    color: string;
    size: Size;
}> = ({ option, isSelected, isDisabled, onPress, color, size }) => {
    const animatedRadioStyle = useAnimatedStyle(() => {
        const scale = withTiming(isSelected ? 1 : 0, {
            duration: 200,
        });

        return {
            transform: [{ scale }],
        };
    });

    return (
        <AnimatedTouchableOpacity
            style={[
                styles.radioOption,
                { opacity: isDisabled ? 0.5 : 1 },
            ]}
            onPress={onPress}
            disabled={isDisabled}
            layout={Layout.duration(200)}
        >
            <View
                style={[
                    styles.radioCircle,
                    {
                        borderColor: isSelected
                            ? color
                            : "rgba(255, 255, 255, 0.3)",
                        width: getSizeValue(size),
                        height: getSizeValue(size),
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.radioInner,
                        {
                            backgroundColor: color,
                            width: getSizeValue(size) * 0.5,
                            height: getSizeValue(size) * 0.5,
                        },
                        animatedRadioStyle,
                    ]}
                />
            </View>
            <Text
                style={[
                    styles.radioLabel,
                    {
                        color: isDisabled
                            ? "rgba(255, 255, 255, 0.5)"
                            : "white",
                    },
                ]}
            >
                {option.label}
            </Text>
        </AnimatedTouchableOpacity>
    );
};

// Separate component for chip option to use hooks properly
const ChipOption: React.FC<{
    option: RadioOption;
    isSelected: boolean;
    isDisabled: boolean;
    onPress: () => void;
    color: string;
    size: Size;
}> = ({ option, isSelected, isDisabled, onPress, color, size }) => {
    const animatedChipStyle = useAnimatedStyle(() => {
        const backgroundColor = withTiming(
            isSelected ? color : "rgba(255, 255, 255, 0.15)",
            { duration: 200 },
        );

        const borderColor = withTiming(
            isSelected ? color : "rgba(255, 255, 255, 0.2)",
            { duration: 200 },
        );

        return {
            backgroundColor,
            borderColor,
        };
    });

    return (
        <AnimatedTouchableOpacity
            style={[
                styles.chipOption,
                {
                    paddingHorizontal: getSizeValue(size) * 0.8,
                    paddingVertical: getSizeValue(size) * 0.4,
                    opacity: isDisabled ? 0.5 : 1,
                },
                animatedChipStyle,
            ]}
            onPress={onPress}
            disabled={isDisabled}
            layout={Layout.duration(200)}
        >
            {option.icon && (
                <View style={styles.chipIcon}>
                    {option.icon}
                </View>
            )}
            <Text
                style={[
                    styles.chipLabel,
                    {
                        color: isSelected
                            ? "white"
                            : "rgba(255, 255, 255, 0.8)",
                        fontSize: getSizeValue(size) * 0.7,
                    },
                ]}
            >
                {option.label}
            </Text>
        </AnimatedTouchableOpacity>
    );
};

const getSizeValue = (size: Size): number => {
    switch (size) {
        case "small":
            return 16;
        case "medium":
            return 20;
        case "large":
            return 24;
        default:
            return 20;
    }
};

export const RadioGroup: React.FC<RadioGroupProps> = React.memo(({
    value,
    onValueChange,
    options,
    variant = "chip",
    size = "medium",
    color = "#3D83E8",
    disabled = false,
    haptic = true,
    horizontal = false,
    style,
}) => {
    const handleSelect = (optionValue: string, optionDisabled?: boolean) => {
        if (disabled || optionDisabled) return;

        if (haptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        onValueChange?.(optionValue);
    };

    const content = (
        <>
            {options.map((option) => {
                const isSelected = value === option.value;
                const isDisabled = !!(disabled || option.disabled);

                return variant === "radio"
                    ? (
                        <RadioOptionComponent
                            key={option.value}
                            option={option}
                            isSelected={isSelected}
                            isDisabled={isDisabled}
                            onPress={() =>
                                handleSelect(option.value, option.disabled)}
                            color={color}
                            size={size}
                        />
                    )
                    : (
                        <ChipOption
                            key={option.value}
                            option={option}
                            isSelected={isSelected}
                            isDisabled={isDisabled}
                            onPress={() =>
                                handleSelect(option.value, option.disabled)}
                            color={color}
                            size={size}
                        />
                    );
            })}
        </>
    );

    if (horizontal && variant === "chip") {
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.container, style]}
                contentContainerStyle={styles.horizontalContent}
            >
                {content}
            </ScrollView>
        );
    }

    return (
        <View
            style={[
                styles.container,
                horizontal && styles.containerHorizontal,
                style,
            ]}
        >
            {content}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    containerHorizontal: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    horizontalContent: {
        paddingVertical: 4,
    },
    // Radio option styles
    radioOption: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    radioCircle: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderRadius: 50,
    },
    radioInner: {
        borderRadius: 50,
    },
    radioLabel: {
        color: "#FFFFFF",
        fontWeight: "500",
        marginLeft: 12,
    },
    // Chip option styles
    chipOption: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    chipIcon: {
        marginRight: 6,
    },
    chipLabel: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    // Radio styles
    radioContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    radioContainerHorizontal: {
        marginRight: 24,
        marginBottom: 8,
    },
    radio: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.5)",
        borderRadius: 12,
    },
    radio_small: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    radio_medium: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
    radio_large: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    radioDot: {
        width: "60%",
        height: "60%",
        borderRadius: 100,
    },
    // Chip styles
    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    chip_small: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 14,
    },
    chip_medium: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 16,
    },
    chip_large: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 18,
    },
    chipLabelSelected: {
        color: "#FFFFFF",
    },
    // Common styles
    label_small: {
        fontSize: 13,
    },
    label_medium: {
        fontSize: 14,
    },
    label_large: {
        fontSize: 16,
    },
    labelDisabled: {
        opacity: 0.5,
    },
    disabled: {
        opacity: 0.5,
    },
});

RadioGroup.displayName = "RadioGroup";
