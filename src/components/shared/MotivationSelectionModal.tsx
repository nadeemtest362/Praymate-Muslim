import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import useResponsive from "../../hooks/useResponsive";

const MOTIVATION_OPTIONS = [
  {
    key: "consistency",
    text: "I want to pray more, but I keep getting distracted",
    emoji: "⏰",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    key: "personalization",
    text: "I sometimes struggle to find the right words when I pray",
    emoji: "🎯",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    key: "closer",
    text: "I miss feeling connected to God",
    emoji: "🤲",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    key: "restart",
    text: "I'm trying to rebuild my faith journey",
    emoji: "🔄",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    key: "intercession",
    text: "I carry others in my heart but rarely pray for them",
    emoji: "👥",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    key: "inspiration",
    text: "My spiritual life feels dry and routine",
    emoji: "✨",
    gradient: ["#667eea", "#764ba2"],
  },
  {
    key: "start",
    text: "I am just beginning my walk with God",
    emoji: "🧩",
    gradient: ["#667eea", "#764ba2"],
  },
];

interface MotivationSelectionModalProps {
  visible: boolean;
  currentMotivation: string | null;
  onSelect: (motivation: string) => void;
  onClose: () => void;
}

export default function MotivationSelectionModal({
  visible,
  currentMotivation,
  onSelect,
  onClose,
}: MotivationSelectionModalProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);

  const handleSelect = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(key);
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Update Your Motivation</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {MOTIVATION_OPTIONS.map((option, index) => {
              const isSelected = option.key === currentMotivation;
              return (
                <View key={option.key} style={{ marginBottom: index < MOTIVATION_OPTIONS.length - 1 ? R.h(1.5) : 0 }}>
                  <TouchableOpacity
                    onPress={() => handleSelect(option.key)}
                    activeOpacity={0.8}
                    style={[
                      styles.optionCard,
                      isSelected && styles.selectedCard,
                    ]}
                  >
                    <LinearGradient
                      colors={[option.gradient[0], option.gradient[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.optionGradient}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.optionContent}>
                          <Text style={styles.optionEmoji}>{option.emoji}</Text>
                          <Text style={styles.optionText}>{option.text}</Text>
                        </View>
                        {isSelected && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "center",
      alignItems: "center",
      padding: R.w(5),
    },
    modalContainer: {
      backgroundColor: "#1a1a2e",
      borderRadius: R.w(4),
      width: "100%",
      height: "80%",
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: R.w(5),
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
    },
    title: {
      fontSize: R.font(20),
      fontFamily: "SNPro-Bold",
      color: "#FFFFFF",
    },
    closeButton: {
      width: R.w(8),
      height: R.w(8),
      justifyContent: "center",
      alignItems: "center",
    },
    closeText: {
      fontSize: R.font(24),
      color: "rgba(255, 255, 255, 0.6)",
      fontFamily: "SNPro-Regular",
    },
    scrollView: {},
    scrollContent: {
      padding: R.w(5),
    },
    optionCard: {
      borderRadius: R.w(4),
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "transparent",
    },
    selectedCard: {
      borderColor: "#FFFFFF",
    },
    optionGradient: {
      padding: R.w(4),
      paddingVertical: R.h(2),
    },
    optionContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    optionEmoji: {
      fontSize: R.font(32),
      marginRight: R.w(3),
    },
    optionText: {
      flex: 1,
      fontSize: R.font(16),
      fontFamily: "SNPro-Semibold",
      color: "#FFFFFF",
      lineHeight: R.font(22),
    },
    checkmark: {
      width: R.w(6),
      height: R.w(6),
      borderRadius: R.w(3),
      backgroundColor: "#FFFFFF",
      justifyContent: "center",
      alignItems: "center",
      marginLeft: R.w(3),
    },
    checkmarkText: {
      fontSize: R.font(16),
      color: "#667eea",
      fontFamily: "SNPro-Bold",
    },
  });
