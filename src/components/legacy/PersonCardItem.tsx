import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Avatar } from '../../shared/ui'; // Use the shared Avatar component
import type { PrayerPerson } from '../../repositories/peopleRepository';
import { Feather } from '@expo/vector-icons'; // Import Feather icons
// Use ReanimatedSwipeable
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'; 
// Import only what's needed
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Use Reanimated for list item animation AND action animation
import Animated, { Layout, FadeIn, useAnimatedStyle, SharedValue, interpolate, Extrapolate } from 'react-native-reanimated'; 

interface PersonCardItemProps {
  person: PrayerPerson;
  onRemove: (id: string) => void; 
}

// Define a separate component for the right actions to use hooks
const RenderRightActions = ({ 
  progress, 
  dragX, 
  onPress 
}: { 
  progress: SharedValue<number>; 
  dragX: SharedValue<number>; 
  onPress: () => void; 
}) => {
  // Animate based on dragX for the reveal effect
  const animatedStyle = useAnimatedStyle(() => {
    // Interpolate dragX for a translateX effect
    // As dragX goes from 0 to -80 (swiping left), translateX goes from 80 to 0
    const translateX = interpolate(
      dragX.value,
      [-80, 0], // Input range (swipe distance)
      [0, 80],  // Output range (action container position)
      Extrapolate.CLAMP // Clamp the output
    );
    // Optionally, interpolate progress for opacity/scale effects
    const opacity = interpolate(
      progress.value,
      [0, 1],
      [0.5, 1],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX: translateX }],
      opacity: opacity,
    };
  });

  return (
    // Use Reanimated.View for animated styles
    <Animated.View style={[styles.rightActionContainer, animatedStyle]}>
      <TouchableOpacity onPress={onPress} style={styles.removeSwipeButton}>
        <Feather name="trash-2" size={24} color="#E8E1EF" />
        <Text style={styles.removeSwipeText}>Remove</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Define an interface matching the expected SwipeableMethods structure
interface SwipeableMethods {
  close: () => void;
  openLeft: () => void;
  openRight: () => void;
  reset: () => void;
}

export default function PersonCardItem({ person, onRemove }: PersonCardItemProps) {
  const router = useRouter();
  const [imageLoadError, setImageLoadError] = useState(false);
  // Use the defined interface for the ref type
  const swipeableRef = useRef<SwipeableMethods>(null); 

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Could navigate to person detail screen in the future
  };

  const handlePrayPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Ensure we navigate to the modal route defined in the parent layout
    router.push({ 
      pathname: '../../add-intention-app', // Use relative path to target screen in parent layout
      params: { personId: person.id } 
      // No extra options needed here, rely on layout config
    });
  };

  const handleRemovePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Show confirmation alert first
    Alert.alert(
      `Remove ${person.name}?`,
      `This will remove ${person.name} and all related prayer intentions. This cannot be undone. Are you sure?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => swipeableRef.current?.close(), // Close swipeable on cancel
        },
        {
          text: "Remove",
          style: "destructive",
          // Only call onRemove if the user confirms
          onPress: () => {
            swipeableRef.current?.close(); // Close first
            // Delay slightly to allow close animation to start
            setTimeout(() => {
    onRemove(person.id);
            }, 100); 
          }
        }
      ],
      { cancelable: true, onDismiss: () => swipeableRef.current?.close() } // Also close on dismiss
    );
    // Remove the direct call to onRemove here
    // onRemove(person.id);
    // swipeableRef.current?.close(); 
  };

  // Use the new component, passing the handler
  const renderRightActionsCallback = (
    progress: SharedValue<number>,
    dragX: SharedValue<number>
  ) => {
    return (
      <RenderRightActions 
        progress={progress} 
        dragX={dragX} 
        onPress={handleRemovePress} 
      />
    );
  };

  return (
    <Animated.View 
      layout={Layout.springify().damping(15).stiffness(90)} 
      entering={FadeIn.duration(300)} 
      style={styles.outerContainer}
    >
      <GestureHandlerRootView> 
        {/* Use ReanimatedSwipeable component */}
        <ReanimatedSwipeable 
          ref={swipeableRef}
          renderRightActions={renderRightActionsCallback} // Use the callback
          // Set friction to 1 for direct finger tracking during drag
          friction={1} 
          rightThreshold={40} 
          // Enable overshoot for a more native feel
          overshootRight={true} 
          // Add friction during overshoot for resistance (docs suggest 8+ for native feel)
          overshootFriction={8} 
          containerStyle={styles.swipeableContainer} // Added for potential styling needs
          childrenContainerStyle={styles.swipeableChildrenContainer} // Added for potential styling needs
        >
          {/* Original Touchable Card Content */}
          <TouchableOpacity
            style={styles.personCard}
            onPress={handlePress}
            activeOpacity={0.95} 
          >
            <LinearGradient
              colors={['rgba(87, 98, 213, 0.9)', 'rgba(123, 77, 133, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            
            <View style={styles.personCardContent}>
              <View style={styles.personAvatarContainer}>
                <Avatar 
                size={48} 
                name={person.name} 
                uri={imageLoadError ? null : person.image_uri}
                  onError={() => {
                    setImageLoadError(true);
                  }}
                />
              </View>
              
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{person.name}</Text>
                <Text style={styles.personPrayerStatus}>Last prayed for: <Text style={styles.personStatusHighlight}>Unknown</Text></Text> 
              </View>
              
              <TouchableOpacity
                style={styles.prayForButton}
                onPress={handlePrayPress}
                activeOpacity={0.7}
              >
                <Text style={styles.prayForButtonText}>pray</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </ReanimatedSwipeable> 
      </GestureHandlerRootView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 12,
    // Apply shadow here now that borderRadius/overflow are on swipeable container
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    borderRadius: 20, // Apply border radius to the outer container for shadow
  },
  // Style for the ReanimatedSwipeable component's main container
  swipeableContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  // Style for the container holding the immediate child (the TouchableOpacity)
  swipeableChildrenContainer: {
    // You might apply specific styles here if needed, otherwise defaults are usually fine
  },
  personCard: {
    // Remove borderRadius and overflow if handled by swipeableContainer
    // borderRadius: 20, 
    // overflow: 'hidden',
    // Add border radius back to the card itself to ensure corners are round during swipe
    borderRadius: 20, 
    overflow: 'hidden', // Keep overflow hidden here too, especially for the gradient
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle border for definition
  },
  personCardContent: {
    paddingVertical: 12, 
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent', // Ensure content background is transparent for gradient
  },
  personAvatarContainer: {
    marginRight: 14,
  },
  personInfo: {
    flex: 1,
    marginRight: 10, // Increase space before pray button
  },
  personName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 3,
  },
  personPrayerStatus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  personStatusHighlight: {
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  prayForButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: 34, 
  },
  prayForButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Styles for swipe action
  rightActionContainer: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  removeSwipeButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSwipeText: {
    color: '#E8E1EF',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4,
  },
}); 