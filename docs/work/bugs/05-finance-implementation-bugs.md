# Implementation Bugs: Finance Screens

## Scope
- `src/screens/FinancesScreen.tsx`
- `src/screens/ContractManagementScreen.tsx`
- `src/screens/TradeScreen.tsx`
- `src/screens/FreeAgencyScreen.tsx`
- `src/screens/RFAScreen.tsx`
- `src/screens/JobMarketScreen.tsx`

---

## Critical Bugs

### FinancesScreen.tsx:118 - Dead money hardcoded to 0
**Severity:** CRITICAL
**Type:** Missing Data Display

```typescript
const deadMoney = 0; // Would come from team.deadMoney
```

**Issue:** Dead money is hardcoded to 0 instead of using `team.finances.deadMoney` from the TeamFinances model.

**Impact:** Users never see actual dead cap, making financial planning impossible.

---

### ContractManagementScreen.tsx:340-341 - Division by zero risk
**Severity:** CRITICAL
**Type:** Crash Risk

**Issue:** If contracts array is empty, calculations involving division could fail.

**Impact:** Potential NaN or Infinity values displayed.

---

## High Severity Bugs

### FinancesScreen.tsx:125-127 - Cap hit calculation is simplified guesswork
**Severity:** HIGH
**Type:** Incorrect Calculation

**Issue:** Cap hit calculation doesn't use actual contract data from core. Should use `getCurrentCapHit()` from Contract.ts.

**Impact:** Cap figures shown are estimates, not actual values.

---

### FinancesScreen.tsx:134 - Years remaining is crude estimation
**Severity:** HIGH
**Type:** Incorrect Calculation

**Issue:** Years remaining based on experience is a crude guess. Should use actual contract `yearsRemaining` data.

**Impact:** Contract duration info is unreliable.

---

### TradeScreen.tsx:439,468 - Trade values use random()
**Severity:** HIGH
**Type:** Non-Deterministic

```typescript
Math.random()
```

**Issue:** Trade values appear to use random generation, making them non-deterministic.

**Impact:** Trade evaluations inconsistent, can't be replayed/tested.

---

### TradeScreen.tsx:390 - No check for asset existence before trade
**Severity:** HIGH
**Type:** Logic Bug

**Issue:** No validation that assets actually exist before allowing trade.

**Impact:** Could trade non-existent assets.

---

### FreeAgencyScreen.tsx:157 - Cap space check only for single year
**Severity:** HIGH
**Type:** Incomplete Validation

**Issue:** Cap space validation only checks current year, not total contract value across years.

**Impact:** Could sign contracts that exceed future cap space.

---

### FreeAgencyScreen.tsx:150-164 - Potential unit mismatch
**Severity:** HIGH
**Type:** Calculation Bug

**Issue:** Million conversion might cause unit mismatches with stored values.

**Impact:** Incorrect salary cap calculations.

---

## Medium Severity Bugs

### ContractManagementScreen.tsx:172 - Silent default to 0
**Severity:** MEDIUM
**Type:** Data Handling

**Issue:** If `yearlyBreakdown[0]` doesn't exist, silently defaults to 0.

**Impact:** Missing contract data appears as $0.

---

### RFAScreen.tsx:199 - Hardcoded ERFA tender value
**Severity:** MEDIUM
**Type:** Hardcoded Value

**Issue:** ERFA tender value is hardcoded instead of using `calculateTenderValue()`.

**Impact:** Tender values don't reflect actual calculated amounts.

---

### RFAScreen.tsx:200 - Type unsafe casting
**Severity:** MEDIUM
**Type:** Type Safety

**Issue:** Unsafe type casting without validation.

**Impact:** Runtime type errors possible.

---

### RFAScreen.tsx:320-323 - Potential NaN from invalid date calculation
**Severity:** MEDIUM
**Type:** Calculation Bug

**Issue:** Date calculation could produce NaN with invalid inputs.

**Impact:** Invalid dates displayed.

---

### RFAScreen.tsx:329 - Unsafe string slicing
**Severity:** MEDIUM
**Type:** Crash Risk

**Issue:** String slicing without length check.

**Impact:** Could crash on short strings.

---

### JobMarketScreen.tsx:375 - Inconsistent currency formatting
**Severity:** MEDIUM
**Type:** Display Bug

```typescript
/1000
```

**Issue:** Inconsistent currency formatting with `/1000` division.

**Impact:** Salary displayed in wrong units sometimes.

---

## Implementation Tasks

- [ ] **FinancesScreen.tsx**
  - [ ] Replace hardcoded `deadMoney = 0` with `team.finances.deadMoney`
  - [ ] Use `getCurrentCapHit()` for cap hit calculations
  - [ ] Use actual contract `yearsRemaining` data

- [ ] **ContractManagementScreen.tsx**
  - [ ] Add empty array check before division
  - [ ] Add null check for `yearlyBreakdown[0]`

- [ ] **TradeScreen.tsx**
  - [ ] Replace `Math.random()` with deterministic trade value calculation
  - [ ] Add asset existence validation before trade

- [ ] **FreeAgencyScreen.tsx**
  - [ ] Validate cap space for full contract duration
  - [ ] Fix unit conversion consistency

- [ ] **RFAScreen.tsx**
  - [ ] Use `calculateTenderValue()` instead of hardcoded values
  - [ ] Add type validation for castings
  - [ ] Add date validation before calculation
  - [ ] Add string length check before slicing

- [ ] **JobMarketScreen.tsx**
  - [ ] Standardize currency formatting

---

## Testing Commands

```bash
npm run typecheck
npm test -- --testPathPattern="Finances|Contract|Trade|FreeAgency|RFA|JobMarket"
```
