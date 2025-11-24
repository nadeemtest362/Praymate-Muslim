import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import useResponsive from "../../hooks/useResponsive";

interface SubscriptionStatusModalProps {
  visible: boolean;
  status: "cancelled_but_active" | "expired" | "trial_expired";
  expiryDate?: string; // For cancelled_but_active
  hasBeenDismissed?: boolean; // If user previously dismissed the modal
  onClose: () => void;
  onContinue: () => void;
  logEvent?: (eventName: string, properties?: Record<string, any>) => void;
  paywallSource?: 'prayer_begin' | 'journey_upgrade' | 'praylock_toggle' | null;
}

const SubscriptionStatusModal: React.FC<SubscriptionStatusModalProps> = ({
  visible,
  status,
  expiryDate,
  hasBeenDismissed = false,
  onClose,
  onContinue,
  logEvent,
  paywallSource,
}) => {
  const R = useResponsive();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      width: R.w(85),
      maxWidth: 400,
      borderRadius: R.w(6),
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    content: {
      padding: R.w(6),
      alignItems: "center",
    },
    iconContainer: {
      width: R.w(16),
      height: R.w(16),
      borderRadius: R.w(8),
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: R.h(3),
    },
    title: {
      fontSize: R.font(32),
      fontFamily: "SNPro-Black",
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: R.h(1.5),
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: R.font(16),
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      lineHeight: R.lineHeight(20),
      marginBottom: R.h(1),
    },
    description: {
      fontSize: R.font(14),
      fontWeight: "500",
      color: "rgba(255, 255, 255, 0.7)",
      textAlign: "center",
      lineHeight: R.lineHeight(18),
      marginBottom: R.h(4),
    },
    buttonContainer: {
      width: "100%",
      gap: R.h(1.5),
    },
    primaryButton: {
      backgroundColor: "#FFFFFF",
      borderRadius: R.w(4),
      paddingVertical: R.h(2),
      paddingHorizontal: R.w(6),
      alignItems: "center",
      shadowColor: "rgba(0, 0, 0, 0.2)",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 3,
    },
    primaryButtonText: {
      fontSize: R.font(20),
      fontFamily: "SNPro-Black",
      color: "#1A2151",
    },
    secondaryButton: {

      paddingVertical: R.h(2),
      paddingHorizontal: R.w(6),
      alignItems: "center",
    },
    secondaryButtonText: {
      fontSize: R.font(16),
      fontFamily: "SNPro-Regular",
      color: "rgba(255, 255, 255, 0.5)",
    },
  });

  const getModalContent = () => {
    if (status === "cancelled_but_active") {
      return {
        icon: "time-outline" as const,
        title: hasBeenDismissed
          ? "Subscription Required"
          : "Subscription Ending Soon",
        subtitle: hasBeenDismissed
          ? "Premium access is required to continue"
          : expiryDate
          ? `Your premium access ends ${expiryDate}`
          : "Your premium access is ending soon",
        description: hasBeenDismissed
          ? "To access your prayers and premium features, please renew your subscription now."
          : "Continue your prayer journey without interruption. Renew now to keep all premium features.",
        primaryAction: "Continue Premium",
        secondaryAction: "Not Now",
        gradient: ["#FF6B6B", "#4ECDC4", "#45B7D1"] as [string, string, string],
      };
    } else if (status === "trial_expired") {
      // Trial expired - encourage renewal
      return {
        icon: "star-outline" as const,
        title: "Your Trial Has Ended",
        subtitle: "Continue your prayer journey",
        description: "Your free trial has ended. Subscribe now to keep your prayers, streaks, and premium features.",
        primaryAction: "Continue with Premium",
        secondaryAction: "Not Now",
        gradient: ["#8B5FBF", "#7C3AED", "#6B21A8"] as [string, string, string],
      };
    } else {
      // expired (previously subscribed, now expired)
      return {
        icon: "lock-closed-outline" as const,
        title: "Subscription Expired",
        subtitle: "Renew to restore access",
        description: "Your subscription has expired. Renew now to restore your prayers, streaks, and all premium features.",
        primaryAction: "Renew Subscription",
        secondaryAction: "Not Now",
        gradient: ["#8B5FBF", "#7C3AED", "#6B21A8"] as [string, string, string],
      };
    }
  };

  const content = getModalContent();
  const hasTrackedShownRef = useRef(false);

  // Track paywall shown event when modal becomes visible
  useEffect(() => {
    if (visible && !hasTrackedShownRef.current && logEvent && paywallSource) {
      logEvent(`${paywallSource}_paywall_shown`, {
        subscription_status: status,
        paywall_type: 'subscription_status_modal',
      });
      hasTrackedShownRef.current = true;
    }
    if (!visible) {
      hasTrackedShownRef.current = false;
    }
  }, [visible, logEvent, paywallSource, status]);

  const handlePrimaryAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (logEvent && paywallSource) {
      logEvent(`${paywallSource}_paywall_cta_clicked`, {
        subscription_status: status,
        paywall_type: 'subscription_status_modal',
      });
    }
    onContinue();
  };

  const handleSecondaryAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (logEvent && paywallSource) {
      logEvent(`${paywallSource}_paywall_closed`, {
        subscription_status: status,
        paywall_type: 'subscription_status_modal',
      });
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <LinearGradient
            colors={content.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={content.icon}
                size={32}
                color="rgba(255, 255, 255, 0.9)"
              />
            </View>

            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
            <Text style={styles.description}>{content.description}</Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePrimaryAction}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {content.primaryAction}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSecondaryAction}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  {content.secondaryAction}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SubscriptionStatusModal;
