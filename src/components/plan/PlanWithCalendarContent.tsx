import React from "react";
import {
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";

import WeeklyCalendar from "../progress/WeeklyCalendar";
import StreakSummaryModal from "../home/StreakSummaryModal";
import PrayerJourneyTimeline from "./PrayerJourneyTimeline";
import {
    PLAN_EVENING_ICON,
    PLAN_MORNING_ICON,
} from "../../utils/warmPlanIcons";
import { trackEvent } from "../../lib/analytics";
import type useResponsive from "../../hooks/useResponsive";

interface PlanWithCalendarContentProps {
    R: ReturnType<typeof useResponsive>;
    styles: any;
    selectedDate: Date;
    handleDateSelect: (date: Date) => void;
    filteredEnhancedPrayers: any[];
    isDateFilterActive: boolean;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    selectedFilter: "all" | "morning" | "evening" | "liked";
    setSelectedFilter: (
        filter: "all" | "morning" | "evening" | "liked",
    ) => void;
    adjustedFilterCounts: {
        all: number;
        morning: number;
        evening: number;
        liked: number;
    };
    calendarReady: boolean;
    dateFilteredPrayers: any[];
    peopleImageMap: Map<string, string | null>;
    onLikeToggle: (prayerId: string, currentLiked: boolean | null) => void;
    onPrayerPress: (prayer: any) => void;
    hasDisplayedInitialPrayers: boolean;
    onRefresh: () => Promise<void> | void;
    isRefreshing: boolean;
    ListEmptyComponent: React.ReactElement | null;
    ListFooterComponent: React.ReactElement | null;
    isStreakModalVisible: boolean;
    setIsStreakModalVisible: (visible: boolean) => void;
    handleStreakPress: () => void;
    currentStreak: number;
    displayPrayers: any[];
    morningCompleted: boolean;
    eveningCompleted: boolean;
    todayHasPrayer: boolean;
    isPerfectDayToday: boolean;
}

const PlanWithCalendarContent: React.FC<PlanWithCalendarContentProps> = ({
    R,
    styles,
    selectedDate,
    handleDateSelect,
    filteredEnhancedPrayers,
    isDateFilterActive,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    adjustedFilterCounts,
    calendarReady,
    dateFilteredPrayers,
    peopleImageMap,
    onLikeToggle,
    onPrayerPress,
    hasDisplayedInitialPrayers,
    onRefresh,
    isRefreshing,
    ListEmptyComponent,
    ListFooterComponent,
    isStreakModalVisible,
    setIsStreakModalVisible,
    handleStreakPress,
    currentStreak,
    displayPrayers,
    morningCompleted,
    eveningCompleted,
    todayHasPrayer,
    isPerfectDayToday,
}) => {
    return (
        <View style={styles.container}>
            <View pointerEvents="none" style={styles.iconPreloadContainer}>
                <ExpoImage
                    source={PLAN_MORNING_ICON}
                    style={styles.iconPreload}
                    contentFit="contain"
                    priority="high"
                    cachePolicy="memory"
                    transition={0}
                />
                <ExpoImage
                    source={PLAN_EVENING_ICON}
                    style={styles.iconPreload}
                    contentFit="contain"
                    priority="high"
                    cachePolicy="memory"
                    transition={0}
                />
            </View>

            <LinearGradient
                colors={["#050b2b", "#190f4d", "#461e70", "#803392", "#b44da6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
            />

            <View
                style={[styles.header, { paddingTop: R.insets.top + R.h(1.5) }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.greetingSection}>
                        <Text style={styles.headerTitle}>My Journey</Text>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={handleStreakPress}
                            activeOpacity={0.85}
                            style={styles.streakBadge}
                        >
                            <Text style={styles.streakEmoji}>🙏</Text>
                            <Text style={styles.streakNumber}>
                                {currentStreak}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.headerDivider} />

                {calendarReady && (
                    <WeeklyCalendar
                        selectedDate={selectedDate}
                        onDateSelect={handleDateSelect}
                        prayers={filteredEnhancedPrayers}
                        styles={styles}
                        isDateFilterActive={isDateFilterActive}
                    />
                )}

                <View style={styles.searchContainer}>
                    <Feather
                        name="search"
                        size={20}
                        color="rgba(255,255,255,0.5)"
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your prayers..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery("")}
                            style={styles.clearButton}
                        >
                            <Ionicons
                                name="close-circle"
                                size={20}
                                color="rgba(255,255,255,0.5)"
                            />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterContainer}
                    contentContainerStyle={styles.filterContent}
                >
                    {(["all", "morning", "evening", "liked"] as const).map((
                        filter,
                    ) => (
                        <TouchableOpacity
                            key={filter}
                            onPress={() => {
                                Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light,
                                );
                                setSelectedFilter(filter);
                                trackEvent("prayer_history_filter_set", {
                                    filter,
                                });
                            }}
                            style={[
                                styles.filterPill,
                                selectedFilter === filter &&
                                styles.filterPillActive,
                            ]}
                        >
                            {filter === "all" && (
                                <View style={styles.filterPillContent}>
                                    <Text
                                        style={[
                                            styles.filterPillText,
                                            selectedFilter === filter &&
                                            styles.filterPillTextActive,
                                        ]}
                                    >
                                        All
                                    </Text>
                                    <View style={styles.filterBadge}>
                                        <Text style={styles.filterBadgeText}>
                                            {adjustedFilterCounts.all}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {filter === "morning" && (
                                <View style={styles.filterPillContent}>
                                    <ExpoImage
                                        source={PLAN_MORNING_ICON}
                                        style={styles.filterEmojiImage}
                                        contentFit="contain"
                                        priority="high"
                                        cachePolicy="memory"
                                        transition={0}
                                    />
                                    <Text
                                        style={[
                                            styles.filterPillText,
                                            selectedFilter === filter &&
                                            styles.filterPillTextActive,
                                        ]}
                                    >
                                        Morning
                                    </Text>
                                    <View style={styles.filterBadge}>
                                        <Text style={styles.filterBadgeText}>
                                            {adjustedFilterCounts.morning}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {filter === "evening" && (
                                <View style={styles.filterPillContent}>
                                    <ExpoImage
                                        source={PLAN_EVENING_ICON}
                                        style={styles.filterEmojiImage}
                                        contentFit="contain"
                                        priority="high"
                                        cachePolicy="memory"
                                        transition={0}
                                    />
                                    <Text
                                        style={[
                                            styles.filterPillText,
                                            selectedFilter === filter &&
                                            styles.filterPillTextActive,
                                        ]}
                                    >
                                        Evening
                                    </Text>
                                    <View style={styles.filterBadge}>
                                        <Text style={styles.filterBadgeText}>
                                            {adjustedFilterCounts.evening}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {filter === "liked" && (
                                <View style={styles.filterPillContent}>
                                    <Text
                                        style={[
                                            styles.filterPillText,
                                            selectedFilter === filter &&
                                            styles.filterPillTextActive,
                                        ]}
                                    >
                                        ❤️ Liked
                                    </Text>
                                    <View style={styles.filterBadge}>
                                        <Text style={styles.filterBadgeText}>
                                            {adjustedFilterCounts.liked}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.listContainer}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor="#FFD700"
                            colors={["#FFD700"]}
                            progressViewOffset={0}
                        />
                    }
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                >
                    {dateFilteredPrayers.length === 0
                        ? ListEmptyComponent
                        : (
                            <PrayerJourneyTimeline
                                prayers={dateFilteredPrayers}
                                peopleImageMap={peopleImageMap}
                                onLikeToggle={onLikeToggle}
                                onPrayerPress={onPrayerPress}
                                hasDisplayedInitialPrayers={hasDisplayedInitialPrayers}
                                R={R}
                            />
                        )}
                    {ListFooterComponent}
                </ScrollView>
            </View>

            <StreakSummaryModal
                visible={isStreakModalVisible}
                onClose={() => setIsStreakModalVisible(false)}
                currentStreak={currentStreak}
                prayers={displayPrayers}
                morningCompleted={morningCompleted}
                eveningCompleted={eveningCompleted}
                todayHasPrayer={todayHasPrayer}
                isPerfectDayToday={isPerfectDayToday}
            />
        </View>
    );
};

export default PlanWithCalendarContent;
