import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import useResponsive from "../../hooks/useResponsive";

interface ProfileActionsProps {
  onAddIntention: () => void;
  onViewIntentions: () => void;
  onSignOut: () => void;
}

export default function ProfileActions({
  onAddIntention,
  onViewIntentions,
  onSignOut,
}: ProfileActionsProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  return (
    <View style={styles.actionsSection}>
      <View style={styles.secondaryActions}>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onViewIntentions}
        >
          <Feather
            name="list"
            size={R.font(20)}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.secondaryActionText}>Intentions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryAction} onPress={onSignOut}>
          <Feather
            name="log-out"
            size={R.font(20)}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.secondaryActionText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) =>
  StyleSheet.create({
    actionsSection: {
      marginHorizontal: R.w(4),
      marginTop: R.h(2),
      marginBottom: R.h(3),
    },
    primaryAction: {
      borderRadius: R.w(5),
      overflow: "hidden",
      marginBottom: R.h(2),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    actionGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: R.h(2.5),
      paddingHorizontal: R.w(6),
    },
    primaryActionText: {
      color: "#FFFFFF",
      fontSize: R.font(18),
      fontFamily: "SNPro-Heavy",
      marginLeft: R.w(2),
      letterSpacing: 0.3,
    },
    secondaryActions: {
      flexDirection: "row",
      gap: R.w(3),
    },
    secondaryAction: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      paddingVertical: R.h(2),
      paddingHorizontal: R.w(4),
      borderRadius: R.w(4),
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    secondaryActionText: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: R.font(14),
      fontFamily: "SNPro-Bold",
      marginLeft: R.w(2),
    },
  });
