# Responsive Design Implementation Guide

## Quick Reference

### 1. Import the Hook
```typescript
import useResponsive from '../../../hooks/useResponsive';
```

### 2. Use in Component
```typescript
function MyScreen() {
  const R = useResponsive();
  const styles = useMemo(() => createStyles(R), [R.width, R.height]);
  // ... rest of component
}
```

### 3. Convert Styles Function
```typescript
const createStyles = (R: ReturnType<typeof useResponsive>) => StyleSheet.create({
  // Replace fixed values with responsive ones
});
```

## Conversion Rules

### Font Sizes
```typescript
// Before
fontSize: 18

// After  
fontSize: R.font(18)
```

### Horizontal Spacing (padding, margin, width)
```typescript
// Before
paddingHorizontal: 24
marginLeft: 16
width: 200

// After
paddingHorizontal: R.w(6)  // 6% of screen width
marginLeft: R.w(4)         // 4% of screen width  
width: R.w(50)             // 50% of screen width
```

### Vertical Spacing (padding, margin, height)
```typescript
// Before
paddingTop: 40
marginBottom: 20
minHeight: 76

// After
paddingTop: R.h(5)      // 5% of screen height
marginBottom: R.h(2.5)  // 2.5% of screen height
minHeight: R.h(8)       // 8% of screen height
```

### Safe Areas
```typescript
// Before
paddingTop: insets.top + 20

// After
paddingTop: R.insets.top + R.h(2.5)
```

## Text Scaling Best Practices

### Proper Line Height
```typescript
// ❌ Wrong - Line height shouldn't scale the same as font size
text: {
  fontSize: R.font(24),
  lineHeight: R.font(32), // This can cause cramped text
}

// ✅ Correct - Use R.lineHeight() for proper spacing
text: {
  fontSize: R.font(24),
  lineHeight: R.lineHeight(24), // Automatically calculates proper line height
}
```

### Handling Accessibility Text Scaling
```typescript
// For critical UI text that shouldn't overflow
<Text 
  style={styles.title}
  adjustsFontSizeToFit
  numberOfLines={1}
  minimumFontScale={0.7}
>
  {titleText}
</Text>

// For decorative text where scaling might break layout
<Text 
  style={styles.decorativeText}
  allowFontScaling={false} // Use sparingly - affects accessibility
>
  {decorativeText}
</Text>
```

### Common Text Scaling Issues & Solutions

1. **Text Getting Cut Off**
   - Use `adjustsFontSizeToFit` with `numberOfLines`
   - Set reasonable `minimumFontScale` (0.7-0.8)
   - Ensure container has proper padding

2. **Double Scaling with Accessibility**
   - The responsive hook now accounts for system font scaling
   - Avoid manual adjustments for `fontScale`
   - Let the hook handle all scaling

3. **Cramped Line Height**
   - Always use `R.lineHeight()` instead of `R.font()` for line height
   - Line height scales less aggressively than font size

## Common Patterns

### Responsive Container Padding
```typescript
container: {
  paddingHorizontal: R.w(6),  // ~24px on iPhone 14 Pro
  paddingVertical: R.h(3),    // ~24px on standard height
}
```

### Responsive Cards/Buttons
```typescript
card: {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: R.w(5),       // ~20px on standard width
  paddingVertical: R.h(2),    // ~16px
  paddingHorizontal: R.w(6),  // ~24px
  marginBottom: R.h(2),       // ~16px
  minHeight: R.h(8),          // ~64px
}
```

### Responsive Text Hierarchy
```typescript
title: {
  fontSize: R.font(36),       // Scales with screen
  lineHeight: R.lineHeight(36), // Proper line height
},
subtitle: {
  fontSize: R.font(24),
  lineHeight: R.lineHeight(24),
},
body: {
  fontSize: R.font(16),
  lineHeight: R.lineHeight(16),
}
```

## Percentage Guidelines

Based on iPhone 14 Pro (393x852):
- `R.w(1)` ≈ 4px width
- `R.h(1)` ≈ 8.5px height

Common conversions:
- 16px → `R.w(4)` or `R.h(2)`
- 24px → `R.w(6)` or `R.h(3)`
- 32px → `R.w(8)` or `R.h(4)`
- 40px → `R.w(10)` or `R.h(5)`

## Testing

Always test on:
1. iPhone SE (375x667) - Smallest
2. iPhone 14 Pro (393x852) - Standard
3. iPhone 16 Pro Max (430x932) - Largest
4. iPad (if supporting tablets)

