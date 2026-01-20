# Brand Compliance: Navigation/Dashboard Screens

## Scope
This work item covers brand standards compliance for the following screens:
- `src/screens/StartScreen.tsx`
- `src/screens/TeamSelectionScreen.tsx`
- `src/screens/GMDashboardScreen.tsx`
- `src/screens/SettingsScreen.tsx`

## Brand Standards Reference
All values must use tokens from `src/styles/theme.ts`:

| Category | Token | Value |
|----------|-------|-------|
| **Colors** | `colors.primary` | `#1a365d` |
| | `colors.secondary` | `#c05621` |
| | `colors.background` | `#f7fafc` |
| | `colors.surface` | `#ffffff` |
| **Spacing** | `spacing.xxs` | `2` |
| | `spacing.xs` | `4` |
| | `spacing.sm` | `8` |
| | `spacing.md` | `12` |
| | `spacing.lg` | `16` |
| | `spacing.xl` | `24` |
| | `spacing.xxl` | `32` |
| | `spacing.xxxl` | `48` |
| **Font Size** | `fontSize.xs` | `10` |
| | `fontSize.sm` | `12` |
| | `fontSize.md` | `14` |
| | `fontSize.lg` | `16` |
| | `fontSize.xl` | `18` |
| | `fontSize.xxl` | `22` |
| | `fontSize.xxxl` | `28` |
| | `fontSize.display` | `36` |
| **Border Radius** | `borderRadius.sm` | `4` |
| | `borderRadius.md` | `8` |
| | `borderRadius.lg` | `12` |
| | `borderRadius.xl` | `16` |
| | `borderRadius.full` | `9999` |

---

## Violations Found

### StartScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| ~style | Hardcoded `borderRadius: 50` | `50` | Use `borderRadius.full` (9999) for circular elements |
| ~style | Hardcoded rgba color | `rgba(...)` | Add color to theme or use existing theme color |

### TeamSelectionScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| ~style | Hex opacity manipulation | `colors.primary + '10'` | Create dedicated color with opacity in theme (e.g., `colors.primaryFaded`) |
| ~style | Non-standard borderRadius | `14` | Use `borderRadius.lg` (12) or `borderRadius.xl` (16) |

### GMDashboardScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| ~style | Hardcoded hex color | `#FF6B00` | Add to theme colors if needed (seems like an accent orange) |
| ~style | Multiple hex opacity manipulations | `colors.X + '20'` | Create dedicated semi-transparent colors in theme |

### SettingsScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| ~style | Hardcoded spacing | `marginTop: 2` | Use `spacing.xxs` |

---

## Implementation Tasks

- [ ] **StartScreen.tsx**
  - [ ] Replace `borderRadius: 50` with `borderRadius.full`
  - [ ] Replace hardcoded rgba colors with theme colors

- [ ] **TeamSelectionScreen.tsx**
  - [ ] Add `colors.primaryFaded` (or similar) to theme.ts for semi-transparent primary
  - [ ] Replace `colors.primary + '10'` with new theme color
  - [ ] Replace `borderRadius: 14` with `borderRadius.lg` or `borderRadius.xl`

- [ ] **GMDashboardScreen.tsx**
  - [ ] Add `#FF6B00` to theme.ts if it's a valid brand color (or use existing secondary)
  - [ ] Add semi-transparent color variants to theme.ts
  - [ ] Replace all `colors.X + '...'` patterns with theme colors

- [ ] **SettingsScreen.tsx**
  - [ ] Replace `marginTop: 2` with `spacing.xxs`

---

## Completion Gates

### Pre-merge Checklist
- [ ] All hardcoded hex colors replaced with `colors.X` tokens
- [ ] All hardcoded spacing values replaced with `spacing.X` tokens
- [ ] All hardcoded font sizes replaced with `fontSize.X` tokens
- [ ] All hardcoded border radius values replaced with `borderRadius.X` tokens
- [ ] No string concatenation for color opacity (e.g., `colors.X + '20'`)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Visual regression check: screens render correctly

### Testing Commands
```bash
npm run typecheck
npm run lint
npm test -- --testPathPattern="StartScreen|TeamSelection|GMDashboard|Settings"
```

---

## Notes
- If a color truly needs opacity variants, add them to theme.ts with descriptive names
- Consider adding a helper function for semi-transparent colors if the pattern is common
- Maintain consistency with existing theme structure
