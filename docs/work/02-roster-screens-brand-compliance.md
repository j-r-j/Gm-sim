# Brand Compliance: Roster/Player Screens

## Scope
This work item covers brand standards compliance for:
- `src/screens/RosterScreen.tsx`
- `src/screens/DepthChartScreen.tsx`
- `src/screens/PlayerProfileScreen.tsx`

**Note:** PlayerDetailScreen, PlayerComparisonScreen, RosterCutScreen, and PracticeSquadScreen do not exist in the codebase.

## Brand Standards Reference
All values must use tokens from `src/styles/theme.ts`:

| Category | Token | Value |
|----------|-------|-------|
| **Spacing** | `spacing.xxs` | `2` |
| | `spacing.xs` | `4` |
| | `spacing.sm` | `8` |
| | `spacing.md` | `12` |
| | `spacing.lg` | `16` |
| | `spacing.xl` | `24` |
| **Border Radius** | `borderRadius.sm` | `4` |
| | `borderRadius.md` | `8` |
| | `borderRadius.lg` | `12` |
| | `borderRadius.full` | `9999` |

---

## Violations Found

### RosterScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 697 | Hardcoded rgba color | `rgba(0,0,0,0.5)` | Add `colors.overlay` or `colors.modalBackdrop` to theme |

### DepthChartScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 317 | Color + opacity concatenation | `colors.primary + '20'` | Add `colors.primaryFaded` to theme |
| 428 | Color + opacity concatenation | `colors.primary + '20'` | Use same `colors.primaryFaded` |
| 470 | Color + opacity concatenation | `colors.info + '20'` | Add `colors.infoFaded` to theme |
| 457-459 | Hardcoded dimensions | `width: 10, height: 10, borderRadius: 5` | Use `spacing.sm` for width/height, `borderRadius.sm` |

### PlayerProfileScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 384 | Color + opacity concatenation | `colors.success + '20'` | Add `colors.successFaded` to theme |
| 386-387 | Color + opacity concatenation | `colors.warning + '20'`, `colors.textSecondary + '20'` | Add faded variants to theme |
| 589 | Color + opacity concatenation | `colors.textOnPrimary + '40'` | Add opacity variant to theme |
| 743 | Color + opacity concatenation | `colors.primary + '10'` | Add `colors.primaryVeryFaded` to theme |
| 831 | Color + opacity concatenation | `colors.info + '20'` | Use `colors.infoFaded` |
| 914 | Color + opacity concatenation | `colors.warning + '20'` | Use `colors.warningFaded` |

---

## Implementation Tasks

- [ ] **Theme Updates (theme.ts)**
  - [ ] Add `colors.overlay: 'rgba(0,0,0,0.5)'`
  - [ ] Add `colors.primaryFaded: 'rgba(26, 54, 93, 0.12)'` (primary + 20%)
  - [ ] Add `colors.primaryVeryFaded: 'rgba(26, 54, 93, 0.06)'` (primary + 10%)
  - [ ] Add `colors.infoFaded: 'rgba(49, 130, 206, 0.12)'`
  - [ ] Add `colors.successFaded: 'rgba(56, 161, 105, 0.12)'`
  - [ ] Add `colors.warningFaded: 'rgba(214, 158, 46, 0.12)'`
  - [ ] Add `colors.errorFaded: 'rgba(229, 62, 62, 0.12)'`

- [ ] **RosterScreen.tsx**
  - [ ] Replace `rgba(0,0,0,0.5)` with `colors.overlay`

- [ ] **DepthChartScreen.tsx**
  - [ ] Replace `colors.primary + '20'` with `colors.primaryFaded` (lines 317, 428)
  - [ ] Replace `colors.info + '20'` with `colors.infoFaded` (line 470)
  - [ ] Replace hardcoded `10` with `spacing.sm` (lines 457-458)
  - [ ] Replace `borderRadius: 5` with `borderRadius.sm` (line 459)

- [ ] **PlayerProfileScreen.tsx**
  - [ ] Replace all color opacity concatenations with theme colors

---

## Completion Gates

### Pre-merge Checklist
- [ ] All `colors.X + 'YY'` patterns replaced with theme colors
- [ ] All hardcoded rgba colors replaced with `colors.X` tokens
- [ ] All hardcoded border radius values use `borderRadius.X` tokens
- [ ] New theme colors added follow naming convention (colorFaded, colorVeryFaded)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Visual regression check: screens render correctly with new colors

### Testing Commands
```bash
npm run typecheck
npm run lint
npm test -- --testPathPattern="RosterScreen|DepthChart|PlayerProfile"
```

---

## Notes
- Consider creating a utility function `withOpacity(color, opacity)` if the pattern is widespread
- Faded colors should maintain the same hue but reduce opacity to 0.06-0.20 range
