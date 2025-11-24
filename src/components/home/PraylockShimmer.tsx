import React, { FC } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  withDelay,
  SharedValue,
} from "react-native-reanimated";

type Props = {
  containerWidth: SharedValue<number>;
  containerHeight: SharedValue<number>;
};

export const PraylockShimmer: FC<Props> = ({ containerWidth, containerHeight }) => {
  const shimmerComponentWidth = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    if (shimmerComponentWidth.value === 0) {
      return {
        opacity: 0,
      };
    }

    const baseDuration = 1100;
    const referenceWidth = 40;
    const duration = baseDuration * (containerWidth.value / referenceWidth);

    return {
      opacity: 1,
      transform: [
        {
          translateX: withRepeat(
          withSequence(
          withDelay(3000, withTiming(-shimmerComponentWidth.value * 1.2, { duration: 0 })),
          withTiming(containerWidth.value * 1.2, {
          duration: Math.max(duration, baseDuration),
          easing: Easing.in(Easing.ease),
          })
          ),
          -1,
          false
          ),
        },
        { rotate: "30deg" },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        {
          top: -(containerHeight.value * 2),
          bottom: -(containerHeight.value * 2),
        },
      ]}
      onLayout={(e) => shimmerComponentWidth.set(e.nativeEvent.layout.width)}
    >
      <View style={styles.stripe1} />
      <View style={styles.stripe2} />
      <View style={styles.stripe3} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    flexDirection: "row",
    zIndex: 10,
  },
  stripe1: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  stripe2: {
    width: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  stripe3: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});
