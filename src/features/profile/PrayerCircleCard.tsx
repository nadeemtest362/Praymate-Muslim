import React, { useMemo } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import useResponsive from "../../hooks/useResponsive";
import { Avatar } from "../../shared/ui";

interface PrayerPerson {
    id: string;
    name: string;
    image_uri?: string | null;
}

interface PrayerCircleCardProps {
    people: PrayerPerson[];
    activePeopleIds: string[];
    onViewAll: () => void;
}

export default function PrayerCircleCard({
    people,
    activePeopleIds,
    onViewAll,
}: PrayerCircleCardProps) {
    const R = useResponsive();
    const styles = useMemo(() => createStyles(R), [R]);

    const peopleCount = people.length;

    // Sort people: images with active first, then non-images with active (memoized for performance)
    const sortedPeople = useMemo(() => {
        return [...people].sort((a, b) => {
            const aHasImage = !!a.image_uri;
            const bHasImage = !!b.image_uri;
            const aActive = activePeopleIds.includes(a.id);
            const bActive = activePeopleIds.includes(b.id);

            // Priority order: image+active > no-image+active > image+inactive > no-image+inactive
            const aScore = (aActive ? 2 : 0) + (aHasImage ? 1 : 0);
            const bScore = (bActive ? 2 : 0) + (bHasImage ? 1 : 0);

            return bScore - aScore;
        });
    }, [people, activePeopleIds]);

    const activeCount = useMemo(() => {
        return people.filter((p) => activePeopleIds.includes(p.id)).length;
    }, [people, activePeopleIds]);

    // Early return after all hooks are called
    if (peopleCount === 0) {
        return null;
    }

    // Show all people since we now have horizontal scrolling
    const displayPeople = sortedPeople;

    return (
        <View style={styles.prayerCircleCard}>
            <LinearGradient
                colors={[
                    "rgba(139, 128, 249, 0.15)",
                    "rgba(108, 99, 255, 0.1)",
                ]}
                style={styles.prayerCircleGradient}
            >
                <View style={styles.circleHeader}>
                    <Text style={styles.circleTitle}>Prayer Circle</Text>
                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={onViewAll}
                    >
                        <Text style={styles.viewAllText}>View All</Text>
                        <Feather
                            name="arrow-right"
                            size={R.font(16)}
                            color="rgba(255,255,255,0.8)"
                        />
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
                                const isActive = activePeopleIds.includes(
                                    personId,
                                );

                                return (
                                    <TouchableOpacity
                                        key={personId}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/(app)/contact-detail",
                                                params: {
                                                    personId,
                                                    name: person.name,
                                                    image_uri: person.image_uri || '',
                                                    relationship: '', // We don't have relationship in this context
                                                }
                                            })}
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
                                                    ? R.w(6)
                                                    : R.w(4),
                                                overflow: "hidden",
                                            }}
                                        >
                                            <Avatar
                                                image_uri={person.image_uri}
                                                name={person.name}
                                                size={peopleCount === 1
                                                    ? R.w(12)
                                                    : R.w(8)}
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
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        {displayPeople.length > 4 && (
                            <LinearGradient
                                colors={[
                                    "transparent",
                                    "rgba(139, 128, 249, 0.15)",
                                ]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.fadeEdge}
                                pointerEvents="none"
                            />
                        )}
                    </View>
                </View>

                <Text style={styles.circleDescription}>
                    {activeCount} {activeCount === 1 ? "person" : "people"}{" "}
                    with active prayers • {peopleCount} total
                </Text>
            </LinearGradient>
        </View>
    );
}

const createStyles = (R: ReturnType<typeof useResponsive>) =>
    StyleSheet.create({
        prayerCircleCard: {
            marginHorizontal: R.w(4),
            marginBottom: R.h(3),
            borderRadius: R.w(6),
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(139, 128, 249, 0.2)",
        },
        prayerCircleGradient: {
            padding: R.h(2.5),
            paddingHorizontal: R.w(6),
            alignItems: "center",
        },
        circleHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: R.h(2.5),
        },
        circleTitle: {
            fontSize: R.font(22),
            fontFamily: "SNPro-Black",
            color: "#FFFFFF",
        },
        viewAllButton: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            paddingHorizontal: R.w(3),
            paddingVertical: R.h(0.75),
            borderRadius: R.w(3),
        },
        viewAllText: {
            fontSize: R.font(14),
            fontFamily: "SNPro-Bold",
            color: "rgba(255, 255, 255, 0.8)",
            marginRight: R.w(1),
        },
        avatarCircle: {
            width: "100%",
            minHeight: R.h(6),
            justifyContent: "center",
            alignItems: "center",
            marginBottom: R.h(2),
            position: "relative",
            paddingVertical: R.h(0.5),
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
            paddingHorizontal: 0,
            gap: R.w(3),
        },
        rowAvatar: {
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: R.w(4.5),
            position: "relative",
        },
        rowAvatarInactive: {
            opacity: 0.5,
            borderColor: "rgba(255, 255, 255, 0.15)",
        },
        rowAvatarSingle: {
            borderRadius: R.w(6.5),
        },

        activeIndicator: {
            position: "absolute",
            bottom: -2,
            right: -2,
            width: R.w(3),
            height: R.w(3),
            borderRadius: R.w(1.5),
            backgroundColor: "#8BED4F",
            borderWidth: 2,
            borderColor: "#141941",
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
    });
