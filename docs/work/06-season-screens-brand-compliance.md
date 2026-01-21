# Brand Compliance: Season Screens

## Scope
This work item covers brand standards compliance for:
- `src/screens/ScheduleScreen.tsx`
- `src/screens/StandingsScreen.tsx`
- `src/screens/PlayoffBracketScreen.tsx`
- `src/screens/GamecastScreen.tsx`

**Note:** TeamScheduleScreen and GameResultScreen do not exist in the codebase.

**Total Violations: 26**

## Brand Standards Reference
| Category | Token | Value |
|----------|-------|-------|
| **Spacing** | `spacing.xl` | `24` |
| | `spacing.xxl` | `32` |
| | `spacing.xxxl` | `48` |
| **Border Radius** | `borderRadius.lg` | `12` |

---

## Violations Found

### ScheduleScreen.tsx (4 violations)

| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 280 | Hardcoded width | `width: 60` | Create `COLUMN_WIDTH` constant or use spacing |
| 337 | Hardcoded width | `width: 60` | Same constant |
| 360 | Hardcoded width | `width: 24` | Use `spacing.xl` |
| 374 | Hardcoded width | `width: 70` | Create constant for result column |

### StandingsScreen.tsx (12+ violations)

| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 515 | Hardcoded width | `width: 60` | Create column width constant |
| 580 | Hardcoded width | `width: 24` | Use `spacing.xl` |
| 592 | Hardcoded width | `width: 40` | Create constant |
| 599 | Hardcoded width | `width: 32` | Use `spacing.xxl` |
| 621 | Hardcoded width | `width: 24` | Use `spacing.xl` |
| 631 | Hardcoded width | `width: 36` | Create constant |
| 642 | Hardcoded width | `width: 40` | Create constant |
| 648 | Hardcoded width | `width: 32` | Use `spacing.xxl` |
| 695-697 | Hardcoded dimensions | `width: 24, height: 24, borderRadius: 12` | Use `spacing.xl` and `borderRadius.lg` |
| 712 | Hardcoded width | `width: 50` | Create constant |

### PlayoffBracketScreen.tsx (8 violations)

**Hardcoded Hex Colors (Critical):**
| Line | Current | Fix |
|------|---------|-----|
| 409 | `backgroundColor: '#D50A0A'` | Add `colors.afcRed` to theme |
| 413 | `backgroundColor: '#003069'` | Add `colors.nfcBlue` to theme |

**Hardcoded Dimensions:**
| Line | Current | Fix |
|------|---------|-----|
| 354 | `width: 60` | Create bracket constant |
| 429 | `width: 20` | Use spacing token |
| 482-484 | `width: 24, height: 24, borderRadius: 12` | Use `spacing.xl` and `borderRadius.lg` |
| 531 | `height: 1` | Use divider constant |

**Color + Opacity:**
| Line | Current | Fix |
|------|---------|-----|
| 472 | `colors.success + '20'` | Use `colors.successFaded` |

### GamecastScreen.tsx (1 violation)

| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 474 | Hardcoded width | `width: 60` | Use constant for clock display width |

---

## Implementation Tasks

- [ ] **Theme Updates (theme.ts)**
  - [ ] Add `colors.afcRed: '#D50A0A'` (official AFC color)
  - [ ] Add `colors.nfcBlue: '#003069'` (official NFC color)
  - [ ] Add `colors.successFaded` if not already present

- [ ] **Create Layout Constants**
  Consider creating a layout constants file for common widths:
  ```typescript
  export const LAYOUT = {
    columnWidthSm: 24,  // spacing.xl
    columnWidthMd: 40,
    columnWidthLg: 60,
    columnWidthXl: 70,
  };
  ```

- [ ] **ScheduleScreen.tsx**
  - [ ] Replace 4 hardcoded width values

- [ ] **StandingsScreen.tsx**
  - [ ] Replace 10+ hardcoded width values
  - [ ] Fix avatar dimensions to use spacing tokens

- [ ] **PlayoffBracketScreen.tsx**
  - [ ] Add AFC/NFC colors to theme and use them
  - [ ] Replace hardcoded dimensions
  - [ ] Replace color + opacity concatenation

- [ ] **GamecastScreen.tsx**
  - [ ] Replace hardcoded width

---

## Completion Gates

### Pre-merge Checklist
- [ ] All hardcoded hex colors replaced with `colors.X` tokens
- [ ] All `colors.X + 'YY'` patterns replaced with theme colors
- [ ] All hardcoded widths use spacing tokens or documented constants
- [ ] AFC/NFC colors added to theme
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Visual check: schedule, standings, bracket render correctly

### Testing Commands
```bash
npm run typecheck
npm run lint
npm test -- --testPathPattern="Schedule|Standings|Playoff|Gamecast"
```

---

## Notes
- PlayoffBracketScreen has hardcoded conference colors that are legitimate brand colors - add to theme
- Many width values are for table-like layouts - consider creating a layout constants module
