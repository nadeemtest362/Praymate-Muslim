import React, { useMemo, useEffect } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import useResponsive from "../../hooks/useResponsive";
import { Avatar } from "../../shared/ui";
import { useAuth } from "../../hooks/useAuth";
import { queryClient, queryKeys } from "../../lib/queryClient";
import { intentionsRepository } from "../../repositories/intentionsRepository";

interface PrayerPerson {
    id: string;
    name: string;
    gender?: string | null;
    image_uri?: string | null;
    relationship?: string | null;
    updated_at?: string | null;
}

interface PrayerCircleSimpleProps {
    people: PrayerPerson[];
    activePeopleIds: string[];
    onViewAll: () => void;
    onAddPerson: () => void;
}

export default function PrayerCircleSimple({
    people,
    activePeopleIds,
    onViewAll,
    onAddPerson,
}: PrayerCircleSimpleProps) {
    const R = useResponsive();
    const styles = useMemo(() => createStyles(R), [R]);
    const { user } = useAuth();

    const peopleCount = people.length;

    // Sort people: recently updated first, then by active status and image
    const sortedPeople = useMemo(() => {
        const now = new Date().getTime();
        const RECENT_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

        return [...people].sort((a, b) => {
            const aHasImage = !!a.image_uri;
            const bHasImage = !!b.image_uri;
            // Production-safe: avoid .includes()
            const aActive = activePeopleIds.indexOf(a.id) !== -1;
            const bActive = activePeopleIds.indexOf(b.id) !== -1;

            const aUpdatedAt = a.updated_at
                ? new Date(a.updated_at).getTime()
                : 0;
            const bUpdatedAt = b.updated_at
                ? new Date(b.updated_at).getTime()
                : 0;
            const aRecent = (now - aUpdatedAt) < RECENT_THRESHOLD;
            const bRecent = (now - bUpdatedAt) < RECENT_THRESHOLD;

            // Priority order: recent+active > recent+inactive > active > has image > rest
            const aScore = (aRecent ? 8 : 0) + (aActive ? 4 : 0) +
                (aHasImage ? 2 : 0);
            const bScore = (bRecent ? 8 : 0) + (bActive ? 4 : 0) +
                (bHasImage ? 2 : 0);

            // If scores are equal, sort by most recent timestamp
            if (aScore === bScore) {
                return bUpdatedAt - aUpdatedAt;
            }

            return bScore - aScore;
        });
    }, [people, activePeopleIds]);

    const activeCount = useMemo(() => {
        // Production-safe: avoid .includes()
        return people.filter((p) => activePeopleIds.indexOf(p.id) !== -1).length;
    }, [people, activePeopleIds]);

    // Preload top visible people intentions to avoid navigation lag
    useEffect(() => {
        if (!user?.id || !peopleCount) return;
        // Production-safe: avoid array.slice()
        const top = [];
        for (let i = 0; i < Math.min(8, sortedPeople.length); i++) {
          top.push(sortedPeople[i]);
        }
        top.forEach(p => {
            const key = queryKeys.intentionsByPerson(user.id, p.id);
            if (!queryClient.getQueryData(key)) {
                queryClient
                    .prefetchQuery({
                        queryKey: key,
                        queryFn: () => intentionsRepository.getIntentionsByPersonId(user.id!, p.id),
                    })
                    .catch(() => {});
            }
        });
    }, [user?.id, peopleCount, sortedPeople]);

    // Early return after all hooks are called
    if (peopleCount === 0) {
        return null;
    }

    // Show all people since we now have horizontal scrolling
    const displayPeople = sortedPeople;

    return (
        <View
            style={styles.container}
        >
            <View style={styles.circleHeader}>
                <View style={styles.titleRow}>
                    <Text style={styles.circleTitle}>Prayer Circle</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{peopleCount}</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onAddPerson();
                    }}
                    style={styles.addTextButton}
                >
                    <Text style={styles.addTextButtonLabel}>+ Add</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.avatarCircle}>
                <View style={styles.scrollContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {displayPeople.map((person) => {
                            const personId = person.id;
                            // Production-safe: avoid .includes()
                            const isActive = activePeopleIds.indexOf(
                                personId,
                            ) !== -1;

                            const prefetchPerson = () => {
                                if (!user?.id) return;
                                const key = queryKeys.intentionsByPerson(user.id, personId);
                                if (!queryClient.getQueryData(key)) {
                                    queryClient
                                        .prefetchQuery({
                                            queryKey: key,
                                            queryFn: () => intentionsRepository.getIntentionsByPersonId(user.id!, personId),
                                        })
                                        .catch(() => {});
                                }
                            };

                            const handleOpenContact = () => {
                                router.push({
                                    pathname: "/(app)/contact-detail",
                                    params: {
                                        personId,
                                        name: person.name,
                                        image_uri: person.image_uri || "",
                                        relationship: person.relationship || "",
                                        gender: person.gender || "",
                                    },
                                });
                            };

                            return (
                                <TouchableOpacity
                                    key={personId}
                                    onPressIn={prefetchPerson}
                                    onPress={handleOpenContact}
                                    style={styles.personContainer}
                                >
                                    <View
                                        style={[
                                            styles.rowAvatar,
                                            !isActive &&
                                            styles.rowAvatarInactive,
                                            peopleCount === 1 &&
                                            styles.rowAvatarSingle,
                                        ]}
                                    >
                                        <View
                                            style={{
                                                borderRadius: peopleCount === 1
                                                    ? R.w(7)
                                                    : R.w(3),
                                                overflow: "hidden",
                                            }}
                                        >
                                            <Avatar
                                                image_uri={person.image_uri}
                                                name={person.name}
                                                size={peopleCount === 1
                                                    ? R.w(14)
                                                    : R.w(12)}
                                            />
                                        </View>
                                        {isActive && (
                                            <View
                                                style={styles.activeIndicator}
                                            >
                                                <View
                                                    style={styles
                                                        .activeIndicatorDot}
                                                />
                                            </View>
                                        )}
                                    </View>
                                    <Text
                                        style={styles.personName}
                                        numberOfLines={1}
                                    >
                                        {person.gender === 'name' ? person.name : person.name.split(" ")[0]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {peopleCount >= 0 && peopleCount <= 3 && (
                            <View style={styles.personContainer}>
                                <TouchableOpacity
                                    onPress={onAddPerson}
                                    style={[
                                        styles.emptyStateCircle,
                                        peopleCount === 1 &&
                                        styles.emptyStateCircleSingle,
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Feather
                                        name="plus"
                                        size={R.font(peopleCount === 1 ? 32 : 24)}
                                        color="rgba(255,255,255,0.8)"
                                    />
                                </TouchableOpacity>
                                <Text style={[styles.personName, { opacity: 0 }]} numberOfLines={1}>
                                    {" "}
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}

const createStyles = (R: ReturnType<typeof useResponsive>) =>
    StyleSheet.create({
        container: {
            marginBottom: R.h(1),
            alignItems: "center",
        },
        circleHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginVertical: R.h(0.5),
            marginBottom: R.h(1.5),
            paddingHorizontal: R.w(5),
        },
        titleRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: R.w(2),
        },
        circleTitle: {
            fontSize: R.font(24),
            fontFamily: "SNPro-Black",
            color: "#FFFFFF",
        },
        countBadge: {
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            paddingHorizontal: R.w(1.5),
            paddingVertical: R.h(0.3),
            borderRadius: R.w(1.5),
            minWidth: R.w(5),
            alignItems: "center",
            justifyContent: "center",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255, 255, 255, 0.25)",
        },
        countBadgeText: {
            fontSize: R.font(12),
            fontFamily: "SNPro-Bold",
            color: "#FFFFFF",
        },
        viewAllButton: {
            flexDirection: "row",
            alignItems: "center",

            paddingHorizontal: R.w(2),
            paddingVertical: R.h(0.75),
            borderRadius: R.w(3),
        },
        viewAllText: {
            fontSize: R.font(14),
            fontFamily: "SNPro-Medium",
            color: "rgba(255, 255, 255, 0.8)",
            marginRight: R.w(0.5),
            marginBottom: R.h(0.5),
        },
        addButton: {
            padding: R.w(2),
            justifyContent: "center",
            alignItems: "center",
        },
        addPersonButton: {
            padding: R.w(1),
            justifyContent: "center",
            alignItems: "center",
        },
        addTextButton: {
            backgroundColor: "rgba(255, 255, 255, 0.18)",
            paddingHorizontal: R.w(2.5),
            paddingVertical: R.h(0.6),
            borderRadius: R.w(4),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: "rgba(255, 255, 255, 0.3)",
        },
        addTextButtonLabel: {
            fontSize: R.font(13),
            fontFamily: "SNPro-Semibold",
            color: "#FFFFFF",
        },
        avatarCircle: {
            width: "100%",
            minHeight: R.h(6),
            justifyContent: "center",
            alignItems: "center",
            marginBottom: R.h(1),
            position: "relative",
        },
        scrollView: {
            width: "100%",
        },
        scrollContainer: {
            position: "relative",
            width: "100%",
        },
        scrollContent: {
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: R.w(5),
            paddingRight: R.w(2),
            marginVertical: R.h(0.5),
            gap: R.w(4.5),
        },
        personContainer: {
            alignItems: "center",
            gap: R.h(0.5),
        },
        personName: {
            fontSize: R.font(11),
            fontFamily: "SNPro-Medium",
            color: "rgba(255, 255, 255, 0.8)",
            maxWidth: R.w(14),
            textAlign: "center",
        },
        rowAvatar: {
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: R.w(6.5),
            position: "relative",
        },
        rowAvatarInactive: {
            opacity: 0.5,
            borderColor: "rgba(255, 255, 255, 0.15)",
        },
        rowAvatarSingle: {
            borderRadius: R.w(7.5),
        },

        activeIndicator: {
            position: "absolute",
            bottom: R.h(0.2),
            right: R.w(-0.4),

            width: R.w(3),
            height: R.w(3),
            borderRadius: R.w(1.5),
            backgroundColor: "#8BED4F",
            borderWidth: 2,
            borderColor: "rgba(20, 25, 65, 0.9)",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            elevation: 10,
        },
        activeIndicatorDot: {
            width: R.w(1),
            height: R.w(1),
            borderRadius: R.w(0.5),
            backgroundColor: "#FFFFFF",
        },

        circleDescription: {
            fontSize: R.font(14),
            color: "rgba(255, 255, 255, 0.7)",
            textAlign: "center",
            fontFamily: "SNPro-Medium",
            lineHeight: R.font(20),
        },
        fadeEdge: {
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 20,
            zIndex: 1,
        },
        emptyStateCircle: {
            width: R.w(12),
            height: R.w(12),
            borderRadius: R.w(6),
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.5)",
            borderStyle: "dashed",
            backgroundColor: "transparent",
            alignItems: "center",
            justifyContent: "center",
        },
        emptyStateCircleSingle: {
            width: R.w(14),
            height: R.w(14),
            borderRadius: R.w(7),
        },
    });
