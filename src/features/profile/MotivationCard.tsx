import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import useResponsive from "../../hooks/useResponsive";

interface MotivationCardProps {
  initialMotivation: string | null;
  onPress?: () => void;
}

const MOTIVATION_MAP: Record<string, { text: string; emoji: string; gradient: string[] }> = {
  consistency: {
    text: "I want to pray more, but I keep getting distracted",
    emoji: "⏰",
    gradient: ["#667eea", "#764ba2"],
  },
  personalization: {
    text: "I sometimes struggle to find the right words when I pray",
    emoji: "🎯",
    gradient: ["#667eea", "#764ba2"],
  },
  closer: {
    text: "I miss feeling connected to God",
    emoji: "🤲",
    gradient: ["#667eea", "#764ba2"],
  },
  restart: {
    text: "I'm trying to rebuild my faith journey",
    emoji: "🔄",
    gradient: ["#667eea", "#764ba2"],
  },
  intercession: {
    text: "I carry others in my heart but rarely pray for them",
    emoji: "👥",
    gradient: ["#667eea", "#764ba2"],
  },
  inspiration: {
    text: "My spiritual life feels dry and routine",
    emoji: "✨",
    gradient: ["#667eea", "#764ba2"],
  },
  start: {
    text: "I am just beginning my walk with God",
    emoji: "🧩",
    gradient: ["#667eea", "#764ba2"],
  },
};

export default function MotivationCard({
  initialMotivation,
  onPress,
}: MotivationCardProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  if (!initialMotivation || !MOTIVATION_MAP[initialMotivation]) {
    return null;
  }

  const motivation = MOTIVATION_MAP[initialMotivation];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <LinearGradient
        colors={[motivation.gradient[0], motivation.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>{motivation.emoji}</Text>
          
          <View style={styles.textContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: R.h(0.75) }}>
              <Text style={styles.label}>my motivation</Text>
              <Feather name="edit-2" size={R.font(14)} color="rgba(255, 255, 255, 0.5)" style={{ marginLeft: R.w(2) }} />
            </View>
            <Text style={styles.motivationText}>{motivation.text}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: R.w(4),
      marginBottom: R.h(1),
      borderRadius: R.w(5),
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    gradient: {
      padding: R.w(5),
      paddingVertical: R.h(2),
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: R.w(4),
    },
    emoji: {
      fontSize: R.font(48),
    },
    textContainer: {
      flex: 1,
    },
    label: {
      fontSize: R.font(16),
      fontFamily: "SNPro-Heavy",
      color: "rgba(255, 255, 255, 0.85)",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    motivationText: {
      fontSize: R.font(18),
      fontFamily: "SNPro-Semibold",
      color: "#FFFFFF",
      lineHeight: R.font(20),
      marginRight: R.w(2),
    },
  });
