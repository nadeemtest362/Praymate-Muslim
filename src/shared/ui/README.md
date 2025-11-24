# Personal Prayers UI Component Library

A comprehensive TypeScript-first component library for React Native, preserving the unique design language of the Personal Prayers app.

## 📚 Documentation

- **[Comprehensive Documentation](../../../docs/UI_COMPONENT_LIBRARY.md)** - Full component reference with examples
- **[Quick Reference Guide](../../../docs/UI_COMPONENT_QUICK_REFERENCE.md)** - Cheatsheet for common patterns

## 🚀 Quick Start

```tsx
import { Button, Card, Modal, useToast } from '@/components/ui-library';

// Primary button with icon
<Button variant="primary" icon="sparkles">
  Generate Prayer
</Button>

// Glass morphism card
<Card variant="glass" pressable>
  <Text>Prayer content</Text>
</Card>

// Show toast notification
const { showToast } = useToast();
showToast({ message: 'Saved!', type: 'success' });
```

## 🎨 Design Principles

- **Dark Theme First**: Deep purple/blue gradients
- **Glass Morphism**: Translucent surfaces with subtle borders
- **Consistent Animations**: Spring-based with React Native Reanimated
- **Haptic Feedback**: Tactile responses on all interactions
- **TypeScript**: Full type safety and IntelliSense support

## 📦 Components

### Core
- `Button` - Multiple variants with loading states
- `Card` - Flexible containers with glass effects

### Forms
- `Input` - Text input with validation
- `Checkbox` - Animated checkbox
- `RadioGroup` - Chip and traditional styles
- `Toggle` - Smooth toggle switch
- `Select` - Modal picker for React Native

### Feedback
- `Modal` - Bottom sheet, full screen, center variants
- `Alert` - Type-based alert dialogs
- `Toast` - Non-blocking notifications

### Utils
- `Badge` - Status indicators
- `Progress` - Linear and circular progress
- `Tooltip` - Press-triggered tooltips

### Animations
- `AnimatedBackground` - Gradient with subtle movement

## 🧪 Examples

Run the example screens to see all components:

```tsx
// View all components in action
import { ButtonCardExamples } from './examples/button-card-examples';
import { FormExamples } from './examples/form-examples';
import { ModalExamples } from './examples/modal-examples';
import { UtilityExamples } from './examples/utility-examples';
```

## 🎨 Theme Integration

```tsx
import { useTheme } from '@/components/ui-library';

const theme = useTheme();
// Access consistent colors, spacing, etc.
```

---

Built with 💜 for the Personal Prayers app 