import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useResponsive from "../../hooks/useResponsive";

interface PrayLockPromptCardProps {
  onPress?: () => void;
}

const createStyles = (R: ReturnType<typeof useResponsive>) => {
  return StyleSheet.create({
    container: {
      marginVertical: R.h(0.5),
    },
    card: {
      backgroundColor: "#4a3373",
      borderRadius: R.w(6),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255, 255, 255, 0.2)",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      padding: R.w(4),
      paddingVertical: R.h(2),
      gap: R.w(3),
    },
    iconContainer: {
      width: R.w(12),
      height: R.w(12),
      borderRadius: R.w(3),
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      justifyContent: "center",
      alignItems: "center",
    },
    icon: {
      width: R.w(8),
      height: R.w(8),
    },
    textContent: {
      flex: 1,
    },
    title: {
      color: "rgba(255, 255, 255, 0.95)",
      fontSize: R.font(20),
      fontFamily: "SNPro-Heavy",
      marginBottom: R.h(0.3),
      letterSpacing: -0.5,
    },
    description: {
      color: "rgba(255, 255, 255, 0.65)",
      fontSize: R.font(14),
      lineHeight: R.font(18),
    },
    chevron: {
      marginLeft: R.w(1),
    },
  });
};

const PrayLockPromptCard: React.FC<PrayLockPromptCardProps> = ({ onPress }) => {
  const R = useResponsive();

  const styles = useMemo(() => {
    if (!R || typeof R !== "object") {
      console.error("[PrayLockPromptCard] useResponsive returned invalid value:", R);
      return createStyles({
        w: () => 0,
        h: () => 0,
        font: () => 14,
        lineHeight: () => 20,
        width: 0,
        height: 0,
      } as any);
    }
    return createStyles(R);
  }, [R]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Image
              source={{
                uri: "https://kfrvxoxdehduqrpcbibl.supabase.co/storage/v1/object/public/assets/app/emojis/praylock-icon.png",
              }}
              style={styles.icon}
              resizeMode="contain"
            />
          </View>

          {/* Text Content */}
          <View style={styles.textContent}>
            <Text style={styles.title}>ENABLE PRAYBLOCK</Text>
            <Text style={styles.description}>
              Protect your prayer journey with distraction blocking
            </Text>
          </View>

          {/* Chevron */}
          <Ionicons
            name="chevron-forward"
            size={R.w(5)}
            color="rgba(255, 255, 255, 0.5)"
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default PrayLockPromptCard;
