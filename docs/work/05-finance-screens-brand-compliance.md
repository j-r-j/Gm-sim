# Brand Compliance: Finance Screens

## Scope
This work item covers brand standards compliance for:
- `src/screens/FinancesScreen.tsx`
- `src/screens/ContractManagementScreen.tsx`
- `src/screens/TradeScreen.tsx`
- `src/screens/FreeAgencyScreen.tsx`
- `src/screens/RFAScreen.tsx`
- `src/screens/JobMarketScreen.tsx`

**Total Violations: 23+**

## Brand Standards Reference
| Category | Token | Value |
|----------|-------|-------|
| **Border Radius** | `borderRadius.sm` | `4` |
| | `borderRadius.md` | `8` |
| | `borderRadius.lg` | `12` |
| **Spacing** | `spacing.xxs` | `2` |
| | `spacing.xs` | `4` |
| | `spacing.sm` | `8` |

---

## Violations Found

### FinancesScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| Various | Hardcoded heights/widths | Use spacing tokens |
| Various | Hardcoded borderRadius | Use borderRadius tokens |

### ContractManagementScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| Various | Non-standard borderRadius | `borderRadius: 6` | Use `borderRadius.sm` (4) or `borderRadius.md` (8) |
| 208 | Color + opacity | `colors.warning + '30'` | Use theme color |
| 213 | Color + opacity | `colors.info + '30'` | Use theme color |
| 218 | Color + opacity | `colors.primary + '30'` | Use theme color |
| 528 | Color + opacity | `colors.error + '20'` | Use theme color |
| 531 | Color + opacity | `colors.warning + '20'` | Use theme color |
| 534 | Color + opacity | `colors.success + '20'` | Use theme color |
| 620 | Color + opacity | `colors.primary + '20'` | Use theme color |
| 663 | Color + opacity | `colors.error + '20'` | Use theme color |

### TradeScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| Various | Hardcoded dimensions | Use spacing tokens |
| Various | rgba overlay colors | Add to theme colors |

### FreeAgencyScreen.tsx
| Line | Issue | Fix |
|------|-------|-----|
| Various | Hardcoded opacity values | Add themed opacity variants |
| Various | Hardcoded positioning | Use spacing tokens |

### RFAScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 665 | Color + opacity | `colors.primary + '20'` | Use theme color |
| 796 | Color + opacity | `colors.error + '20'` | Use theme color |
| 820 | Color + opacity | `colors.error + '20'` | Use theme color |
| 847 | Color + opacity | `colors.primary + '10'` | Use theme color |

### JobMarketScreen.tsx
| Line | Issue | Current | Fix |
|------|-------|---------|-----|
| 140 | Color + opacity | `colors.textSecondary + '20'` | Use theme color |
| 881 | Color + opacity | `colors.success + '10'` | Use theme color |
| 884 | Color + opacity | `colors.success + '30'` | Use theme color |
| 927 | Color + opacity | `colors.error + '10'` | Use theme color |

---

## Implementation Tasks

- [ ] **Theme Updates (theme.ts)**
  - [ ] Ensure all faded color variants are available
  - [ ] Add any missing opacity variants (10%, 20%, 30%, 40%)

- [ ] **FinancesScreen.tsx**
  - [ ] Audit and fix hardcoded dimensions
  - [ ] Replace non-standard borderRadius values

- [ ] **ContractManagementScreen.tsx**
  - [ ] Replace `borderRadius: 6` with `borderRadius.sm` or `borderRadius.md`
  - [ ] Replace 8 color + opacity concatenations with theme colors

- [ ] **TradeScreen.tsx**
  - [ ] Replace hardcoded dimensions with spacing tokens
  - [ ] Replace rgba overlay with theme color

- [ ] **FreeAgencyScreen.tsx**
  - [ ] Replace hardcoded opacity and positioning values

- [ ] **RFAScreen.tsx**
  - [ ] Replace 4 color + opacity concatenations

- [ ] **JobMarketScreen.tsx**
  - [ ] Replace 4 color + opacity concatenations

---

## Completion Gates

### Pre-merge Checklist
- [ ] All non-standard borderRadius values (6, 14, etc.) replaced
- [ ] All `colors.X + 'YY'` patterns replaced with theme colors
- [ ] All hardcoded spacing replaced with `spacing.X` tokens
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Visual check: financial data, contracts, and trades display correctly

### Testing Commands
```bash
npm run typecheck
npm run lint
npm test -- --testPathPattern="Finances|Contract|Trade|FreeAgency|RFA|JobMarket"
```

---

## Notes
- ContractManagementScreen has the most violations in this group
- Consider batch-fixing all color + opacity issues in one pass
