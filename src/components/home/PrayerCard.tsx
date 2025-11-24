import React, { useMemo, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import MaskedView from "@react-native-masked-view/masked-view";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Avatar } from "../../shared/ui";
import { PLAN_MORNING_ICON, PLAN_EVENING_ICON } from "../../utils/warmPlanIcons";
import { Prayer } from "../../models/prayer";
import useResponsive from "../../hooks/useResponsive";
import { TwinklingStar } from "../../features/prayer-display/TwinklingStar";
import { createDesignSystem } from "../../styles/designSystem";
import { getCurrentPeriod, isInPrayerWindow, onMinuteTick, setCanonicalTimezone, getNextBoundary, nowInTimezone } from "../../lib/time/Clock";
import { useAuth } from "../../hooks/useAuth";
import { extractPeopleFromSnapshot } from "../../utils/prayerUtils";
import { PraylockShimmer } from "./PraylockShimmer";

interface PrayerPerson {
  id: string;
  name: string;
  image_uri?: string | null;
  relationship?: string | null;
  gender?: string | null;
}

interface PrayerCardProps {
  morningPrayer?: Prayer | null;
  eveningPrayer?: Prayer | null;
  prayerPeople?: PrayerPerson[];
  allPeople?: PrayerPerson[];
  onBeginPrayer: () => void;
  onShare?: () => void;
  praylockEnabled?: boolean;
  onPraylockToggle?: () => void;
  canTogglePraylock?: boolean;
  currentPeriod?: "morning" | "evening";
  currentWindowAvailable?: boolean;
}

// Define createStyles as a pure function outside component
const createStyles = (R: ReturnType<typeof useResponsive>) => {
  const ds = createDesignSystem(R);

  return StyleSheet.create({
    container: {
      width: "100%",
      marginBottom: R.h(2),
     
    },
    card: {
      borderRadius: R.w(6),
      overflow: "hidden",
      height: R.h(28),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    content: {
      flex: 1,
      padding: R.w(3),
      paddingHorizontal: R.w(5),
      paddingBottom: R.h(3),
      justifyContent: "space-between",
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: R.h(1),
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    titleEmoji: {
      width: R.w(6),
      height: R.w(6),
      marginRight: R.w(2),
    },
    title: {
      color: "#FFFFFF",
      fontSize: R.font(30),
      fontFamily: "SNPro-Black",
      textTransform: "capitalize",
      letterSpacing: -0.5,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 2,
    },
    completedBadge: {
      width: R.w(4.5),
      height: R.w(4.5),
      borderRadius: R.w(2.25),
      backgroundColor: ds.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: R.w(1.5),
      shadowColor: "rgba(0, 0, 0, 0.2)",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 2,
      elevation: 2,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: R.w(2),
    },
    readyBadge: {
      backgroundColor: ds.colors.primaryAlpha,
      paddingVertical: R.h(0.75),
      paddingHorizontal: R.w(3),
      borderRadius: R.w(4),
      borderWidth: 1,
      borderColor: ds.colors.primaryBorder,
    },
    readyText: {
      color: ds.colors.primary,
      fontSize: R.font(12),
      fontWeight: "700",
    },
  
    countdownText: {
      color: "rgba(255,255,255,0.65)",
      fontSize: R.font(14),
      fontFamily: "SNPro-SemiBold",
      textAlign: "center",
      marginTop: R.h(0.5),
    },
    existingPrayerContent: {
      flex: 1,
      justifyContent: "center",
      paddingVertical: R.h(2),
      paddingHorizontal: R.w(4),
    },
    prayerSnippet: {
      color: "rgba(255, 255, 255, 0.95)",
      fontSize: R.font(15),
      fontWeight: "600",
      lineHeight: R.lineHeight(17),
      marginBottom: R.h(1.5),
      textAlign: "left",
    },
    verseContainer: {
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: R.w(3),
      paddingHorizontal: R.w(3),
      paddingVertical: R.h(1),
      alignSelf: "flex-start",
    },
    verseText: {
      color: "rgba(255, 255, 255, 0.9)",
      fontSize: R.font(12),
      fontWeight: "600",
      fontStyle: "italic",
      textAlign: "center",
    },
    emptyStateContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: R.h(2),
    },
    avatarStack: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      marginBottom: R.h(2),
      minHeight: R.h(8), 
    },
    avatarPlaceholder: {
      opacity: 0,
    },
    peoplePlaceholderText: {
      opacity: 0,
    },
    avatars: {
      flexDirection: "row",
      marginBottom: R.h(0.5),
    },
    avatarWrap: {
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.8)",
      borderRadius: 17, 
      overflow: "hidden",
      width: 34,
      height: 34, 
      alignItems: "center",
      justifyContent: "center",
    },
    moreAvatarWrap: {
      borderRadius: 15,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    moreAvatarText: {
      color: "rgba(255, 255, 255, 0.9)",
      fontSize: R.font(10),
      fontWeight: "600",
    },
    peopleText: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: R.font(15),
      fontWeight: "500",
      textAlign: "center",
      maxWidth: "60%",
      alignSelf: "center",
      lineHeight: R.lineHeight(15),
      marginTop: R.h(0.5),
    },
    hintText: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: R.font(13),
      fontWeight: "500",
      textAlign: "center",
      lineHeight: R.lineHeight(13),
      marginBottom: R.h(1),
    },
    button: {
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      borderRadius: R.w(6),
      paddingVertical: R.h(1.8),
      paddingHorizontal: R.w(6),
      alignItems: "center",
      alignSelf: "center",
      width: "80%",
      shadowColor: "rgba(0, 0, 0, 0.1)",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 2,
    },
    activeButton: {
      shadowColor: "rgba(255, 255, 255, 0.5)",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
    },
    inactiveButton: {
      opacity: 0.8,
    },
    buttonText: {
      color: "#1A2151",
      fontSize: R.font(20),
      fontFamily: "SNPro-Black",
      letterSpacing: -0.5,
      lineHeight: R.lineHeight(20),
    },
    decorationContainer: {
      position: "absolute",
      top: 0,
      right: -R.w(20),
      opacity: 0.05,
      zIndex: 0,
      pointerEvents: "none",
    },
    decorationImage: {
      width: R.w(50),
      height: R.w(50),
    },
    buttonContainer: {
      flexDirection: "row",
      gap: R.w(2),
      alignSelf: "center",
      width: "96%",
    },
    secondaryButton: {
     backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: R.w(6),
      paddingVertical: R.h(1.6),
      paddingHorizontal: R.w(2),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
      minWidth: 80,
    },
    praylockToggle: {
      paddingLeft: R.w(2),
      paddingVertical: R.h(0.5),
    },
  });
};

