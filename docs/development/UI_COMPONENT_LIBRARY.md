# Personal Prayers UI Component Library

A comprehensive, TypeScript-first component library built with React Native, preserving the unique design language of the Personal Prayers app while providing reusable, accessible components.

## 🎨 Design Philosophy

The library maintains the app's signature design elements:
- **Dark Theme Optimized**: Deep purple/blue gradients (#141941, #3b2f7f, #b44da6)
- **Glass Morphism**: Translucent backgrounds with subtle borders
- **Purple Accent**: Consistent use of #7C71E0 throughout
- **Smooth Animations**: Spring-based animations using React Native Reanimated
- **Haptic Feedback**: Tactile responses on all interactions
- **Thoughtful Shadows**: Creating depth and hierarchy

## 📦 Installation

```bash
# The library is integrated into the app
# Import from the shared ui directory
import { Button, Card, Modal } from 'src/shared/ui';
```

## 🏗️ Architecture

```
src/shared/ui/
├── core/           # Essential components (Button, Card, Avatar)
├── forms/          # Form inputs and controls
├── layout/         # Layout components (Container, Grid)
├── feedback/       # User feedback (Modal, Toast, Alert)
├── animations/     # Animation components (GradientBackground)
└── index.ts        # Barrel exports for all components
```

## 🧩 Components

### Core Components

#### Button
A versatile button component with multiple variants and states.

```tsx
import { Button } from '@/components/ui-library';

// Primary gradient button
<Button 
  variant="primary"
  size="large"
  icon="sparkles"
  onPress={() => {}}
>
  Generate Prayer
</Button>

// Secondary with loading state
<Button 
  variant="secondary"
  loading={true}
  disabled={false}
>
  Save Changes
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'ghost' | 'gradient'
- `size`: 'small' | 'medium' | 'large'
- `loading`: boolean - Shows loading spinner
- `disabled`: boolean - Disables interaction
- `icon`: Ionicon name - Leading icon
- `iconPosition`: 'left' | 'right'
- `fullWidth`: boolean - Expands to container width

#### Card
Flexible container with glass morphism effects.

```tsx
import { Card } from '@/components/ui-library';

// Glass morphism card
<Card variant="glass" pressable onPress={() => {}}>
  <Text>Prayer for healing</Text>
</Card>

// Intention card with gradient
<Card 
  variant="intention"
  gradient={['#5E55D1', '#7C71E0']}
  animated
>
  <View>...</View>
</Card>
```

**Props:**
- `variant`: 'default' | 'primary' | 'secondary' | 'ghost' | 'glass' | 'intention' | 'prayer'
- `pressable`: boolean - Makes card interactive
- `gradient`: string[] - Custom gradient colors
- `animated`: boolean - Entrance animation
- `borderRadius`: number - Custom radius

### Form Components

#### Input
Glass morphism text input with validation states.

```tsx
import { Input } from '@/components/ui-library';

<Input
  label="Prayer Intention"
  placeholder="What's on your heart?"
  value={text}
  onChangeText={setText}
  error="Please enter your intention"
  maxLength={200}
  showCharacterCount
  icon="heart"
/>
```

**Props:**
- `variant`: 'default' | 'filled' | 'outlined'
- `size`: 'small' | 'medium' | 'large'
- `label`: string - Field label
- `error`: string - Error message
- `helperText`: string - Help text
- `icon`: string - Ionicon name
- `showClearButton`: boolean
- `showCharacterCount`: boolean

#### Checkbox
Animated checkbox with spring animations.

```tsx
import { Checkbox } from '@/components/ui-library';

<Checkbox
  checked={isSelected}
  onPress={() => setIsSelected(!isSelected)}
  label="Remember me in prayers"
  size="medium"
/>
```

#### RadioGroup
Two styles: chip-based and traditional radio buttons.

```tsx
import { RadioGroup } from '@/components/ui-library';

// Chip style
<RadioGroup
  variant="chip"
  options={[
    { label: 'Morning', value: 'morning', icon: 'sunny' },
    { label: 'Evening', value: 'evening', icon: 'moon' }
  ]}
  value={selected}
  onChange={setSelected}
  horizontal
/>

// Traditional radio
<RadioGroup
  variant="radio"
  options={prayerTopics}
  value={topic}
  onChange={setTopic}
/>
```

#### Toggle
Smooth sliding toggle switch.

```tsx
import { Toggle } from '@/components/ui-library';

<Toggle
  value={isEnabled}
  onValueChange={setIsEnabled}
  label="Daily reminders"
  activeColor="#7C71E0"
/>
```

#### Select
Custom modal picker (React Native has no native dropdown).

```tsx
import { Select } from '@/components/ui-library';

<Select
  label="Prayer Time"
  placeholder="Select a time"
  value={time}
  onValueChange={setTime}
  options={[
    { label: '6:00 AM', value: '06:00' },
    { label: '12:00 PM', value: '12:00' },
    { label: '6:00 PM', value: '18:00' }
  ]}
/>
```

### Feedback Components

#### Modal
Three variants for different use cases.

```tsx
import { Modal } from '@/components/ui-library';

// Bottom sheet (default)
<Modal
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Add Prayer Intention"
>
  <View>...</View>
</Modal>

// Full screen
<Modal
  variant="fullScreen"
  visible={showPrayer}
  onClose={onClose}
>
  <PrayerContent />
</Modal>

// Center dialog
<Modal
  variant="center"
  visible={showConfirm}
  onClose={onCancel}
  footer={
    <View style={styles.buttons}>
      <Button variant="ghost" onPress={onCancel}>Cancel</Button>
      <Button variant="primary" onPress={onConfirm}>Confirm</Button>
    </View>
  }
>
  <Text>Are you sure?</Text>
</Modal>
```

#### Alert
Type-based alerts built on Modal.

```tsx
import { Alert } from '@/components/ui-library';

<Alert
  visible={showAlert}
  type="success"
  title="Prayer Saved"
  message="Your prayer has been saved to your journal."
  onClose={() => setShowAlert(false)}
  actions={[
    { text: 'View Journal', onPress: goToJournal },
    { text: 'OK', onPress: () => setShowAlert(false), variant: 'primary' }
  ]}
/>
```

#### Toast
Non-blocking notifications with queue management.

```tsx
import { useToast } from '@/components/ui-library';

const { showToast } = useToast();

// Simple toast
showToast({
  message: 'Prayer intention added',
  type: 'success'
});

// With action
showToast({
  message: 'Connection lost',
  type: 'error',
  duration: 5000,
  action: {
    label: 'Retry',
    onPress: () => reconnect()
  }
});
```

### Animation Components

#### AnimatedBackground
Gradient background with subtle movement.

```tsx
import { AnimatedBackground } from '@/components/ui-library';

<AnimatedBackground
  colors={['#1A1B4B', '#2D1B69', '#4A4E83']}
  animate={true}
  duration={15000}
>
  <YourScreenContent />
</AnimatedBackground>
```

### Utility Components

#### Badge
Small status indicators.

```tsx
import { Badge } from '@/components/ui-library';

<Badge variant="success">Active</Badge>
<Badge variant="error" dot>3</Badge>
<Badge size="large" variant="primary">NEW</Badge>
```

#### Progress
Linear and circular progress indicators.

```tsx
import { LinearProgress, CircularProgress } from '@/components/ui-library';

// Linear with percentage
<LinearProgress 
  value={75} 
  showPercentage 
  progressColor="#7C71E0"
/>

// Circular with custom center
<CircularProgress
  value={progress}
  size={120}
  centerContent={
    <View>
      <Text>{progress}%</Text>
      <Text>Complete</Text>
    </View>
  }
/>
```

#### Tooltip
Press-triggered tooltips for React Native.

```tsx
import { Tooltip, HelpTooltip } from '@/components/ui-library';

// Help icon with tooltip
<HelpTooltip text="Tap to learn more about prayer intentions" />

// Custom tooltip
<Tooltip
  content="Long press for options"
  trigger="longPress"
  placement="top"
>
  <Card>...</Card>
</Tooltip>
```

## 🎨 Theme System

The library uses a centralized theme system that extends the base app theme:

```tsx
import { useTheme } from '@/components/ui-library';

const theme = useTheme();

// Access theme values
theme.colors.primary.default       // #7C71E0
theme.colors.gradients.primary     // ['#5E55D1', '#7C71E0', '#9866C5']
theme.colors.ui.cardBackground     // rgba(255, 255, 255, 0.12)
theme.spacing.md                   // 16
theme.borderRadius.lg              // 16
```

### Theme Structure
```typescript
{
  colors: {
    primary: { default, light, dark },
    background: { primary, secondary, tertiary },
    text: { primary, secondary, muted },
    ui: { cardBackground, cardBorder, inputBackground },
    gradients: { primary, background, button }
  },
  spacing: { xs, sm, md, lg, xl, xxl },
  borderRadius: { sm, md, lg, xl, full },
  typography: { sizes, weights, lineHeights },
  shadows: { small, medium, large },
  animations: { durations, springConfig }
}
```

## 🧪 Examples

The library includes comprehensive examples in the `examples/` directory:

- `button-card-examples.tsx` - All button and card variants
- `form-examples.tsx` - Form components and validation
- `modal-examples.tsx` - Modal, Alert, and Toast usage
- `utility-examples.tsx` - Badges, Progress, Tooltips, and AnimatedBackground

## ♿ Accessibility

All components include:
- Proper accessibility labels and hints
- Keyboard navigation support (where applicable in React Native)
- Screen reader compatibility
- High contrast support
- Touch target sizing (minimum 44x44 points)

## 🚀 Performance

- All components use `React.memo` where appropriate
- Animations use React Native Reanimated for 60fps performance
- Lazy loading for heavy components
- Optimized re-renders with proper prop comparison

## 📱 Platform Support

- iOS 13+
- Android 5.0+ (API 21+)
- Tested on phones and tablets
- Responsive design with safe area support

## 🔧 Best Practices

1. **Import what you need**: Use named imports for better tree-shaking
2. **Use the theme**: Always use theme values instead of hardcoded colors/sizes
3. **Haptic feedback**: Already built into interactive components
4. **Error handling**: Form components include built-in error states
5. **Loading states**: Use the `loading` prop on buttons and show progress indicators

## 🎯 Common Patterns

### Prayer Card with Actions
```tsx
<Card variant="prayer" animated>
  <View style={styles.header}>
    <Badge variant="info">Morning</Badge>
    <Text style={styles.time}>6:00 AM</Text>
  </View>
  <Text style={styles.prayerText}>{prayer.content}</Text>
  <View style={styles.actions}>
    <Button variant="ghost" size="small" icon="heart-outline">
      Like
    </Button>
    <Button variant="ghost" size="small" icon="share-outline">
      Share
    </Button>
  </View>
</Card>
```

### Form with Validation
```tsx
const [name, setName] = useState('');
const [error, setError] = useState('');

<Input
  label="Name"
  value={name}
  onChangeText={(text) => {
    setName(text);
    setError(text.length < 2 ? 'Name too short' : '');
  }}
  error={error}
  showClearButton
/>
```

### Loading State Pattern
```tsx
const [loading, setLoading] = useState(false);

<Button
  variant="primary"
  loading={loading}
  onPress={async () => {
    setLoading(true);
    await saveData();
    setLoading(false);
    showToast({ message: 'Saved!', type: 'success' });
  }}
>
  Save
</Button>
```

## 🤝 Contributing

When adding new components:
1. Follow the established patterns and naming conventions
2. Include TypeScript interfaces for all props
3. Add examples to the appropriate example file
4. Maintain the existing design language
5. Test on both iOS and Android
6. Update this documentation

---

Built with 💜 for the Personal Prayers app 