# QA Walkthrough Findings - GM Sim

**Date:** 2026-02-14
**Tester:** Automated + Manual Review (Playwright on Expo Web, port 8099)
**Build:** main branch, commit 444458d
**Device:** iPhone 14 Pro Max viewport (430x932), headless Chromium

---

## Executive Summary

The app has a **solid core** - the dashboard is well-designed with 20+ navigation options, game generation works, and the fundamental architecture is sound. However, there are **critical bugs blocking core flows**, **missing features referenced in the product spec**, and numerous **UX gaps** that would confuse or frustrate users.

**Blocking Issues:** 3 | **Bugs:** 8 | **Missing Features:** 15 | **UX Issues:** 20+ | **Notes:** 5

---

## CRITICAL / BLOCKING BUGS

### 1. QuotaExceededError - Game Cannot Save (P0)
- **Severity:** CRITICAL
- **Screen:** All (auto-save triggers everywhere)
- **Error:** `QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'save_0' exceeded the quota.`
- **Impact:** Game state is too large for localStorage (~5MB limit on web). Auto-save silently fails. Users will lose ALL progress on page refresh.
- **Repro:** Start new game → observe console error immediately after dashboard loads.
- **Expected:** Game saves reliably. On web, consider using IndexedDB, compression, or chunked storage.

### 2. Alert.alert Broken on React Native Web (P0)
- **Severity:** CRITICAL
- **Screens:** Trade, Draft Room, Prospect Detail, Scouting Reports, many more
- **Impact:** `Alert.alert()` does absolutely nothing on web - no dialog, no feedback. Many user actions silently fail (trade proposals, scout assignments, draft errors, etc.).
- **Known locations still broken:**
  - Trade counter/propose → "coming soon" alert never shows
  - Draft Room `onSelectProspect` error → "Could not make that selection" never shows
  - Draft Room trade accept/reject errors → silent failure
  - Prospect detail scout assignment confirmation → silent
  - Scouting Reports focus request → silent
  - Big Board lock toggle → silent
- **Expected:** Use `window.alert()` / `window.confirm()` on web, or implement custom modal dialogs.

### 3. $0 Cap Space on Season 2 Dashboard (P0)
- **Severity:** CRITICAL
- **Screen:** Dashboard (after completing first season)
- **Impact:** Cap space shows $0M after season transition, making contract/FA decisions impossible.
- **Expected:** Cap space recalculated for new league year.

---

## BUGS

### 4. Staff Decision Screen - No Coach Details (P1)
- **Screen:** Coaching Staff (after team selection)
- **What shows:** "Staff Chemistry: Good", "Staff Budget: $0K / $30.0M", Keep/Clean House buttons
- **What's missing:** Individual coach names, roles (HC/OC/DC), ratings, offensive/defensive schemes, win-loss records
- **Impact:** Users are asked to keep or fire coaches they know nothing about. Decision is completely uninformed.
- **Expected:** Show each coach with name, role, scheme, rating, and record.

### 5. Staff Budget "$0K / $30.0M" Unexplained (P2)
- **Screen:** Coaching Staff
- **Issue:** Shows $0K used of $30M budget but doesn't explain what this means or how it relates to coaching quality.
- **Expected:** Explain staff budget concept or remove if not yet implemented.

### 6. Welcome Modal Blocks All Dashboard Interaction (P2)
- **Screen:** Dashboard (first visit only)
- **Issue:** "Welcome, GM!" modal appears on top of dashboard. Until user clicks "Got it!", no dashboard buttons are accessible. Not a bug per se, but the modal doesn't auto-dismiss and could confuse users who don't see the button (need to scroll down on smaller screens).
- **Expected:** Consider auto-dismiss after 5 seconds, or make the modal smaller.

### 7. Navigation Accessibility - Dashboard Stat Labels Match Nav Text (P2)
- **Screen:** Dashboard
- **Issue:** The header shows "ROSTER 53/53" as a stat label, which conflicts with the "Roster" navigation card below. Screen readers and automation tools match the wrong element. Similar issue with "Schedule", "Standings" text appearing in multiple places.
- **Expected:** Use unique aria-labels for navigation targets vs. display labels.

### 8. "WARM SEAT" Status Shown at Game Start (P2)
- **Screen:** Dashboard
- **Issue:** Brand new GM starts at "WARM SEAT - Your position requires improvement." This is discouraging on a fresh game. Owner satisfaction should start neutral/positive.
- **Expected:** New GMs should start at STABLE or SECURE status.

---

## MISSING FEATURES

