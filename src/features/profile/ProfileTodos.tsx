import React, { useMemo, useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import TodoContainer from "../../components/home/TodoContainer";
import useResponsive from "../../hooks/useResponsive";
import { router } from "expo-router";

interface ProfileTodosProps {
  profile: any;
  peopleCount: number;
  prayerCount: number;
  praylockEnabled: boolean;
}

export default function ProfileTodos({
  profile,
  peopleCount,
  prayerCount,
  praylockEnabled,
}: ProfileTodosProps) {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R]);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);

  // Check notification permissions on mount
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === "granted");
      } catch (error) {
        console.error("Error checking notification permissions:", error);
      }
    };
    checkNotifications();
  }, []);

  const todos = useMemo(() => {
    return [
      // 1. Enable notifications (highest priority)
      {
        id: "enable-notifications",
        icon: {
          type: "ionicon" as const,
          name: "notifications",
        },
        title: "Enable notifications",
        description: "Never forget to pray",
        completed: notificationsEnabled,
        onPress: () => router.push("/settings"),
        onToggle: () => router.push("/settings"),
      },
      // 2. Add profile photo
      {
        id: "add-photo",
        icon: {
          type: "ionicon" as const,
          name: "camera",
        },
        title: "Add a profile photo",
        description: "Personalize your prayer journey",
        completed: !!profile?.avatar_url,
        onPress: () => router.push("/edit-profile"),
        onToggle: () => router.push("/edit-profile"),
      },
      // 3. Enable Praylock
      {
        id: "enable-praylock",
        icon: {
          type: "ionicon" as const,
          name: "lock-closed",
        },
        title: "Enable Prayblock",
        description: "Block distracting apps until you complete your prayer",
        completed: praylockEnabled,
        onPress: () => router.push("/praylock-setup"),
        onToggle: () => router.push("/praylock-setup"),
      },
      // 4. Add more people to prayer circle
      {
        id: "add-people",
        icon: {
          type: "ionicon" as const,
          name: "people",
        },
        title: "Add more people to pray for",
        description: "Grow your prayer circle",
        completed: peopleCount >= 3,
        onPress: () => router.push("/intentions"),
        onToggle: () => router.push("/intentions"),
      },
    ];
  }, [notificationsEnabled, profile?.avatar_url, praylockEnabled, peopleCount]);

  const allCompleted = todos.every((todo) => todo.completed);

  if (allCompleted) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TodoContainer todos={todos} />
    </View>
  );
}

const createStyles = (R: ReturnType<typeof useResponsive>) =>
  StyleSheet.create({
    container: {
      marginHorizontal: R.w(4),
      marginBottom: R.h(3),
    },
  });
