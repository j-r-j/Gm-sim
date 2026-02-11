# Brand Compliance: Offseason Screens

## Scope
This work item covers brand standards compliance for:
- `src/screens/OffseasonScreen.tsx`
- `src/screens/TrainingCampScreen.tsx`
- `src/screens/PreseasonScreen.tsx`
- `src/screens/OTAsScreen.tsx`
- `src/screens/FinalCutsScreen.tsx`
- `src/screens/CareerLegacyScreen.tsx`
- `src/screens/CareerSummaryScreen.tsx`
- `src/screens/SeasonRecapScreen.tsx`

**Total Violations: 66**

## Brand Standards Reference
| Category | Token | Value |
|----------|-------|-------|
| **Colors** | `colors.tierElite` | `#FFD700` (gold) |
| **Spacing** | `spacing.xxs` | `2` |
| | `spacing.xxxl` | `48` |
| **Font Size** | `fontSize.display` | `36` |
| **Border Radius** | `borderRadius.lg` | `12` |

---

## Violations Summary by Category

### Hardcoded Spacing/Dimensions (28 instances)
Scattered across all files - values like `2`, `4`, `28`, `32`, `48` should use spacing tokens.

### Hardcoded Hex Colors (12 instances)
Primarily `#FFD700` (gold) which should use `colors.tierElite`.

### Color + Opacity Concatenation (8+ instances per file)
Pattern: `colors.X + '20'` should use predefined faded color variants.

### Hardcoded Line Heights/Letter Spacing (5 instances)
Non-standard values that should use theme text styles.

### Hardcoded Font Sizes (2 instances)
`48px` font size should use `fontSize.display` or `fontSize.xxxl`.

### Hardcoded Border Radius (4 instances)
Non-standard values that should use `borderRadius.X` tokens.

---

## Violations by File

### OffseasonScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| 531 | `colors.primary + '10'` | Use theme color |
| 533 | `colors.primary + '30'` | Use theme color |
| 540 | `colors.primary + '20'` | Use theme color |
| 600 | `colors.success + '15'` | Use theme color |
| 602 | `colors.success + '30'` | Use theme color |

### TrainingCampScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| 201 | `colors.success + '20'` | Use theme color |
| 214 | `colors.error + '20'` | Use theme color |
| 227 | `colors.warning + '20'` | Use theme color |
| 729 | `colors.success + '10'` | Use theme color |
| 735 | `colors.primary + '20'` | Use theme color |

### OTAsScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| 163 | `colors.success + '20'` | Use theme color |
| 233 | `colors.warning + '20'` | Use theme color |
| 415-418 | Multiple color + opacity | Use theme colors |
| 693 | `colors.success + '40'` | Use theme color |
| 701 | `colors.warning + '40'` | Use theme color |

### FinalCutsScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| 199, 204, 209 | Color + opacity tags | Use theme colors |
| 293 | Conditional color + opacity | Use theme colors |
| 590 | `colors.error + '20'` | Use theme color |
| 609 | `colors.primary + '10'` | Use theme color |
| 698 | `colors.error + '20'` | Use theme color |
| 777 | `colors.primary + '20'` | Use theme color |

### CareerSummaryScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| 217 | `colors.error + '10'` | Use theme color |
| 219 | `colors.error + '30'` | Use theme color |
| 301 | `colors.success + '20'` | Use theme color |
| 306 | `colors.success + '40'` | Use theme color |

### SeasonRecapScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| 124 | Conditional color + opacity | Use theme colors |
| 142 | `colors.primary + '20'` | Use theme color |
| 386 | `colors.primary + '15'` | Use theme color |
| 470 | `colors.primary + '08'` | Use theme color |

---

## Implementation Tasks

- [ ] **Theme Updates (theme.ts)**
  - [ ] Add all missing faded color variants (08%, 10%, 15%, 20%, 30%, 40%)
  - [ ] Consider a systematic naming convention:
    - `colors.XVeryFaded` = 08-10%
    - `colors.XFaded` = 15-20%
    - `colors.XMediumFaded` = 30-40%

- [ ] **All Offseason Screens**
  - [ ] Replace all color + opacity concatenations
  - [ ] Replace hardcoded spacing with tokens
  - [ ] Replace hardcoded borderRadius with tokens
  - [ ] Replace hardcoded fontSize with tokens

---

## Completion Gates

### Pre-merge Checklist
- [ ] All `colors.X + 'YY'` patterns (66 total) replaced with theme colors
- [ ] All hardcoded hex colors replaced
- [ ] All hardcoded spacing replaced with `spacing.X` tokens
- [ ] All hardcoded borderRadius replaced with `borderRadius.X` tokens
- [ ] All hardcoded fontSize replaced with `fontSize.X` tokens
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Visual check: all offseason screens render correctly

### Testing Commands
```bash
npm run typecheck
npm run lint
npm test -- --testPathPattern="Offseason|TrainingCamp|Preseason|OTAs|FinalCuts|CareerLegacy|CareerSummary|SeasonRecap"
```

---

## Notes
- This is the largest work item with 66 violations
- Consider splitting into multiple PRs:
  1. Theme updates (add all faded colors)
  2. OffseasonScreen + SeasonRecapScreen fixes
  3. TrainingCampScreen + OTAsScreen + PreseasonScreen fixes
  4. FinalCutsScreen + CareerSummaryScreen + CareerLegacyScreen fixes
- The color + opacity pattern is pervasive - fixing theme.ts first will enable all other fixes