**Also test with:**
- System text size set to largest
- Bold text enabled
- Display zoom enabled

## Migration Checklist

- [ ] Import useResponsive hook
- [ ] Convert StyleSheet.create to createStyles function
- [ ] Replace all fontSize with R.font()
- [ ] Replace horizontal spacing with R.w()
- [ ] Replace vertical spacing with R.h()
- [ ] Update safe area padding to use R.insets
- [ ] Remove all breakpoint checks (isSmallScreen, etc.)
- [ ] Remove duplicate style variants
- [ ] Use R.lineHeight() for all line heights
- [ ] Add adjustsFontSizeToFit for critical text
- [ ] Test on multiple screen sizes 
- [ ] Test with accessibility settings enabled

## Universal Onboarding Styles

We've created universal responsive styles for onboarding screens in `src/constants/onboardingStyles.ts`:

```typescript
import { createOnboardingOptionStyles, createOnboardingQuestionStyles } from '../constants/onboardingStyles';

// In your component
const R = useResponsive();
const optionStyles = useMemo(() => createOnboardingOptionStyles(R), [R.width, R.height]);
const questionStyles = useMemo(() => createOnboardingQuestionStyles(R), [R.width, R.height]);
```

## iPhone SE 3rd Gen Optimizations

To prevent bottom options from being cut off on smaller screens:

1. **Bottom Safe Area Padding**: Added `paddingBottom: R.insets.bottom + R.h(3)` to content containers
2. **Reduced Option Heights**: 
   - `minHeight: R.h(7)` (down from 8%)
   - `paddingVertical: R.h(1.8)` (down from 2.2%)
3. **Smaller Font Sizes**:
   - Option text: `R.font(16)` (down from 17)
   - Option emoji: `R.font(28)` (down from 32)
4. **Less Aggressive Font Scaling**: Added `isSmallPhone` detection that reduces font scaling by 30% on devices < 700px height

## Content Sizing & Layout Troubleshooting

When content doesn't fit on screen (button off-screen, text overlap), follow this order:

### 1. Reduce Content Sizes First
```typescript
// ❌ Don't: Fight with complex layouts
// ✅ Do: Make content smaller
image: {
  width: R.w(50),  // Instead of R.w(75)
  height: R.w(50),
}
emoji: {
  fontSize: R.font(60), // Instead of R.font(80)
}
```

### 2. Reduce Spacing Proportionally
```typescript
// Reduce margins and padding
imageContainer: {
  marginBottom: R.h(2), // Instead of R.h(3)
}
titleWrapper: {
  marginBottom: R.h(2), // Instead of R.h(5)
}
```

### 3. Use Simple Layout Patterns
```typescript
// ✅ Do: Group content, use space-between
<View style={styles.container}>
  <View style={styles.contentGroup}>
    {/* All your content together */}
  </View>
  <TouchableOpacity style={styles.button}>
    {/* Button */}
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentGroup: {
    alignItems: 'center',
    width: '100%',
  }
});
```

### 4. Avoid Layout Conflicts
```typescript
// ❌ Don't: Mix conflicting approaches
justifyContent: 'space-between' // AND flex: 1 spacers

// ✅ Do: Choose one approach
justifyContent: 'space-between' // OR flex spacers, not both
```

### Common Mistakes to Avoid
- Using `flex: 1` spacers with `justifyContent: 'space-between'`
- Fighting layout issues with complex nested containers
- Adding manual device-specific padding/margins
- Making images too large (>60% screen width)

### Content Fit Priority
1. **Image size** - Most impactful, reduce first
2. **Spacing/margins** - Reduce proportionally  
3. **Font sizes** - Last resort, already handled by useResponsive
4. **Layout structure** - Keep simple, avoid nesting

## Keyboard Handling Pattern

For screens with text input, use this professional pattern:

```typescript
<View style={styles.container}>
  <StatusBar />
  <Background />
  
  <KeyboardAvoidingView 
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
  >
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* All content including TextInput and buttons */}
    </ScrollView>
  </KeyboardAvoidingView>
</View>
```

**Key Points:**
- No keyboard state detection or UI hiding
- ScrollView with `flexGrow: 1` (not `flex: 1`)
- Simple, clean, works on all devices
- See [keyboard-pattern-best-practice.mdc](mdc:.cursor/rules/keyboard-pattern-best-practice.mdc) for details

## Testing

Always test on:
1. iPhone SE (375x667) - Smallest 