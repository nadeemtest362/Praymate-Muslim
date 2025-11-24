import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { Avatar } from "../../shared/ui";
import { safeSlice } from "../../utils/safeArrayMethods";
import { extractPeopleFromSnapshot } from "../../utils/prayerUtils";
import {
    PLAN_EVENING_ICON,
    PLAN_MORNING_ICON,
} from "../../utils/warmPlanIcons";
import { APP_MOOD_OPTIONS } from "../../constants/moodConstants";
import { PRAYER_TOPICS, PrayerTopicId } from "../../constants/prayerConstants";
import useResponsive from "../../hooks/useResponsive";

interface PrayerCardProps {
    prayer: any;
    index: number;
    peopleImageMap?: Map<string, string | null>;
    onLikeToggle: (prayerId: string, currentLiked: boolean | null) => void;
    onPress: () => void;
    styles: any;
    shouldAnimateEntry: boolean;
    isLastCard: boolean;
}

const PrayerCard = React.memo<PrayerCardProps>(({
    prayer,
    index,
    peopleImageMap,
    onLikeToggle,
    onPress,
    styles,
    shouldAnimateEntry,
    isLastCard,
}) => {
    const snapshotPeople = useMemo(
        () => extractPeopleFromSnapshot(prayer.input_snapshot || null),
        [prayer.input_snapshot],
    );
    const safePeople = useMemo(() => {
        if (!Array.isArray(snapshotPeople)) return [] as any[];
        if (!peopleImageMap) return snapshotPeople;
        return snapshotPeople.map((p: any) => {
            if (p?.image_uri) return p;
            const key = typeof p?.name === "string" ? p.name.toLowerCase() : "";
            const fallback = key ? peopleImageMap.get(key) : undefined;
            return fallback ? { ...p, image_uri: fallback } : p;
        });
    }, [snapshotPeople, peopleImageMap]);
    const displayPeople = safeSlice(safePeople, 0, 4);
    const remainingCount = Math.max(0, safePeople.length - 4);

    const prayerDate = prayer.generated_at
        ? new Date(prayer.generated_at)
        : new Date();

    // Apply 4am boundary logic for display date - prayers before 4am count as previous day
    const displayDate = new Date(prayerDate);
    const currentHour = prayerDate.getHours();
    if (currentHour < 4) {
        displayDate.setDate(displayDate.getDate() - 1);
    }

    const prayerTime = format(prayerDate, "h:mm a");

    const isLiked = prayer.liked === true;
    const isMorning = (prayer.slot &&
        (prayer.slot.indexOf("morning") !== -1 ||
            prayer.slot.indexOf("am") !== -1 ||
            prayer.slot === "onboarding-initial")) || false;
    const imageSource = isMorning ? PLAN_MORNING_ICON : PLAN_EVENING_ICON;

    // Extract mood from input_snapshot
    const moodData = useMemo(() => {
        const moodId = prayer.input_snapshot?.dbProfileMoodAtGeneration;
        const moodOption = APP_MOOD_OPTIONS.find((m) => m.id === moodId);
        return {
            emoji: moodOption?.emoji || "😌",
            text: moodOption?.label || "peaceful",
        };
    }, [prayer.input_snapshot]);

    // Timeline icon (morning/evening)
    const timelineIcon = isMorning ? PLAN_MORNING_ICON : PLAN_EVENING_ICON;

    // Extract intention topics from input_snapshot
    const intentionTopics = useMemo(() => {
        const snapshot = prayer.input_snapshot;
        if (!snapshot) return [];

        const seenCategories = new Set<string>();
        const topics: Array<{ emoji: string; label: string }> = [];

        const activeBuckets = [
            snapshot.activeIntentions,
            snapshot.fetchedIntentionsForPrompt,
            snapshot.inputSnapshotForDB?.fetchedIntentionsForPrompt,
            snapshot.modelKnows?.activeIntentions,
        ];

        activeBuckets.forEach((bucket) => {
            if (!Array.isArray(bucket)) return;
            bucket.forEach((intention: any) => {
                if (
                    intention?.category &&
                    !seenCategories.has(intention.category)
                ) {
                    seenCategories.add(intention.category);
                    const topic =
                        PRAYER_TOPICS[intention.category as PrayerTopicId];
                    if (topic) {
                        topics.push({ emoji: topic.emoji, label: topic.label });
                    }
                }
            });
        });

        return topics;
    }, [prayer.input_snapshot]);

    // Extract first paragraph only (skip greeting)
    const displayContent = useMemo(() => {
        const content = prayer.content || "Prayer content unavailable";
        const lines = content.split("\n");

        let startIndex = 0;

        // Skip greeting line if present
        if (lines[0]?.trim().toLowerCase().startsWith("dear")) {
            startIndex = 1;
        }

        // Skip any empty lines after greeting
        while (startIndex < lines.length && !lines[startIndex].trim()) {
            startIndex++;
        }

        // Get first paragraph (lines until next empty line or end)
        const paragraphLines = [];
        for (let i = startIndex; i < lines.length; i++) {
            if (!lines[i].trim()) break;
            paragraphLines.push(lines[i]);
        }

        return paragraphLines.join(" ").trim();
    }, [prayer.content]);

    return (
        <Animated.View
            style={styles.prayerCardContainer}
            entering={shouldAnimateEntry
                ? FadeIn.duration(360).delay(120 + Math.min(index, 6) * 30)
                : undefined}
        >
            {/* Timeline */}
            <View style={styles.timelineContainer}>
                <View style={styles.timelineCircle}>
                    <ExpoImage
                        source={timelineIcon}
                        style={styles.timelineIcon}
                        contentFit="contain"
                        priority="high"
                        cachePolicy="memory"
                        transition={0}
                    />
                </View>
                {!isLastCard && (
                    <View style={styles.timelineLineContainer}>
                        <View style={styles.timelineLine} />
                    </View>
                )}
            </View>

            {/* Card Content */}
            <View style={styles.prayerCard}>
                <LinearGradient
                    colors={isMorning
                        ? [
                            "rgba(255, 183, 77, 0.08)",
                            "rgba(255, 215, 0, 0.04)",
                            "rgba(255, 255, 255, 0.02)",
                        ]
                        : [
                            "rgba(123, 104, 238, 0.08)",
                            "rgba(139, 128, 249, 0.04)",
                            "rgba(255, 255, 255, 0.02)",
                        ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.prayerGradient}
                >
                    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
                        <View style={styles.prayerHeaderWrapper}>
                            <View style={styles.prayerHeader}>
                                <View style={styles.prayerDateContainer}>
                                    <View style={styles.prayerDateInfo}>
                                        <Text style={styles.prayerTime}>
                                            {prayer.slot ===
                                                    "onboarding-initial"
                                                ? "First Prayer"
                                                : `${format(displayDate, "EEEE")} • ${prayerTime}`}
                                        </Text>
                                        <View
                                            style={styles.prayerDateAndLikeRow}
                                        >
                                            <Text style={styles.prayerDate}>
                                                {format(
                                                    displayDate,
                                                    "MMMM do, yyyy",
                                                )}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Haptics.impactAsync(
                                                        Haptics
                                                            .ImpactFeedbackStyle
                                                            .Light,
                                                    );
                                                    onLikeToggle(
                                                        prayer.id,
                                                        prayer.liked,
                                                    );
                                                }}
                                                style={styles
                                                    .likeButtonInlineDate}
                                                hitSlop={{
                                                    top: 10,
                                                    bottom: 10,
                                                    left: 10,
                                                    right: 10,
                                                }}
                                            >
                                                <Ionicons
                                                    name={isLiked
                                                        ? "heart"
                                                        : "heart-outline"}
                                                    size={18}
                                                    color={isLiked
                                                        ? "#FF6B8B"
                                                        : "rgba(255,255,255,0.5)"}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={styles.prayerTimeRow}>
                                            {safePeople.length > 0 && (
                                                <View
                                                    style={styles.peopleAvatarsHeader}
                                                >
                                                    {displayPeople.map((
                                                        person: any,
                                                        idx: number,
                                                    ) => (
                                                        <Animated.View
                                                            style={[
                                                                styles.personAvatar,
                                                                {
                                                                    marginLeft: idx > 0
                                                                        ? -4
                                                                        : 0,
                                                                    zIndex:
                                                                        displayPeople
                                                                            .length -
                                                                        idx,
                                                                },
                                                            ]}
                                                            key={person.id || idx}
                                                            entering={FadeIn.duration(
                                                                400,
                                                            ).delay(260 + idx * 45)}
                                                        >
                                                            <Avatar
                                                                image_uri={person
                                                                    .image_uri}
                                                                name={person.name}
                                                                size={24}
                                                                borderWidth={1}
                                                                borderColor="#FFB74D"
                                                            />
                                                        </Animated.View>
                                                    ))}
                                                    {remainingCount > 0 && (
                                                        <Animated.View
                                                            style={styles.moreCount}
                                                            entering={FadeIn.duration(
                                                                400,
                                                            ).delay(
                                                                260 +
                                                                    displayPeople
                                                                            .length *
                                                                        45,
                                                            )}
                                                        >
                                                            <Text
                                                                style={styles
                                                                    .moreCountText}
                                                            >
                                                                +{remainingCount}
                                                            </Text>
                                                        </Animated.View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.prayerHeaderActions}>
                                    <View style={styles.prayerMoodPill}>
                                        <Text
                                            style={styles
                                                .prayerMoodEmoji}
                                        >
                                            {moodData.emoji}
                                        </Text>
                                        <Text
                                            style={styles
                                                .prayerMoodText}
                                        >
                                            {moodData.text}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.prayerContent} numberOfLines={4}>
                            {displayContent}
                        </Text>

                        {/* Prayer Topics Pills */}
                        {intentionTopics.length > 0 && (
                            <View style={styles.topicPillsContainer}>
                                {intentionTopics.slice(0, 3).map((
                                    topic,
                                    idx,
                                ) => (
                                    <Animated.View
                                        key={`${topic.label}-${idx}`}
                                        style={styles.topicPill}
                                        entering={FadeIn.duration(400).delay(
                                            300 + idx * 50,
                                        )}
                                    >
                                        <Text style={styles.topicPillEmoji}>
                                            {topic.emoji}
                                        </Text>
                                        <Text style={styles.topicPillText}>
                                            {topic.label}
                                        </Text>
                                    </Animated.View>
                                ))}
                                {intentionTopics.length > 3 && (
                                    <Animated.Text
                                        style={styles.topicPillMoreText}
                                        entering={FadeIn.duration(400).delay(
                                            450,
                                        )}
                                    >
                                        <Text style={styles.topicPillMoreNumber}>
                                            +{intentionTopics.length - 3}
                                        </Text>{" "}
                                        more
                                    </Animated.Text>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </Animated.View>
    );
});

PrayerCard.displayName = "PrayerCard";

interface PrayerJourneyTimelineProps {
    prayers: any[];
    peopleImageMap: Map<string, string | null>;
    onLikeToggle: (prayerId: string, currentLiked: boolean | null) => void;
    onPrayerPress: (prayer: any) => void;
    hasDisplayedInitialPrayers: boolean;
    R: ReturnType<typeof useResponsive>;
}

export default function PrayerJourneyTimeline({
    prayers,
    peopleImageMap,
    onLikeToggle,
    onPrayerPress,
    hasDisplayedInitialPrayers,
    R,
}: PrayerJourneyTimelineProps) {
    const styles = useMemo(() => createPrayerCardStyles(R), [
        R.width,
        R.height,
    ]);

    const renderPrayerCard = useCallback(
        ({ item, index }: { item: any; index: number }) => {
            const totalPrayers = prayers.length;
            const isLastCard = index === totalPrayers - 1;

            return (
                <PrayerCard
                    key={item.id}
                    prayer={item}
                    index={index}
                    peopleImageMap={peopleImageMap}
                    onLikeToggle={onLikeToggle}
                    styles={styles}
                    shouldAnimateEntry={hasDisplayedInitialPrayers}
                    isLastCard={isLastCard}
                    onPress={() => onPrayerPress(item)}
                />
            );
        },
        [
            onLikeToggle,
            styles,
            peopleImageMap,
            hasDisplayedInitialPrayers,
            prayers.length,
            onPrayerPress,
        ],
    );

    return (
        <>
            {prayers.map((item, index) => (
                <React.Fragment key={item.id}>
                    {renderPrayerCard({ item, index })}
                </React.Fragment>
            ))}
        </>
    );
}

const createPrayerCardStyles = (R: ReturnType<typeof useResponsive>) =>
    StyleSheet.create({
        prayerCardContainer: {
            flexDirection: "row",
            marginBottom: R.h(1.5),
        },
        timelineContainer: {
            width: R.w(12),
            alignItems: "center",
            paddingTop: R.h(1.5),
        },
        timelineCircle: {
            width: R.w(8),
            height: R.w(8),
            borderRadius: R.w(4),
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255,255,255,0.3)",
            alignItems: "center",
            justifyContent: "center",
        },
        timelineIcon: {
            width: R.w(5),
            height: R.w(5),
        },
        timelineLineContainer: {
            flex: 1,
            width: R.w(0.5),
            alignItems: "center",
            marginTop: R.h(0.5),
            marginBottom: -R.h(3),
        },
        timelineLine: {
            width: R.w(0.5),
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.1)",
        },
        prayerCard: {
            flex: 1,
            borderRadius: R.w(6),
            backgroundColor: "rgba(0,0,0,0.08)",
        },
        prayerGradient: {
            paddingVertical: R.h(1.5),
            paddingHorizontal: R.w(4),
            borderWidth: R.w(0.3),
            borderColor: "rgba(255,255,255,0.1)",
            borderRadius: R.w(6),
            position: "relative",
            overflow: "hidden",
        },
        prayerHeaderWrapper: {
            marginBottom: R.h(1.5),
        },
        prayerHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
        },

        prayerDateInfo: {
            flex: 1,
        },
        prayerDateAndLikeRow: {
            flexDirection: "row",
            alignItems: "center",
        },
        likeButtonInlineDate: {
            marginLeft: R.w(2),
        },
        prayerDate: {
            fontSize: R.font(20),
            fontFamily: "SNPro-Heavy",
            color: "#FFFFFF",
            letterSpacing: -0.5,
        },
        prayerTimeRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: R.w(2),
            marginTop: R.h(1),
        },
        prayerTime: {
            fontSize: R.font(13),
            fontFamily: "SNPro-Medium",
            color: "rgba(255,255,255,0.5)",
            marginBottom: R.h(0.3),
        },
        peopleAvatarsHeader: {
            flexDirection: "row",
            alignItems: "center",
        },
        prayerMoodPill: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255, 183, 77, 0.15)",
            borderRadius: R.w(10),
            paddingHorizontal: R.w(2),
            paddingVertical: R.h(0.6),
            gap: R.w(1.5),
            borderWidth: StyleSheet.hairlineWidth,
          
            borderColor: "rgba(255, 183, 77, 0.4)",
        },
        prayerMoodEmoji: {
            fontSize: R.font(11),
        },
        prayerMoodText: {
            fontSize: R.font(11),
            fontFamily: "SNPro-Bold",
            color: "#FFB74D",
            marginTop: R.h(0.1),
        },
        prayerHeaderActions: {
            flexDirection: "row",
            alignItems: "center",
            paddingTop: R.h(0.3),
        },
        prayerContent: {
            fontSize: R.font(14),
            lineHeight: R.lineHeight(15),
            marginBottom: R.h(1),
            color: "rgba(255, 255, 255, 0.76)",
            fontFamily: "SNPro-Regular",
            letterSpacing: 0.2,
        },
     
     
    
        peopleAvatars: {
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 8,
        },
        personAvatar: {
            width: 24,
            height: 24,
            borderRadius: 12,
            marginLeft: -8,
            backgroundColor: "rgba(0,0,0,0.1)",
        },
        moreCount: {
            height: 24,
            minWidth: 24,
            paddingHorizontal: 6,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: -8,
        },
        moreCountText: {
            fontSize: R.font(14),
            fontFamily: "SNPro-Regular",
            color: "#FFFFFF",
            opacity: 0.5,
            marginLeft: R.w(1.5),
        },
        topicPillsContainer: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: R.w(2),
            marginTop: R.h(1),
            marginBottom: 0,
        },
        topicPill: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: R.w(3),
            paddingHorizontal: R.w(2),
            paddingVertical: R.h(0.4),
            borderWidth: R.w(0.2),
            borderColor: "rgba(255, 255, 255, 0.2)",
        },
        topicPillEmoji: {
            fontSize: R.font(12),
            marginRight: R.w(1.2),
        },
        topicPillText: {
            fontSize: R.font(11),
            fontFamily: "SNPro-Heavy",
            color: "rgba(255,255,255,0.8)",
            
        },
        topicPillMoreText: {
            fontSize: R.font(13),
            fontFamily: "SNPro-Regular",
            color: "rgba(255,255,255,0.5)",
            letterSpacing: 0.2,
            alignSelf: "center",
        },
        topicPillMoreNumber: {
            fontFamily: "SNPro-Heavy",
            fontSize: R.font(13),
            color: "#FFFFFF",
            opacity: 0.6,
        },
    });
