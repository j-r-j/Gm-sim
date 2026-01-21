# Brand Compliance: News Screens

## Scope
This work item covers brand standards compliance for:
- `src/screens/NewsScreen.tsx`

**Note:** TransactionLogScreen and NewsTickerScreen do not exist in the codebase.

**Total Violations: 9**

## Brand Standards Reference
| Category | Token | Value |
|----------|-------|-------|
| **Spacing** | `spacing.xxs` | `2` |
| **Border Radius** | `borderRadius.md` | `8` |
| | `borderRadius.lg` | `12` |
| **Font Size** | `fontSize.xxxl` | `28` |
| | `fontSize.display` | `36` |

---

## Violations Found

### NewsScreen.tsx (9 violations)

| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 259 | Non-standard borderRadius | `borderRadius: 10` | Use `borderRadius.md` (8) or `borderRadius.lg` (12) |
| 260 | Hardcoded minWidth | `minWidth: 20` | Use `spacing.lg + spacing.xs` or create badge constant |
| 261 | Hardcoded height | `height: 20` | Same approach as minWidth |
| 272 | Hardcoded width | `width: 60` | Create placeholder width constant |
| 333 | Hardcoded paddingVertical | `paddingVertical: 2` | Use `spacing.xxs` |
| 357 | Hardcoded lineHeight | `lineHeight: 20` | Create text style constant |
| 362 | Hardcoded lineHeight | `lineHeight: 20` | Same constant |
| 371 | Hardcoded paddingVertical | `paddingVertical: 2` | Use `spacing.xxs` |
| 386 | Hardcoded fontSize for emoji | `fontSize: 48` | Use `fontSize.display` or create `fontSize.icon` |

---

## Implementation Tasks

- [ ] **Theme Updates (theme.ts)**
  - [ ] Consider adding `fontSize.icon: 48` for large emoji/icon display
  - [ ] Consider adding text style presets with lineHeight

- [ ] **NewsScreen.tsx**
  - [ ] Line 259: Replace `borderRadius: 10` with `borderRadius.md` or `borderRadius.lg`
  - [ ] Lines 260-261: Replace hardcoded badge dimensions with spacing tokens
  - [ ] Line 272: Replace hardcoded placeholder width
  - [ ] Lines 333, 371: Replace `paddingVertical: 2` with `spacing.xxs`
  - [ ] Lines 357, 362: Create consistent lineHeight approach
  - [ ] Line 386: Replace `fontSize: 48` with theme token

---

## Completion Gates

### Pre-merge Checklist
- [ ] All hardcoded borderRadius values use `borderRadius.X` tokens
- [ ] All hardcoded spacing values use `spacing.X` tokens
- [ ] Consistent lineHeight strategy implemented
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Visual check: news cards and badges display correctly

### Testing Commands
```bash
npm run typecheck
npm run lint
npm test -- --testPathPattern="NewsScreen"
```

---

## Notes
- The lineHeight issue is common across the codebase - may warrant a text style preset
- `fontSize: 48` for emoji is decorative - could remain hardcoded or add icon size token
- This is a relatively small scope with straightforward fixes
