import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useResponsive from "../../hooks/useResponsive";

interface TodoItem {
  id: string;
  icon?: {
    type: "ionicon" | "image";
    name?: string;
    uri?: string;
  };
  title: string;
  description: string;
  completed: boolean;
  onPress?: () => void;
  onToggle?: () => void;
}

interface TodoContainerProps {
  todos: TodoItem[];
}

const createStyles = (R: ReturnType<typeof useResponsive>) => {
  return StyleSheet.create({
    container: {
      marginVertical: R.h(0.5),
    },
    card: {
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderRadius: R.w(5),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255, 255, 255, 0.15)",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
      marginTop: R.h(0.5),
    },
    cardContent: {
      padding: R.w(4),
      paddingVertical: R.h(2.5),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: R.h(1),
    },
    headerEmoji: {
      fontSize: R.font(24),
      marginRight: R.w(2),
    },
    headerTitle: {
      color: "rgba(255, 255, 255, 0.95)",
      fontSize: R.font(26),
      fontFamily: "SNPro-Black",
    },
    todosList: {
      gap: 0,
      paddingHorizontal: R.w(2),
    },
    todoItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: R.h(1.8),
      gap: R.w(3),
    },
    todoDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    todoIconContainer: {
      marginTop: R.h(0.2),
      minWidth: R.w(6),
      justifyContent: "center",
      alignItems: "center",
    },
    todoIconImage: {
      width: R.w(6),
      height: R.w(6),
    },
    todoContent: {
      flex: 1,
    },
    todoTitle: {
      color: "rgba(255, 255, 255, 0.95)",
      fontSize: R.font(18),
      fontFamily: "SNPro-Bold",
      marginBottom: R.h(0.3),
    },
    todoDescription: {
      color: "rgba(255, 255, 255, 0.65)",
      fontSize: R.font(14),
      lineHeight: R.font(19),
      fontWeight: "400",
    },
    todoButton: {
      width: R.w(6.5),
      height: R.w(6.5),
      borderRadius: R.w(3.25),
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.3)",
      justifyContent: "center",
      alignItems: "center",
      marginTop: R.h(0.2),
    },
    todoButtonActive: {
      backgroundColor: "rgba(174, 61, 222, 0.8)",
      borderColor: "rgba(217, 141, 249, 0.8)"
    },
    checkmark: {
      color: "#fff",
      fontSize: R.font(14),
      fontWeight: "bold",
    },
  });
};

const TodoContainer: React.FC<TodoContainerProps> = ({ todos }) => {
  const R = useResponsive();

  const styles = useMemo(() => {
    if (!R || typeof R !== "object") {
      console.error("[TodoContainer] useResponsive returned invalid value:", R);
      return createStyles({
        w: () => 0,
        h: () => 0,
        font: () => 14,
        lineHeight: () => 20,
        width: 0,
        height: 0,
      } as any);
    }
    return createStyles(R);
  }, [R]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>✨</Text>
            <Text style={styles.headerTitle}>To-do</Text>
          </View>

          {/* Todo Items */}
          <View style={styles.todosList}>
            {todos.map((todo, index) => (
              <View key={todo.id}>
                <TouchableOpacity
                  style={styles.todoItem}
                  onPress={todo.onPress}
                  activeOpacity={0.7}
                >
                  {/* Icon */}
                  <View style={styles.todoIconContainer}>
                    {todo.icon?.type === "image" && todo.icon.uri ? (
                      <Image
                        source={{ uri: todo.icon.uri }}
                        style={styles.todoIconImage}
                        resizeMode="contain"
                      />
                    ) : todo.icon?.type === "ionicon" && todo.icon.name ? (
                      <Ionicons
                        name={todo.icon.name as any}
                        size={R.w(6)}
                        color="rgba(255, 255, 255, 0.9)"
                      />
                    ) : null}
                  </View>

                  {/* Content */}
                  <View style={styles.todoContent}>
                    <Text style={styles.todoTitle}>{todo.title}</Text>
                    <Text style={styles.todoDescription}>
                      {todo.description}
                    </Text>
                  </View>

                  {/* Toggle Button */}
                  <TouchableOpacity
                    style={[
                      styles.todoButton,
                      todo.completed && styles.todoButtonActive,
                    ]}
                    onPress={todo.onToggle}
                    activeOpacity={0.8}
                  >
                    {todo.completed && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Divider - only between items, not after last */}
                {index < todos.length - 1 && (
                  <View style={styles.todoDivider} />
                )}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export default TodoContainer;
