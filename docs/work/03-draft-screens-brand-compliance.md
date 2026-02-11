# Brand Compliance: Draft Screens

## Scope
This work item covers brand standards compliance for:
- `src/screens/SinglePlayerCardScreen.tsx`
- `src/screens/DraftBoardScreen.tsx`
- `src/screens/DraftRoomScreen.tsx`
- `src/screens/ScoutingReportsScreen.tsx`

**Total Violations: 34**

## Brand Standards Reference
| Category | Token | Value |
|----------|-------|-------|
| **Colors** | `colors.tierElite` | `#FFD700` (gold) |
| | `colors.success` | `#38a169` |
| **Spacing** | `spacing.xxs` | `2` |
| | `spacing.xl` | `24` |
| | `spacing.xxl` | `32` |
| **Border Radius** | `borderRadius.lg` | `12` |

---

## Violations Found

### SinglePlayerCardScreen.tsx (18 violations)

**Hardcoded Hex Colors:**
| Line | Current | Fix |
|------|---------|-----|
| 123 | `'#FFD700'` | Use `colors.tierElite` |
| 125 | `'#4CAF50'` | Use `colors.success` or add to theme |

**Color + Opacity Concatenation:**
| Line | Current | Fix |
|------|---------|-----|
| 208 | `colors.success + '20'`, `colors.primary + '20'` | Use faded theme colors |
| 437 | `colors.success + '20'` | Use `colors.successFaded` |
| 439 | `colors.error + '20'` | Use `colors.errorFaded` |
| 440 | `colors.textSecondary + '20'` | Use `colors.textSecondaryFaded` |
| 577 | `getTierColor(tier) + '20'` | Create faded tier colors |
| 797 | `colors.textOnPrimary + '20'` | Add opacity variant |
| 842 | `colors.primary + '20'` | Use `colors.primaryFaded` |
| 1132 | `colors.primary + '15'` | Use `colors.primaryVeryFaded` |

**Hardcoded Numbers:**
| Line | Current | Fix |
|------|---------|-----|
| 879 | `height: 32` | Use `spacing.xxl` |
| 1069 | `marginBottom: 2` | Use `spacing.xxs` |
| 1169 | `marginBottom: 2` | Use `spacing.xxs` |
| 1175 | `marginBottom: 2` | Use `spacing.xxs` |
| 1209 | `width: 24` | Use `spacing.xl` |
| 1210 | `height: 24` | Use `spacing.xl` |
| 1211 | `borderRadius: 12` | Use `borderRadius.lg` |

### DraftBoardScreen.tsx (4 violations)

| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 439 | Hardcoded width | `width: 50` | Use spacing tokens |
| 499 | Color + opacity | `colors.secondary + '20'` | Use `colors.secondaryFaded` |
| 519 | Color + opacity | `colors.primary + '20'` | Use `colors.primaryFaded` |
| 535 | Color + opacity | `colors.info + '20'` | Use `colors.infoFaded` |

### DraftRoomScreen.tsx (2 violations)

| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 529 | Color + opacity | `colors.secondary + '20'` | Use `colors.secondaryFaded` |
| 582 | Color + opacity | `colors.primary + '10'` | Use `colors.primaryVeryFaded` |

### ScoutingReportsScreen.tsx (10 violations)

**Color + Opacity:**
| Line | Current | Fix |
|------|---------|-----|
| 65 | `colors.primary + '40'` | Add `colors.primaryMediumFaded` |
| 83 | `colors.primary + '20'` | Use `colors.primaryFaded` |
| 84 | `colors.textSecondary + '20'` | Use `colors.textSecondaryFaded` |
| 554 | `colors.primary + '20'` | Use `colors.primaryFaded` |
| 565 | `colors.success + '20'` | Use `colors.successFaded` |
| 576 | `colors.textSecondary + '20'` | Use `colors.textSecondaryFaded` |

**Hardcoded Numbers:**
| Line | Current | Fix |
|------|---------|-----|
| 364 | `width: 60` | Use spacing tokens or create constant |
| 463 | `height: 1` | Use borderWidth or divider constant |
| 495 | `marginBottom: 2` | Use `spacing.xxs` |
| 511 | `marginBottom: 2` | Use `spacing.xxs` |

---

## Implementation Tasks

- [ ] **Theme Updates (theme.ts)**
  - [ ] Add `colors.secondaryFaded` for secondary + opacity variants
  - [ ] Add `colors.primaryMediumFaded` for 40% opacity
  - [ ] Add `colors.textSecondaryFaded`
  - [ ] Consider adding tier color faded variants

- [ ] **SinglePlayerCardScreen.tsx**
  - [ ] Replace `#FFD700` with `colors.tierElite`
  - [ ] Replace `#4CAF50` with `colors.success`
  - [ ] Replace all 8 color + opacity concatenations
  - [ ] Replace all 8 hardcoded spacing/sizing values

- [ ] **DraftBoardScreen.tsx**
  - [ ] Replace 3 color + opacity concatenations
  - [ ] Replace hardcoded width

- [ ] **DraftRoomScreen.tsx**
  - [ ] Replace 2 color + opacity concatenations

- [ ] **ScoutingReportsScreen.tsx**
  - [ ] Replace 6 color + opacity concatenations
  - [ ] Replace 4 hardcoded spacing values

---

## Completion Gates

### Pre-merge Checklist
- [ ] All hardcoded hex colors (`#XXXXXX`) replaced with `colors.X` tokens
- [ ] All `colors.X + 'YY'` patterns replaced with theme colors
- [ ] All hardcoded spacing replaced with `spacing.X` tokens
- [ ] All hardcoded borderRadius replaced with `borderRadius.X` tokens
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Visual check: player cards display correctly

### Testing Commands
```bash
npm run typecheck
npm run lint
npm test -- --testPathPattern="SinglePlayerCard|DraftBoard|DraftRoom|ScoutingReports"
```

---

## Notes
- SinglePlayerCardScreen has the most violations (18) - prioritize this file
- The `getTierColor(tier) + '20'` pattern may need a helper function approach
