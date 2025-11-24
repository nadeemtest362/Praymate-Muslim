/**
 * Input Component
 *
 * Text input with glass morphism design from Personal Prayers app
 * Supports validation states, icons, and various input types
 */

import React, { forwardRef } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import type { Size } from "../types";

const AnimatedView = Animated.createAnimatedComponent(View);

export interface InputProps extends Omit<TextInputProps, "style"> {
    label?: string;
    error?: string;
    helper?: string;
    size?: Size;
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
    showClearButton?: boolean;
    containerStyle?: any;
    inputStyle?: any;
    focusedBorderColor?: string;
    charCount?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
    label,
    error,
    helper,
    size = "medium",
    icon,
    iconPosition = "left",
    showClearButton = false,
    containerStyle,
    inputStyle,
    focusedBorderColor = "rgba(94, 85, 209, 0.5)",
    charCount = false,
    value = "",
    onChangeText,
    maxLength,
    editable = true,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const handleClear = () => {
        onChangeText?.("");
    };

    const animatedContainerStyle = useAnimatedStyle(() => ({
        borderColor: withTiming(
            isFocused ? focusedBorderColor : "rgba(255, 255, 255, 0.2)",
            { duration: 200 },
        ),
    }));

    const containerStyles = [
        styles.container,
        styles[`container_${size}`],
        error && styles.containerError,
        !editable && styles.containerDisabled,
        containerStyle,
    ];

    const inputStyles = [
        styles.input,
        styles[`input_${size}`],
        icon && iconPosition === "left" && styles.inputWithLeftIcon,
        icon && iconPosition === "right" && styles.inputWithRightIcon,
        showClearButton && value && styles.inputWithClear,
        inputStyle,
    ];

    return (
        <View style={styles.wrapper}>
            {label && <Text style={styles.label}>{label}</Text>}

            <Animated.View style={[containerStyles, animatedContainerStyle]}>
                {icon && iconPosition === "left" && (
                    <View style={styles.iconLeft}>{icon}</View>
                )}

                <TextInput
                    ref={ref}
                    style={inputStyles}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    cursorColor="#FFFFFF"
                    selectionColor="rgba(255, 255, 255, 0.3)"
                    editable={editable}
                    maxLength={maxLength}
                    {...props}
                />

                {icon && iconPosition === "right" && !showClearButton && (
                    <View style={styles.iconRight}>{icon}</View>
                )}

                {showClearButton && value && editable && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClear}
                    >
                        <Ionicons
                            name="close-circle"
                            size={20}
                            color="rgba(255, 255, 255, 0.5)"
                        />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {(error || helper || (charCount && maxLength)) && (
                <AnimatedView
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    layout={LinearTransition}
                    style={styles.bottomRow}
                >
                    <Text
                        style={[styles.helperText, error && styles.errorText]}
                    >
                        {error || helper}
                    </Text>
                    {charCount && maxLength && (
                        <Text style={styles.charCountText}>
                            {maxLength - value.length}
                        </Text>
                    )}
                </AnimatedView>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        marginBottom: 8,
        paddingLeft: 4,
    },
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    container_small: {
        height: 44,
    },
    container_medium: {
        height: 56,
    },
    container_large: {
        height: 64,
    },
    containerError: {
        borderColor: "rgba(239, 68, 68, 0.5)",
    },
    containerDisabled: {
        opacity: 0.6,
        backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
    input: {
        flex: 1,
        color: "#FFFFFF",
        fontWeight: "500",
        paddingHorizontal: 16,
    },
    input_small: {
        fontSize: 14,
    },
    input_medium: {
        fontSize: 16,
    },
    input_large: {
        fontSize: 18,
    },
    inputWithLeftIcon: {
        paddingLeft: 8,
    },
    inputWithRightIcon: {
        paddingRight: 8,
    },
    inputWithClear: {
        paddingRight: 8,
    },
    iconLeft: {
        paddingLeft: 12,
        paddingRight: 4,
    },
    iconRight: {
        paddingRight: 12,
        paddingLeft: 4,
    },
    clearButton: {
        paddingHorizontal: 12,
        justifyContent: "center",
        height: "100%",
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 6,
        paddingHorizontal: 4,
    },
    helperText: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.6)",
        flex: 1,
    },
    errorText: {
        color: "#EF4444",
    },
    charCountText: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.6)",
        marginLeft: 8,
    },
});

Input.displayName = "Input";