### Team Selection Screen
| # | Feature | Expected | Actual | Priority |
|---|---------|----------|--------|----------|
| 9 | Salary cap per team | Show cap space, dead money | Only shows team name + market size | P1 |
| 10 | Previous season record | Show last year's W-L | Nothing shown | P1 |
| 11 | Difficulty rating | 1-5 star difficulty per team | Not implemented | P1 |
| 12 | Key player preview | Show 2-3 star players per team | Not implemented | P2 |
| 13 | Roster grade/championship window | Show rebuild vs. contender status | Not implemented | P2 |

### Start Screen
| # | Feature | Expected | Actual | Priority |
|---|---------|----------|--------|----------|
| 14 | Save slot display | Show all 3 save slots with team/progress | Only shows "New Game" and "Settings" when no saves exist | P2 |

### Roster Screen
| # | Feature | Expected | Actual | Priority |
|---|---------|----------|--------|----------|
| 15 | Practice Squad section | 16-man practice squad with management | Not visible in roster view | P1 |
| 16 | Injured Reserve section | IR players listed with return timeline | Not visible in roster view | P1 |
| 17 | Player status indicators | Healthy/Injured/Questionable/Out badges | Not visible per player | P1 |
| 18 | Place on IR action | Button to move injured players to IR | Not visible | P1 |
| 19 | Extend contract action | Button to extend expiring contracts | Not visible in roster view | P2 |

### Game Simulation
| # | Feature | Expected | Actual | Priority |
|---|---------|----------|--------|----------|
| 20 | Pre-game injury report | Show who's Out/Questionable/Doubtful | Not visible before game | P1 |
| 21 | Weather conditions | Show weather affecting game | Not visible | P2 |
| 22 | Speed controls (1x/2x/4x) | Product spec requires speed controls | Unknown - couldn't reach game screen | P1 |
| 23 | Skip to End option | Quick sim completion | Unknown - couldn't reach game screen | P1 |

### Draft Room
| # | Feature | Expected | Actual | Priority |
|---|---------|----------|--------|----------|
| 24 | User counter-trade | Counter AI trade offers during draft | Shows "coming soon" alert (broken on web) | P2 |
| 25 | User trade proposals | Propose trades to move up/down in draft | Shows "coming soon" alert (broken on web) | P2 |

---

## UX ISSUES

### Dashboard
| # | Issue | Details | Priority |
|---|-------|---------|----------|
| 26 | No explicit Job Security % | Shows "WARM SEAT" text label but no 0-100% meter as product spec requires | P1 |
| 27 | Opponent record noise | "vs Cougars (0-0)" at Week 1 adds no value since everyone is 0-0 | P3 |
| 28 | No division standings preview | Shows "AFC East - LEAD" but no mini standings | P3 |
| 29 | Dashboard is very long | 20+ navigation cards require significant scrolling. Consider tab grouping or collapsible sections | P2 |

### Staff Decision
| # | Issue | Details | Priority |
|---|-------|---------|----------|
| 30 | Binary choice with no info | "Keep Staff" or "Clean House" with zero coach details shown | P1 |
| 31 | No coaching scheme display | Users can't evaluate offensive/defensive fit | P1 |
| 32 | Chemistry meter without context | "Staff Chemistry: Good" - good compared to what? No benchmark | P3 |

### Team Selection
| # | Issue | Details | Priority |
|---|-------|---------|----------|
| 33 | GM name input not clearly labeled | Shows "Your Name" with placeholder "Enter your GM name" - could be clearer that this is the GM character name | P3 |
| 34 | Selecting team doesn't scroll to confirmation | After picking a team at top, the confirm panel appears at bottom requiring manual scroll | P2 |
| 35 | No team comparison view | Can't compare two teams side-by-side before selecting | P3 |

### Player Profile (from code analysis)
| # | Issue | Details | Priority |
|---|-------|---------|----------|
| 36 | Contract details unclear | Player profile shows skills/traits but contract info display is uncertain | P1 |
| 37 | No season stats on player card | No accumulated game stats visible (yards, TDs, etc.) per player | P1 |
| 38 | No player comparison from profile | Can't easily compare two players from profile view | P3 |

### General
| # | Issue | Details | Priority |
|---|-------|---------|----------|
| 39 | No loading indicator for game generation | After "Start Career", the staff screen appears instantly on fast machines but could be confusing on slow devices | P2 |
| 40 | No onboarding tutorial | Welcome modal has tips but no interactive tutorial | P2 |

---

## POSITIVE OBSERVATIONS

