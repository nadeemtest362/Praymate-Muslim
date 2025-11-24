import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useResponsive from "../../hooks/useResponsive";

interface IntentionsHeaderProps {
  onAddPerson: () => void;
}

const createStyles = (R: ReturnType<typeof useResponsive>, insets: any) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: R.w(4),
      paddingTop: insets.top + R.h(1.5),
      marginBottom: R.h(2),
    },
    headerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    greetingSection: {
      flex: 1,
    },
    title: {
      fontSize: R.font(32),
      fontFamily: "SNPro-Black",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    
      lineHeight: R.font(36),
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleEmoji: {
      width: R.w(8),
      height: R.w(8),
      marginRight: R.w(2),
    },
 
    headerActions: {
      flexDirection: "row",
      gap: R.w(3),
    },
    headerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      marginTop: R.h(2),
      marginHorizontal: R.w(4),
    },
    addPersonButton: {
      width: R.w(10), 
      height: R.w(10),
      borderRadius: R.w(5.5),
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: R.h(0.25) },
      shadowOpacity: 0.15,
      shadowRadius: R.w(2),
      elevation: 4,
    },
    addPersonGradient: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: R.w(5.5),
      borderWidth: 1,
      borderColor: "rgba(108, 99, 255, 0.3)",
    },
  });

export const IntentionsHeader: React.FC<IntentionsHeaderProps> = ({
  onAddPerson,
}) => {
  const insets = useSafeAreaInsets();
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R, insets), [R, insets]);

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.greetingSection}>
          <Text style={styles.title}>Prayer Focus</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={onAddPerson}
            style={styles.addPersonButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["rgba(108, 99, 255, 0.2)", "rgba(139, 128, 249, 0.1)"]}
              style={styles.addPersonGradient}
            >
              <Ionicons
                name="person-add"
                size={R.font(20)}
                color="rgba(255, 255, 255, 0.9)"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Subtle divider */}
      <View style={styles.headerDivider} />
    </View>
  );
};