const PrayerCard: React.FC<PrayerCardProps> = ({
  morningPrayer,
  eveningPrayer,
  prayerPeople = [],
  allPeople = [],
  onBeginPrayer,
  onShare,
  praylockEnabled = false,
  onPraylockToggle,
  canTogglePraylock = false,
  currentPeriod: currentPeriodProp,
  currentWindowAvailable: currentWindowAvailableProp,
}) => {
  const R = useResponsive();
  const { profile } = useAuth();
  const timezone = profile?.timezone ?? undefined;
  
  // Compute time state locally using the AuthoritativeClock
  const [localCurrentPeriod, setLocalCurrentPeriod] = React.useState(() => getCurrentPeriod(timezone));
  const [localWindowAvailable, setLocalWindowAvailable] = React.useState(() => isInPrayerWindow(timezone));
  const [countdown, setCountdown] = React.useState<React.ReactNode | null>(null);

  // Update timezone when profile changes and immediately refresh state
  useEffect(() => {
    if (timezone) {
      setCanonicalTimezone(timezone);
    }
    if (currentPeriodProp === undefined) {
      setLocalCurrentPeriod(getCurrentPeriod(timezone));
    }
    if (currentWindowAvailableProp === undefined) {
      setLocalWindowAvailable(isInPrayerWindow(timezone));
    }
  }, [timezone, currentPeriodProp, currentWindowAvailableProp]);

  // Helper to calculate and format countdown
  const calculateCountdown = React.useCallback(() => {
    const { type: nextPeriod, at: nextBoundary } = getNextBoundary(timezone);
    const now = nowInTimezone(timezone);
    const msUntilNext = nextBoundary.getTime() - now.getTime();
    
    if (msUntilNext <= 0) {
      return null;
    }
    
    const hours = Math.floor(msUntilNext / (1000 * 60 * 60));
    const minutes = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));
    const capitalizedPeriod = nextPeriod.charAt(0).toUpperCase() + nextPeriod.slice(1);
    
    if (hours > 0) {
      return (
        <Text style={styles.countdownText}>
          <Text style={{ fontFamily: 'SNPro-Heavy' }}>{capitalizedPeriod}</Text> prayer available in <Text style={{ fontFamily: 'SNPro-Heavy' }}>{hours}h {minutes}m</Text>
        </Text>
      );
    } else {
      return (
        <Text style={styles.countdownText}>
          <Text style={{ fontFamily: 'SNPro-Heavy' }}>{capitalizedPeriod}</Text> prayer available in <Text style={{ fontFamily: 'SNPro-Heavy' }}>{minutes}min</Text>
        </Text>
      );
    }
  }, [timezone]);

  // Listen for minute ticks to update time state
  useEffect(() => {
    if (currentPeriodProp !== undefined && currentWindowAvailableProp !== undefined) {
      return;
    }

    const unsubscribe = onMinuteTick(() => {
      if (currentPeriodProp === undefined) {
        setLocalCurrentPeriod(getCurrentPeriod(timezone));
      }
      if (currentWindowAvailableProp === undefined) {
        setLocalWindowAvailable(isInPrayerWindow(timezone));
      }
      setCountdown(calculateCountdown());
    });

    return unsubscribe;
  }, [timezone, currentPeriodProp, currentWindowAvailableProp, calculateCountdown]);
  
  // Calculate countdown on mount and when prayers change
  useEffect(() => {
    setCountdown(calculateCountdown());
  }, [calculateCountdown, morningPrayer?.completed_at, eveningPrayer?.completed_at]);

  const effectiveCurrentPeriod = currentPeriodProp ?? localCurrentPeriod;
  const effectiveWindowAvailable = currentWindowAvailableProp ?? localWindowAvailable;

  const styles = useMemo(() => createStyles(R), [R]);

  // Animation values
  const cardScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const pulseValue = useSharedValue(1);
  const praylockWidth = useSharedValue(40);
  const praylockHeight = useSharedValue(40);

  const showMorningPrayer = effectiveCurrentPeriod === "morning";

  // Determine which prayer to show based on current period
  let currentPrayer = null;

  if (showMorningPrayer && morningPrayer) {
    currentPrayer = morningPrayer;
  } else if (!showMorningPrayer && eveningPrayer) {
    currentPrayer = eveningPrayer;
  }

  const hasExistingPrayer = !!currentPrayer;

  const isAvailable = effectiveWindowAvailable;

  // Start pulse animation when prayer window is available and no existing prayer
  React.useEffect(() => {
    if (isAvailable && !hasExistingPrayer) {
      pulseValue.value = withRepeat(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [isAvailable, hasExistingPrayer, pulseValue]);

  // Calculate people to show in the card
  const safePrayerPeople = Array.isArray(prayerPeople) ? prayerPeople : [];
  const allPeopleSafe = Array.isArray(allPeople) ? allPeople : [];
  const isCompletedPrayer = Boolean(currentPrayer?.completed_at);

  const peopleLookup = useMemo(() => {
    const byId = new Map<string, PrayerPerson>();
    const byName = new Map<string, PrayerPerson>();

    const addPerson = (person: PrayerPerson) => {
      if (!person || typeof person !== "object" || !person.name) {
        return;
      }

      if (typeof person.id === "string" && person.id.length > 0 && !byId.has(person.id)) {
        byId.set(person.id, person);
      }

      const normalizedName = person.name.trim().toLowerCase();
      if (normalizedName && !byName.has(normalizedName)) {
        byName.set(normalizedName, person);
      }
    };

    safePrayerPeople.forEach((person) => {
      if (!person) return;
      addPerson(person);
    });

    allPeopleSafe.forEach((person) => {
      if (!person) return;
      addPerson(person);
    });

    return { byId, byName };
  }, [safePrayerPeople, allPeopleSafe]);

  const findMatchingPerson = React.useCallback(
    (raw: PrayerPerson, normalizedName: string) => {
      if (!raw && !normalizedName) {
        return undefined;
      }

      const normalizedId = typeof raw?.id === "string" ? raw.id : null;

      let match: PrayerPerson | undefined;

      if (normalizedId) {
        match = peopleLookup.byId.get(normalizedId);
      }

      if (!match && normalizedName) {
        match = peopleLookup.byName.get(normalizedName);
      }

      return match;
    },
    [peopleLookup]
  );

  const snapshotPeople = useMemo(() => {
    if (!isCompletedPrayer) {
      return [] as PrayerPerson[];
    }

    const extracted = extractPeopleFromSnapshot(
      (currentPrayer?.input_snapshot as any) ?? null
    );

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return [] as PrayerPerson[];
    }

    const enriched: PrayerPerson[] = [];

    for (let i = 0; i < extracted.length; i += 1) {
      const rawPerson = extracted[i] as PrayerPerson | undefined;
      if (!rawPerson || typeof rawPerson !== "object") {
        continue;
      }

      const name = typeof rawPerson.name === "string" ? rawPerson.name : "";
      if (!name) {
        continue;
      }

      let imageUri = rawPerson.image_uri ?? null;
      let relationship = (rawPerson as any).relationship ?? null;
      let gender = (rawPerson as any).gender ?? null;
      let finalId =
        typeof rawPerson.id === "string" && rawPerson.id.length > 0
          ? rawPerson.id
          : `snapshot-${i}`;

      const matchedPerson = findMatchingPerson(rawPerson, name.trim().toLowerCase());

      if (matchedPerson) {
        imageUri = matchedPerson.image_uri ?? imageUri;
        relationship = matchedPerson.relationship ?? relationship;
        gender = matchedPerson.gender ?? gender;

        if (matchedPerson.id) {
          finalId = matchedPerson.id;
        }
      }

      if (!imageUri) {
        for (let j = 0; j < safePrayerPeople.length; j += 1) {
          const candidate = safePrayerPeople[j];
          if (!candidate || typeof candidate !== "object") {
            continue;
          }

          const sameId = Boolean(rawPerson.id) && candidate.id === rawPerson.id;
          let sameName = false;

          if (typeof candidate.name === "string") {
            const candidateName = candidate.name.trim().toLowerCase();
            sameName = candidateName.length > 0 && candidateName === name.trim().toLowerCase();
          }

          if (sameId || sameName) {
            imageUri = candidate.image_uri ?? null;
            relationship = candidate.relationship ?? relationship;
            gender = candidate.gender ?? gender;
            if (!rawPerson.id && candidate.id) {
              finalId = candidate.id;
            }
            break;
          }
        }
      }

      enriched.push({
        id: finalId,
        name,
        image_uri: imageUri,
        relationship,
        gender,
      });
    }

    return enriched;
  }, [isCompletedPrayer, currentPrayer?.input_snapshot, safePrayerPeople, findMatchingPerson]);

  const displayPeople = useMemo(() => {
    if (isCompletedPrayer && snapshotPeople.length > 0) {
      const deduped: PrayerPerson[] = [];
      const seen = new Set<string>();

      const meEntry = safePrayerPeople.find((person) => person && person.name === "Me");
      if (meEntry) {
        const key = meEntry.id || meEntry.name.trim().toLowerCase();
        if (key && !seen.has(key)) {
          deduped.push(meEntry);
          seen.add(key);
        }
      }

      snapshotPeople.forEach((person) => {
        const key = person.id || person.name.trim().toLowerCase();
        if (!key || seen.has(key)) {
          return;
        }
        deduped.push(person);
        seen.add(key);
      });

      return deduped;
    }

    return safePrayerPeople;
  }, [isCompletedPrayer, snapshotPeople, safePrayerPeople]);

  const hasPeople = displayPeople.length > 0;
  const peopleToShow = displayPeople.slice(0, 4);
  const peopleCount = displayPeople.length;

  // Only show people once they've actually loaded (not just empty array)
  const hasLoadedPeople = hasPeople && displayPeople.every((person) => person.name);

  // Handle button press - subscription check moved to home screen
  const handleButtonPress = () => {
    // Stop pulse animation if it's running
    pulseValue.value = 1;
    
    buttonScale.value = withSpring(0.95, { damping: 15 });
    setTimeout(() => {
      buttonScale.value = withSpring(1, { damping: 15 });
      
      // Restart pulse animation after press animation completes
      if (isAvailable && !hasExistingPrayer) {
        pulseValue.value = withRepeat(
          withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }
    }, 100);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call the callback directly - home screen will handle subscription checking
    onBeginPrayer();
  };

  // Handle share button press
  const handleSharePress = () => {
    if (onShare) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onShare();
    }
  };

  // Handle card press
  const handleCardPress = () => {
    cardScale.value = withSpring(0.98, { damping: 15 });
    setTimeout(() => {
      cardScale.value = withSpring(1, { damping: 15 });
    }, 100);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Add pulse animation to the button when available and no existing prayer
  const pulseAnimStyle = useAnimatedStyle(() => {
    if (isAvailable && !hasExistingPrayer) {
      return {
        transform: [{ scale: pulseValue.value }],
      };
    }
    return {};
  });

  // No praylock glow

  // Define gradients based on prayer type
  const morningGradient: [string, string, string] = [
    "rgba(251, 146, 60, 0.8)",
    "rgba(245, 101, 101, 0.7)",
    "rgba(139, 128, 249, 0.6)",
  ];
  const eveningGradient: [string, string, string] = [
    "rgba(88, 86, 214, 0.9)",
    "rgba(123, 104, 238, 0.8)",
    "rgba(147, 112, 219, 0.7)",
  ];
  const currentGradient = showMorningPrayer ? morningGradient : eveningGradient;
  const cardBaseColor = "#0a0a0a";

  // Prayer info
  const prayerTitle = showMorningPrayer ? "Morning Prayer" : "Evening Prayer";
  const prayerEmojiSource = showMorningPrayer ? PLAN_MORNING_ICON : PLAN_EVENING_ICON;

  return (
    <Animated.View
      style={[styles.container, animatedCardStyle]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.card, { backgroundColor: cardBaseColor }]}
        disabled={true}
      >
        <LinearGradient
          colors={currentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Twinkling stars for evening prayer */}
        {!showMorningPrayer && (
          <>
            <TwinklingStar top={R.h(3)} left={R.w(10)} size={2} delay={0} />
            <TwinklingStar top={R.h(8)} left={R.w(80)} size={3} delay={500} />
            <TwinklingStar top={R.h(15)} left={R.w(15)} size={2} delay={1000} />
            <TwinklingStar top={R.h(5)} left={R.w(65)} size={2} delay={1500} />
            <TwinklingStar top={R.h(20)} left={R.w(85)} size={3} delay={2000} />
            <TwinklingStar top={R.h(12)} left={R.w(45)} size={2} delay={2500} />
          </>
        )}

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              {hasExistingPrayer && currentPrayer?.completed_at ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-sharp" size={15} color="#FFFFFF" />
                </View>
              ) : (
                <Image
                  source={prayerEmojiSource}
                  style={[styles.titleEmoji, { marginRight: R.w(2.5) }]}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.title}>{prayerTitle}</Text>
            </View>
            <View style={styles.headerRight}>
              {canTogglePraylock && (
                <TouchableOpacity
                  style={styles.praylockToggle}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPraylockToggle?.();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      {
                        shadowColor: "#fff",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: praylockEnabled ? 0.3 : 0,
                        shadowRadius: praylockEnabled ? 6 : 0,
                        elevation: praylockEnabled ? 6 : 0,
                        borderRadius: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                      },
                    ]}
                  >
                    {praylockEnabled ? (
                      <MaskedView
                        style={{ width: 40, height: 40 }}
                        maskElement={
                          <Image
                            source={require("../../../assets/images/praylock-icon.png")}
                            style={{ width: 40, height: 40 }}
                            resizeMode="contain"
                          />
                        }
                      >
                        <Image
                          source={require("../../../assets/images/praylock-icon.png")}
                          style={{ width: 40, height: 40 }}
                          resizeMode="contain"
                        />
                        <PraylockShimmer 
                          containerWidth={praylockWidth} 
                          containerHeight={praylockHeight}
                        />
                      </MaskedView>
                    ) : (
                      <Image
                        source={require("../../../assets/images/praylock-icon.png")}
                        style={{
                          width: 40,
                          height: 40,
                          opacity: 0.4,
                        }}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.emptyStateContent}>
            {/* Avatar Stack - always render container to maintain layout */}
            <View style={styles.avatarStack}>
              {hasLoadedPeople ? (
                <>
                  <View style={styles.avatars}>
                    {peopleToShow.slice(0, 4).map((person, index) => {
                      if (!person || typeof person !== "object") return null;
                      return (
                        <Animated.View
                          key={person.id || `person-${index}`}
                          style={[
                            styles.avatarWrap,
                            { marginLeft: index > 0 ? -4 : 0 },
                          ]}
                          entering={FadeIn.duration(220).delay(index * 30)}
                        >
                          <Avatar
                            image_uri={person.image_uri}
                            name={person.name || "Unknown"}
                            size={30}
                          />
                        </Animated.View>
                      );
                    })}
                    {peopleCount > 4 && (
                      <Animated.View
                        style={[
                          styles.moreAvatarWrap,
                          { marginLeft: -4, alignSelf: "center" },
                        ]}
                        entering={FadeIn.duration(220).delay(Math.min(peopleCount, 4) * 30)}
                      >
                        <Text style={styles.moreAvatarText}>
                          +{peopleCount - 4}
                        </Text>
                      </Animated.View>
                    )}
                  </View>
                  <Animated.View
                    entering={FadeIn.duration(220).delay(Math.min(peopleCount, 4) * 30 + 40)}
                  >
                    <Text style={styles.peopleText}>
                      {hasExistingPrayer ? "prayed for " : "with "}
                      <Text style={[styles.peopleText, { fontWeight: "800" }]}>
                        {peopleToShow
                          .slice(0, 4)
                          .map((p) => p.name.split(" ")[0])
                          .join(", ")}
                      </Text>
                      {peopleCount > 4 && (
                        <>
                          <Text style={styles.peopleText}>, and </Text>
                          <Text
                            style={[styles.peopleText, { fontWeight: "800" }]}
                          >
                            {peopleCount - 4}
                          </Text>
                          <Text style={styles.peopleText}> others</Text>
                        </>
                      )}
                    </Text>
                  </Animated.View>
                </>
              ) : (
                <>
                  <View style={styles.avatars}>
                    {[0, 1, 2, 3].map((index) => (
                      <View
                        key={`avatar-placeholder-${index}`}
                        style={[
                          styles.avatarWrap,
                          { marginLeft: index > 0 ? -4 : 0 },
                          styles.avatarPlaceholder,
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.peopleText, styles.peoplePlaceholderText]}>placeholder</Text>
                </>
              )}
            </View>

            {/* Show verse reference for existing prayers */}
            {hasExistingPrayer && currentPrayer?.verse_ref && (
              <View style={styles.verseContainer}>
                <Text style={styles.verseText}>{currentPrayer.verse_ref}</Text>
              </View>
            )}
          </View>

          {/* Decorative Elements */}
          <View style={styles.decorationContainer}>
            <Image
              source={showMorningPrayer ? PLAN_MORNING_ICON : PLAN_EVENING_ICON}
              style={styles.decorationImage}
              resizeMode="contain"
            />
          </View>

          {/* Button(s) */}
          {hasExistingPrayer && currentPrayer?.completed_at && onShare ? (
            // Show two buttons when prayer is completed and share handler is provided
            <View style={[styles.buttonContainer, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.activeButton,
                    { width: "100%" },
                  ]}
                  onPress={handleButtonPress}
                  activeOpacity={0.9}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: showMorningPrayer ? "#B45309" : "#5856D6" },
                    ]}
                  >
                    🙏 View My Prayer
                  </Text>
                </TouchableOpacity>
                {countdown}
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSharePress}
                activeOpacity={0.9}
              >
                <Ionicons name="share-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            // Show single button for all other states
            <Animated.View
              style={[
                animatedButtonStyle,
                isAvailable && !hasExistingPrayer && pulseAnimStyle,
              ]}
            >
              <TouchableOpacity
                style={[styles.button, styles.activeButton]} // Always show as active - button is always functional
                onPress={handleButtonPress}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: showMorningPrayer ? "#B45309" : "#5856D6" },
                  ]}
                >
                  {hasExistingPrayer && currentPrayer?.completed_at
                    ? "✓ Completed"
                    : hasExistingPrayer
                    ? "🙏 Complete Prayer"
                    : "🙏 Start My Prayer"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default PrayerCard;