1. **Dashboard is comprehensive** - Shows team name, GM name, year, season phase, record, cap space, roster count, owner status, division position, and 20+ navigation options organized into clear categories (Team Management, Season, Player Acquisition, League, System).

2. **Play Week button is prominent** - The "Play Week 1 vs Cougars (0-0)" button is the most visually prominent element, making the primary action crystal clear.

3. **Navigation categories are well-organized** - Team Management, Season, Player Acquisition, League, and System sections logically group related screens.

4. **Game Plan and Start/Sit screens exist** - These are uncommon in GM sims and add strategic depth.

5. **Waiver Wire feature exists** - Nice addition for in-season roster management.

6. **Career Stats section** - At-a-glance career metrics (Seasons, Record, Playoffs, Titles) at the bottom of dashboard.

7. **Quick Sim option** - "Quick Sim Week 1" and "Sim Season" buttons for users who want to skip gameplay.

8. **Team selection UX is clean** - Division-based organization with expandable sections. "By Division" vs "All Teams" toggle. Checkmark on selected team. Confirmation panel with save slot selection.

9. **Welcome tips are helpful** - The "Welcome, GM!" modal provides 4 useful getting-started tips.

10. **Draft system is deep** - Draft Board, Big Board, Scouting Reports, Combine, Trade Calculator, and full Draft Room with AI picks, timer, trade offers, and war room feed.

---

## SCREENS VERIFIED WORKING

| Screen | Status | Notes |
|--------|--------|-------|
| Start Screen | ✅ Working | Clean, clear entry point |
| Team Selection | ✅ Working | Needs more team info (see Missing Features) |
| Staff Decision | ✅ Working | Needs coach details (see Bugs) |
| Dashboard | ✅ Working | Comprehensive, well-organized |
| Roster | ⚠️ Partial | Navigation works (from code), but test couldn't distinguish nav card from stat label |
| Depth Chart | ⚠️ Untested | Navigation card exists on dashboard |
| Schedule | ⚠️ Untested | Navigation card exists on dashboard |
| Standings | ⚠️ Untested | Navigation card exists on dashboard |
| Finances | ⚠️ Untested | Navigation card exists on dashboard |
| Contracts | ⚠️ Untested | Navigation card exists on dashboard |
| Staff | ⚠️ Untested | Navigation card exists on dashboard |
| Game Plan | ⚠️ Untested | Navigation card exists on dashboard (NEW badge) |
| Game Sim | ⚠️ Untested | Play Week button exists but test couldn't click it |
| Stats | ⚠️ Untested | Navigation card exists on dashboard |
| News | ⚠️ Untested | Navigation card exists on dashboard |
| Draft Room | ✅ From code | Complex state machine, AI picks work, timer works |
| Trade | ⚠️ Untested | Navigation card exists |
| Free Agency | ⚠️ Untested | Navigation card exists |
| Offseason | ⚠️ Untested | Not reachable in week 1 |

---

## TEST ENVIRONMENT NOTES

- **React Native Web** has known limitations: `Alert.alert()` is a no-op, navigation DOM keeps old screens invisible but in DOM, accessibility labels can match hidden elements.
- **localStorage quota** on web browsers is typically 5-10MB. The game state for GM Sim appears to exceed this.
- **Automated testing challenge:** Dashboard stat labels ("ROSTER 53/53") match the same text as navigation cards ("Roster"), causing click-target confusion in Playwright tests. This also affects screen reader users.

---

## RECOMMENDED PRIORITY ORDER

### Immediate (P0 - Blocking)
1. Fix localStorage QuotaExceededError - switch to IndexedDB or compress data
2. Replace all `Alert.alert()` calls with web-compatible alternatives
3. Fix Season 2 cap space calculation

### High (P1 - Before Launch)
4. Add coach details to Staff Decision screen
5. Add Practice Squad and IR sections to Roster
6. Add player status indicators to Roster
7. Add team info to Team Selection (cap, record, difficulty)
8. Add Job Security % meter to dashboard
9. Add pre-game injury report
10. Verify game simulation speed controls exist

### Medium (P2 - Soon After Launch)
11. Add team comparison/preview to Team Selection
12. Add extend contract action to Roster
13. Add Place on IR action to Roster
14. Implement user trade proposals in Draft Room
15. Improve Welcome modal (auto-dismiss or smaller)
16. Add loading states for game generation

### Low (P3 - Polish)
17. Remove opponent record noise at Week 1
18. Add division standings mini-view to dashboard
19. Better coach chemistry context
20. GM name input labeling
