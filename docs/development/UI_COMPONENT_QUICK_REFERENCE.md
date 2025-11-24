# UI Component Library Quick Reference

## 🚀 Quick Import

```tsx
import { 
  // Core
  Button, Card,
  // Forms
  Input, Checkbox, RadioGroup, Toggle, Select,
  // Feedback
  Modal, Alert, Toast, useToast,
  // Utils
  Badge, LinearProgress, CircularProgress, Tooltip, HelpTooltip,
  // Animations
  AnimatedBackground,
  // Theme
  useTheme
} from '@/components/ui-library';
```

## 🎯 Component Cheatsheet

### Button
```tsx
<Button variant="primary" icon="sparkles" loading={false}>
  Generate Prayer
</Button>
```
Variants: `primary`, `secondary`, `ghost`, `gradient`

### Card
```tsx
<Card variant="glass" pressable animated>
  <Content />
</Card>
```
Variants: `default`, `primary`, `secondary`, `ghost`, `glass`, `intention`, `prayer`

### Input
```tsx
<Input
  label="Intention"
  value={text}
  onChangeText={setText}
  error={error}
  icon="heart"
  charCount
/>
```

### Modal
```tsx
<Modal
  variant="bottomSheet" // or "fullScreen", "center"
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Add Intention"
>
  <Content />
</Modal>
```

### Toast
```tsx
const { showToast } = useToast();

showToast({
  message: 'Saved!',
  type: 'success', // or 'error', 'info', 'warning'
  duration: 3000
});
```

### Badge
```tsx
<Badge variant="primary" dot>3</Badge>
```
Variants: `default`, `primary`, `success`, `warning`, `error`, `info`

### Progress
```tsx
<LinearProgress value={75} showPercentage />
<CircularProgress value={50} size={100} />
```

## 🎨 Theme Colors

```tsx
const theme = useTheme();

// Primary colors
#7C71E0 - Purple accent
#5E55D1 - Gradient start
#9866C5 - Gradient end

// Backgrounds
rgba(255, 255, 255, 0.12) - Card glass
rgba(255, 255, 255, 0.2) - Borders
#141941 - Background primary

// Gradients
['#141941', '#3b2f7f', '#b44da6'] - Background
['#5E55D1', '#7C71E0', '#9866C5'] - Primary button
```

## 💡 Common Patterns

### Loading Button
```tsx
<Button loading={isLoading} onPress={handleSubmit}>
  Save
</Button>
```

### Form with Error
```tsx
<Input
  label="Name"
  value={name}
  onChangeText={setName}
  error={errors.name}
/>
```

### Confirmation Dialog
```tsx
<Alert
  visible={showConfirm}
  type="warning"
  title="Delete Intention?"
  message="This cannot be undone."
  actions={[
    { text: 'Cancel', onPress: () => {} },
    { text: 'Delete', onPress: handleDelete, variant: 'primary' }
  ]}
/>
```

### Glass Card
```tsx
<Card variant="glass" style={{ padding: 16 }}>
  <Text style={{ color: '#FFFFFF' }}>Content</Text>
</Card>
```

### Icon Button
```tsx
<Button variant="ghost" size="small" icon="heart-outline" />
```

## 📏 Sizes

- **Buttons**: `small` (44px), `medium` (60px), `large` (72px)
- **Inputs**: `small` (40px), `medium` (48px), `large` (56px)
- **Badges**: `small` (20px), `medium` (24px), `large` (28px)

## ⚡ Props Quick Reference

### Button Props
- `variant` - Visual style
- `size` - Size preset
- `loading` - Show spinner
- `disabled` - Disable interaction
- `icon` - Ionicon name
- `fullWidth` - Full container width

### Input Props
- `label` - Field label
- `placeholder` - Placeholder text
- `error` - Error message
- `helperText` - Help text
- `icon` - Leading icon
- `showClearButton` - Clear button
- `charCount` - Character counter

### Modal Props
- `variant` - Modal type
- `visible` - Show/hide
- `onClose` - Close handler
- `title` - Header title
- `footer` - Footer content
- `swipeToClose` - Enable swipe (bottom sheet)

### Toast Config
- `message` - Toast text
- `type` - Toast variant
- `duration` - Auto-dismiss time
- `action` - Optional action button
- `persistent` - Don't auto-dismiss 