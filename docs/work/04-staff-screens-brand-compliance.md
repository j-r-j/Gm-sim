# Brand Compliance: Staff Screens

## Scope
This work item covers brand standards compliance for:
- `src/screens/StaffScreen.tsx`

**Note:** CoachingStaffScreen, OwnerMeetingScreen, and StaffDetailScreen do not exist in the codebase.

**Total Violations: 3**

## Brand Standards Reference
| Category | Token | Value |
|----------|-------|-------|
| **Spacing** | `spacing.xxs` | `2` |

---

## Violations Found

### StaffScreen.tsx (3 violations)

| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 414 | Hardcoded spacing | `marginTop: 2` | Use `spacing.xxs` |
| 460 | Color + opacity | `colors.warning + '10'` | Add `colors.warningVeryFaded` to theme |
| 463 | Color + opacity | `colors.warning + '30'` | Add `colors.warningFaded` to theme |

---

## Implementation Tasks

- [ ] **Theme Updates (theme.ts)**
  - [ ] Add `colors.warningVeryFaded: 'rgba(214, 158, 46, 0.06)'` (10% opacity)
  - [ ] Add `colors.warningFaded: 'rgba(214, 158, 46, 0.18)'` (30% opacity)

- [ ] **StaffScreen.tsx**
  - [ ] Line 414: Replace `marginTop: 2` with `marginTop: spacing.xxs`
  - [ ] Line 460: Replace `colors.warning + '10'` with `colors.warningVeryFaded`
  - [ ] Line 463: Replace `colors.warning + '30'` with `colors.warningFaded`

---

## Completion Gates

### Pre-merge Checklist
- [ ] All `colors.X + 'YY'` patterns replaced with theme colors
- [ ] All hardcoded spacing replaced with `spacing.X` tokens
- [ ] New theme colors follow naming convention
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Visual check: staff cards and vacancy indicators display correctly

### Testing Commands
```bash
npm run typecheck
npm run lint
npm test -- --testPathPattern="StaffScreen"
```

---

## Notes
- This is a small scope PR with only 3 violations
- Good candidate for a quick fix
