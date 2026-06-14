# Move-Me Premium Design System

## Overview

Move-Me has been redesigned into a premium, enterprise-grade logistics marketplace that competes with Uber, Bolt, Airbnb, and Stripe in visual quality and user experience.

## Color System

### Primary Colors
- **Primary (Deep Navy)**: `#0F172A` - Brand primary, CTAs, active states
- **Secondary (Slate)**: `#1E293B` - Secondary actions, borders, disabled states
- **Accent (Premium Gold)**: `#F59E0B` - Highlights, important CTAs, achievements

### Semantic Colors
- **Success**: `#22C55E` - Completed jobs, confirmations
- **Warning**: `#EAB308` - Warnings, pending states
- **Error**: `#EF4444` - Destructive actions, cancellations
- **Info**: `#3B82F6` - Informational states

### Surfaces
- **Background**: `#F8FAFC` - App background
- **Surface**: `#FFFFFF` - Cards, panels
- **Surface Alt**: `#F1F5F9` - Alternative surfaces, subtle backgrounds
- **Overlay**: `rgba(15, 23, 42, 0.45)` - Modal overlays

## Typography

### Font Families
- **Primary**: SF Pro Display, SF Pro Text (macOS/iOS defaults)
- **Fallback**: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto
- **Monospace**: Monaco, Courier New

### Scale
- **Headings**: 48px (H1), 36px (H2), 30px (H3), 24px (H4)
- **Body**: 16px (normal), 14px (secondary), 12px (captions)
- **Font Weights**: 300 (light) → 800 (extrabold)

## Spacing System

8-point grid system for consistency:
- `spacing[1]` = 4px
- `spacing[2]` = 8px
- `spacing[4]` = 16px
- `spacing[6]` = 24px
- `spacing[8]` = 32px

## Shadows

Premium shadow system with depth:
- **sm**: Subtle shadows for small components
- **md**: Default shadows for cards
- **lg**: Elevated shadows for modals
- **xl/2xl**: Deep shadows for important overlays

## Border Radius

- **sm**: 6px - Small components
- **md**: 8px - Buttons, inputs
- **lg**: 12px - Cards, sheets (default)
- **xl**: 16px - Large modals
- **full**: 9999px - Pills, avatars

## Components

### Button
- **Variants**: primary, secondary, outline, ghost, danger, success
- **Sizes**: sm (36px), md (44px), lg (52px)
- **Features**: Loading states, disabled states, icons

### Card
- **Variants**: elevated (with shadow), outlined, filled
- **Padding**: Customizable via spacing scale
- **Interactive**: Optional onPress for touchable cards

### Badge
- **Variants**: default, success, warning, error, info
- **Sizes**: sm, md, lg
- **Usage**: Status indicators, tags, labels

## Implementation Files

```
src/constants/
  - colors.ts          (Color system)
  - typography.ts      (Font system)
  - spacing.ts         (Layout & sizing)

src/components/
  - Button.tsx         (Premium button component)
  - Card.tsx           (Reusable card component)
  - Badge.tsx          (Status badge component)
  - Input.tsx          (To be redesigned)
  - Avatar.tsx         (To be redesigned)
  - StarRating.tsx     (To be redesigned)

src/screens/
  - sender/SenderHomeScreen.tsx     (Redesigned with premium styling)
  - sender/PostJobScreen.tsx        (To be redesigned)
  - driver/DriverHomeScreen.tsx     (To be redesigned)
  - shared/*                        (All screens to be redesigned)
```

## Design Principles

1. **Premium & Trustworthy** - Clean, modern, high-quality appearance
2. **Minimal & Focused** - Remove clutter, highlight what matters
3. **Generous Spacing** - Breathing room between elements
4. **Subtle Shadows** - Depth without heaviness
5. **Smooth Interactions** - Thoughtful animations and transitions
6. **Accessibility** - WCAG compliant, readable text, clear CTAs
7. **Dark Mode Ready** - System supports dark mode
8. **Mobile-First** - Optimized for mobile, scalable to larger screens

## Key Improvements

### Visual
- Modern color palette replacing old SA flag colors
- Consistent typography with proper hierarchy
- Premium shadows and depth
- Better spacing and alignment
- Improved borders and subtle details

### Interactive
- Smooth button hover states
- Card elevation on interaction
- Loading states with spinners
- Disabled state clarity
- Validation feedback

### Layout
- Better use of whitespace
- Improved card hierarchy
- Responsive padding and gaps
- Consistent component sizing
- Better list item spacing

## Next Steps

1. ✅ Design system foundations (colors, typography, spacing)
2. ✅ Core components (Button, Card, Badge)
3. ⬜ Update remaining base components (Input, Avatar, etc.)
4. ⬜ Redesign all screens:
   - Sender dashboard
   - Driver dashboard
   - Booking flow
   - Profile screens
   - Payment/Wallet screens
5. ⬜ Add new features:
   - Photo-based quotes
   - Price estimator
   - Driver leaderboard
   - Business accounts
6. ⬜ Animations and micro-interactions
7. ⬜ Dark mode implementation
8. ⬜ Testing and refinement

## Using the Design System

### Import colors:
```ts
import { colors } from '../constants/colors';
```

### Import spacing:
```ts
import { spacing, sizes, radius, shadows } from '../constants/spacing';
```

### Using components:
```tsx
<Button label="Book a Move" variant="primary" size="lg" />
<Card variant="elevated" padding={4}>
  <Text>Premium card content</Text>
</Card>
<Badge label="In Transit" variant="info" />
```

## Responsive Design

The design system is mobile-first and scales to larger screens. All components use:
- Relative sizing based on spacing scale
- Flexible layouts with flexbox
- Touch-friendly hit targets (min 44px)
- Readable font sizes at all scales
