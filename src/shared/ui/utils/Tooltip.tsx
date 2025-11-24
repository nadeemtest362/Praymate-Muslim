import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';


export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /**
   * Content to show in tooltip
   */
  content: string | React.ReactNode;
  /**
   * The trigger element
   */
  children: React.ReactNode;
  /**
   * Placement of the tooltip
   */
  placement?: TooltipPlacement;
  /**
   * Custom trigger (if not using default help icon)
   */
  trigger?: 'press' | 'longPress';
  /**
   * Show help icon trigger
   */
  showHelpIcon?: boolean;
  /**
   * Help icon size
   */
  helpIconSize?: number;
  /**
   * Help icon color
   */
  helpIconColor?: string;
  /**
   * Tooltip style
   */
  tooltipStyle?: ViewStyle;
  /**
   * Text style
   */
  textStyle?: TextStyle;
  /**
   * Max width of tooltip
   */
  maxWidth?: number;
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  trigger = 'press',
  showHelpIcon = true,
  helpIconSize = 16,
  helpIconColor = 'rgba(255, 255, 255, 0.6)',
  tooltipStyle,
  textStyle,
  maxWidth = 250,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<View>(null);

  const handlePress = () => {
    if (trigger === 'press') {
      triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
        setPosition({ x: pageX + width / 2, y: pageY + height / 2 });
        setVisible(true);
      });
    }
  };

  const handleLongPress = () => {
    if (trigger === 'longPress') {
      triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
        setPosition({ x: pageX + width / 2, y: pageY + height / 2 });
        setVisible(true);
      });
    }
  };

  const renderTrigger = () => {
    if (showHelpIcon && !children) {
      return (
        <Ionicons 
          name="help-circle-outline" 
          size={helpIconSize} 
          color={helpIconColor}
        />
      );
    }
    return children;
  };

  const getTooltipPosition = () => {
    const offset = 10;
    
    switch (placement) {
      case 'top':
        return {
          bottom: position.y + offset,
          left: position.x - maxWidth / 2,
        };
      case 'bottom':
        return {
          top: position.y + offset,
          left: position.x - maxWidth / 2,
        };
      case 'left':
        return {
          top: position.y - 20,
          right: position.x + offset,
        };
      case 'right':
        return {
          top: position.y - 20,
          left: position.x + offset,
        };
    }
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {renderTrigger()}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable 
          style={styles.overlay} 
          onPress={() => setVisible(false)}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[
              styles.tooltip,
              getTooltipPosition(),
              { maxWidth },
              tooltipStyle,
            ]}
          >
            {typeof content === 'string' ? (
              <Text style={[styles.tooltipText, textStyle]}>{content}</Text>
            ) : (
              content
            )}
            
            {/* Arrow */}
            <View 
              style={[
                styles.arrow,
                placement === 'top' && styles.arrowBottom,
                placement === 'bottom' && styles.arrowTop,
                placement === 'left' && styles.arrowRight,
                placement === 'right' && styles.arrowLeft,
              ]} 
            />
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

// Simplified inline tooltip for help text
export interface HelpTooltipProps {
  /**
   * Help text to display
   */
  text: string;
  /**
   * Icon size
   */
  size?: number;
  /**
   * Icon color
   */
  color?: string;
  /**
   * Style
   */
  style?: ViewStyle;
}

export function HelpTooltip({
  text,
  size = 16,
  color = 'rgba(255, 255, 255, 0.6)',
  style,
}: HelpTooltipProps) {
  return (
    <Tooltip
      content={text}
      showHelpIcon
      helpIconSize={size}
      helpIconColor={color}
    >
      <View style={style} />
    </Tooltip>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  arrowTop: {
    top: -8,
    left: '50%',
    marginLeft: -8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(0, 0, 0, 0.9)',
  },
  arrowBottom: {
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.9)',
  },
  arrowLeft: {
    left: -8,
    top: '50%',
    marginTop: -8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(0, 0, 0, 0.9)',
  },
  arrowRight: {
    right: -8,
    top: '50%',
    marginTop: -8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(0, 0, 0, 0.9)',
  },
}); 