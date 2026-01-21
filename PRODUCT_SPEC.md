# NFL GM Simulator - Production Product Specification

> **Ralph Wiggum Prompt**: A single source of truth for consistent, delightful user experiences across every screen and flow in the application.

## Table of Contents

1. [Product Vision](#product-vision)
2. [Core Principles](#core-principles)
3. [User Personas](#user-personas)
4. [Single Flow Definitions](#single-flow-definitions)
5. [Screen-by-Screen Specifications](#screen-by-screen-specifications)
6. [Design System](#design-system)
7. [Interaction Patterns](#interaction-patterns)
8. [Production Checklist](#production-checklist)

---

## Product Vision

**Mission**: Create the most immersive, authentic NFL General Manager experience on mobile - where every decision matters, every player has a story, and dynasties are built one week at a time.

**Core Fantasy**: You ARE the GM. Not a coach calling plays, not an owner counting money - you're the mastermind building a championship team through shrewd drafting, savvy free agency moves, and brilliant roster construction.

**Success Metrics**:
- Session length: 15+ minutes average
- Retention: 40% D7, 20% D30
- Seasons completed: 3+ average per user
- NPS: 50+

---

## Core Principles

### 1. One Thing at a Time
Every screen has ONE primary action. Users should never wonder "what do I do here?"

### 2. Progressive Disclosure
Show the essential first, reveal depth on demand. A casual fan can play; a hardcore sim fan can optimize.

### 3. Meaningful Choices
No decision should be obviously right or wrong. Trade-offs create engagement.

### 4. Satisfying Progression
Every action should feel like progress: weeks advance, players develop, championships approach.

### 5. Forgiving Navigation
Users can always get back to safety (dashboard). No soft-locks. No confusion.

### 6. Celebration of Moments
Draft picks, game wins, championships - these moments deserve fanfare.

---

## User Personas

### The Casual Fan (60% of users)
- **Behavior**: Plays during commute, 10-15 minute sessions
- **Needs**: Quick decisions, clear guidance, fast simulation
- **Pain Points**: Information overload, complex mechanics
- **Key Screens**: Dashboard, Quick Sim, Draft (auto-pick mode)

### The Armchair GM (30% of users)
- **Behavior**: Deep sessions, analyzes every stat
- **Needs**: Full control, detailed information, strategic depth
- **Pain Points**: Lack of depth, too much hand-holding
- **Key Screens**: Depth Chart, Scouting Reports, Trade Calculator

### The Dynasty Builder (10% of users)
- **Behavior**: Multi-year campaigns, 50+ hours invested
- **Needs**: Long-term tracking, legacy features, competitive challenge
- **Pain Points**: Repetitive flows, lack of late-game content
- **Key Screens**: Career Stats, Hall of Fame, Owner Relations

---

## Single Flow Definitions

### Flow 1: New Game Setup

```
START SCREEN
    │
    ├─ [New Game] ──────────────────────────────────────┐
    │                                                    │
    │   TEAM SELECTION                                   │
    │   ┌─────────────────────────────────────────────┐ │
    │   │ "Choose Your Team"                          │ │
    │   │                                             │ │
    │   │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │ │
    │   │ │ 🏈  │ │ 🏈  │ │ 🏈  │ │ 🏈  │  ...      │ │
    │   │ │ DAL │ │ NYG │ │ PHI │ │ WSH │           │ │
    │   │ └─────┘ └─────┘ └─────┘ └─────┘           │ │
    │   │                                             │ │
    │   │ Team Info Panel (selected team)             │ │
    │   │ • Record Last Season: 10-7                  │ │
    │   │ • Cap Space: $45M                           │ │
    │   │ • Key Players: Dak Prescott, CeeDee Lamb   │ │
    │   │ • Difficulty: ★★★☆☆                        │ │
    │   │                                             │ │
    │   │ [Confirm Selection]                         │ │
    │   └─────────────────────────────────────────────┘ │
    │                    │                               │
    │                    ▼                               │
    │   STAFF DECISION                                   │
    │   ┌─────────────────────────────────────────────┐ │
    │   │ "Your Coaching Staff"                       │ │
    │   │                                             │ │
    │   │ Option A: Keep Current Staff                │ │
    │   │ [Quick Start - Use existing coaches]        │ │
    │   │                                             │ │
    │   │ Option B: Clean House                       │ │
    │   │ [Build from scratch - hire all new staff]   │ │
    │   │                                             │ │
    │   │ Current Staff Preview:                      │ │
    │   │ • HC: Mike McCarthy (78 OVR)               │ │
    │   │ • OC: Brian Schottenheimer (72 OVR)        │ │
    │   │ • DC: Dan Quinn (81 OVR)                   │ │
    │   └─────────────────────────────────────────────┘ │
    │                    │                               │
    │                    ▼                               │
    │   [If Clean House selected]                       │
    │   STAFF HIRING (3-step wizard)                    │
    │   Step 1: Head Coach → Step 2: OC → Step 3: DC   │
    │                    │                               │
    │                    ▼                               │
    │   GM DASHBOARD (Season Begins)                    │
    └───────────────────────────────────────────────────┘
```

**Key UX Rules**:
- Default to "Quick Start" - don't force coaching decisions on new users
- Show team difficulty rating to set expectations
- Celebration animation when team is confirmed
- Auto-save after team selection

---

### Flow 2: Weekly Progression (Regular Season)

```
GM DASHBOARD (Week N)
    │
    │   ┌─────────────────────────────────────────────┐
    │   │ 🏈 DALLAS COWBOYS                    3-2    │
    │   │ ─────────────────────────────────────────── │
    │   │                                             │
    │   │ NEXT UP: Week 6 @ San Francisco 49ers      │
    │   │ Sunday, Oct 15 • 4:25 PM ET                │
    │   │                                             │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │      [★ PLAY WEEK 6 ★]                 │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ Quick Actions:                              │
    │   │ [Roster] [Depth Chart] [Schedule]          │
    │   │                                             │
    │   │ Job Security: ████████░░ 78%               │
    │   │ Cap Space: $12.4M                          │
    │   └─────────────────────────────────────────────┘
    │
    ├─ [Play Week N] ─────────────────────────────────┐
    │                                                  │
    │   PRE-GAME SCREEN                               │
    │   ┌─────────────────────────────────────────────┐
    │   │ WEEK 6 MATCHUP                             │
    │   │                                             │
    │   │    DAL (3-2)    @    SF (4-1)             │
    │   │      🏈              🏈                    │
    │   │                                             │
    │   │ Key Matchup: Your O-Line vs Their Pass Rush│
    │   │ Injury Report: [View]                      │
    │   │ Weather: Sunny, 72°F                       │
    │   │                                             │
    │   │ Your Prediction: [Win] [Lose]              │
    │   │ (Optional - affects post-game reaction)    │
    │   │                                             │
    │   │ [Simulate Game]   [Watch Live]             │
    │   └─────────────────────────────────────────────┘
    │                    │
    │                    ▼
    │   GAME SIMULATION
    │   ┌─────────────────────────────────────────────┐
    │   │         DAL 14 - 21 SF                     │
    │   │            Q3  8:42                        │
    │   │ ─────────────────────────────────────────── │
    │   │                                             │
    │   │ PLAY-BY-PLAY:                              │
    │   │ ▶ Prescott pass complete to Lamb, 23 yds  │
    │   │ ▶ Elliott rush left, 4 yards              │
    │   │ ▶ Prescott sacked by Bosa, -8 yards       │
    │   │                                             │
    │   │ [1x] [2x] [4x] [Skip to End]              │
    │   │                                             │
    │   │ 🚨 INJURY: Tyron Smith (LT) - Ankle       │
    │   └─────────────────────────────────────────────┘
    │                    │
    │                    ▼
    │   POST-GAME RESULT
    │   ┌─────────────────────────────────────────────┐
    │   │           FINAL                             │
    │   │    DAL 24 - SF 28                          │
    │   │                                             │
    │   │ Record: 3-3 (3rd in NFC East)             │
    │   │                                             │
    │   │ GAME SUMMARY:                              │
    │   │ • Total Yards: 342                         │
    │   │ • Turnovers: 2                             │
    │   │ • Time of Possession: 28:14               │
    │   │                                             │
    │   │ PLAYER OF GAME: CeeDee Lamb               │
    │   │ 8 catches, 124 yards, 1 TD                │
    │   │                                             │
    │   │ [View Full Stats]   [Continue]             │
    │   └─────────────────────────────────────────────┘
    │                    │
    │                    ▼
    │   WEEK SUMMARY (Other Games)
    │   ┌─────────────────────────────────────────────┐
    │   │ WEEK 6 RESULTS                             │
    │   │                                             │
    │   │ NFC East Standings:                        │
    │   │ 1. PHI  5-1  ██████████                   │
    │   │ 2. NYG  4-2  ████████                     │
    │   │ 3. DAL  3-3  ██████ ← You                 │
    │   │ 4. WSH  2-4  ████                         │
    │   │                                             │
    │   │ Notable Results:                           │
    │   │ • Chiefs upset by Raiders 21-17           │
    │   │ • Bills crush Dolphins 45-10              │
    │   │                                             │
    │   │ [View All Scores]   [Advance to Week 7]   │
    │   └─────────────────────────────────────────────┘
    │                    │
    │                    ▼
    │   GM DASHBOARD (Week N+1)
    └─────────────────────────────────────────────────┘
```

**Key UX Rules**:
- ONE primary CTA on dashboard: "Play Week N"
- Game speed defaults to 2x (respect user time)
- Injury alerts interrupt simulation (important decisions)
- Week summary is skippable but valuable
- Auto-save after each game

---

### Flow 3: Playoffs

```
PLAYOFFS BEGIN (After Week 18)
    │
    │   PLAYOFF BRACKET SCREEN
    │   ┌─────────────────────────────────────────────┐
    │   │ 🏆 NFL PLAYOFFS                            │
    │   │                                             │
    │   │        AFC                   NFC           │
    │   │   ┌─────────┐           ┌─────────┐       │
    │   │   │ #1 KC   │ BYE       │ #1 PHI  │ BYE   │
    │   │   ├─────────┤           ├─────────┤       │
    │   │   │ #2 BUF  │───┐   ┌───│ #2 SF   │       │
    │   │   ├─────────┤   │   │   ├─────────┤       │
    │   │   │ #3 BAL  │─┐ │   │ ┌─│ #3 DAL ★│ ← You │
    │   │   ├─────────┤ │ │   │ │ ├─────────┤       │
    │   │   │ #4 HOU  │ │ │   │ │ │ #4 DET  │       │
    │   │   ├─────────┤ │ │   │ │ ├─────────┤       │
    │   │   │ #5 MIA  ├─┘ │   │ └─┤ #5 TB   │       │
    │   │   ├─────────┤   │   │   ├─────────┤       │
    │   │   │ #6 PIT  ├───┘   └───┤ #6 GB   │       │
    │   │   ├─────────┤           ├─────────┤       │
    │   │   │ #7 CLE  │           │ #7 LAR  │       │
    │   │   └─────────┘           └─────────┘       │
    │   │                                             │
    │   │ YOUR MATCHUP: #3 DAL @ #6 GB              │
    │   │ Wild Card Round • Saturday 4:30 PM        │
    │   │                                             │
    │   │ [★ PLAY WILD CARD GAME ★]                 │
    │   └─────────────────────────────────────────────┘
    │
    │   [Win Path: Wild Card → Divisional → NFC Championship → Super Bowl]
    │
    │   IF YOU WIN SUPER BOWL:
    │   ┌─────────────────────────────────────────────┐
    │   │           🏆 CHAMPIONS 🏆                   │
    │   │                                             │
    │   │     DALLAS COWBOYS                         │
    │   │     SUPER BOWL LVIII CHAMPIONS             │
    │   │                                             │
    │   │     Final: DAL 31 - KC 24                  │
    │   │                                             │
    │   │ 🎊 Confetti Animation 🎊                   │
    │   │                                             │
    │   │ Super Bowl MVP: Dak Prescott               │
    │   │ Your GM Rating: A+                         │
    │   │ Dynasty Points Earned: +500               │
    │   │                                             │
    │   │ [View Championship Team]   [Continue]      │
    │   └─────────────────────────────────────────────┘
    │
    └─ Proceed to Offseason Flow
```

**Key UX Rules**:
- Bracket always visible during playoffs
- Your team highlighted with star
- Single-elimination tension emphasized
- Championship win = major celebration (haptics, confetti, sound)
- Loss = consolation message + "there's always next year"

---

### Flow 4: Complete Offseason (12 Phases Simplified)

```
OFFSEASON BEGINS
    │
    │   OFFSEASON HUB SCREEN
    │   ┌─────────────────────────────────────────────┐
    │   │ 📅 OFFSEASON 2025                          │
    │   │ ─────────────────────────────────────────── │
    │   │                                             │
    │   │ Progress: ████████░░░░░░░░░░ 4/12          │
    │   │                                             │
    │   │ CURRENT PHASE:                             │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ 🔥 FREE AGENCY                         │ │
    │   │ │ Sign players to fill roster gaps       │ │
    │   │ │                                         │ │
    │   │ │ [Enter Free Agency Market]             │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ Completed:                                  │
    │   │ ✓ Season Recap                             │
    │   │ ✓ Coaching Decisions                       │
    │   │ ✓ Contract Management                      │
    │   │ ✓ Scouting Combine                         │
    │   │                                             │
    │   │ Upcoming:                                   │
    │   │ ○ NFL Draft                                │
    │   │ ○ Undrafted Free Agents                   │
    │   │ ○ OTAs & Training Camp                    │
    │   │ ○ Preseason                               │
    │   │ ○ Final Roster Cuts                       │
    │   └─────────────────────────────────────────────┘
    │
    │   PHASE DETAIL FLOWS:
    │
    ├─ PHASE 1: SEASON RECAP (Auto-Complete)
    │   ┌─────────────────────────────────────────────┐
    │   │ 📊 SEASON RECAP                            │
    │   │                                             │
    │   │ Final Record: 11-6                         │
    │   │ Playoff Result: NFC Championship Loss      │
    │   │ Your Grade: B+                             │
    │   │                                             │
    │   │ Awards:                                     │
    │   │ • CeeDee Lamb: Pro Bowl, All-Pro 2nd Team │
    │   │ • Micah Parsons: DPOY Runner-Up           │
    │   │                                             │
    │   │ Owner Satisfaction: ████████░░ 82%        │
    │   │ "Good season, but we expected a Super Bowl"│
    │   │                                             │
    │   │ [Continue to Coaching Decisions]           │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 2: COACHING DECISIONS
    │   ┌─────────────────────────────────────────────┐
    │   │ 🎓 COACHING DECISIONS                      │
    │   │                                             │
    │   │ HEAD COACH: Mike McCarthy                  │
    │   │ Record: 11-6 • Contract: 2 years left     │
    │   │                                             │
    │   │ [Keep] [Fire] [Extend]                     │
    │   │                                             │
    │   │ If firing, available candidates:           │
    │   │ • Ben Johnson (OC, Lions) - 88 OVR        │
    │   │ • Kellen Moore (OC, Eagles) - 82 OVR      │
    │   │ • DeMeco Ryans (HC, Texans) - 79 OVR      │
    │   │                                             │
    │   │ [Continue with Current Staff]              │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 3: CONTRACT MANAGEMENT
    │   ┌─────────────────────────────────────────────┐
    │   │ 💰 CONTRACT MANAGEMENT                     │
    │   │                                             │
    │   │ Cap Space: $23.4M                          │
    │   │ Dead Cap: $8.2M                            │
    │   │                                             │
    │   │ EXPIRING CONTRACTS (8 players):            │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ Tony Pollard   RB   $4.5M   85 OVR     │ │
    │   │ │ [Re-sign] [Franchise Tag] [Let Walk]   │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ Leighton Vander Esch  LB  $2.1M  72 OVR│ │
    │   │ │ [Re-sign] [Let Walk]                   │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ CUT CANDIDATES (save cap):                 │
    │   │ • Zack Martin: Cut saves $10M, $4M dead   │
    │   │                                             │
    │   │ [Continue to Combine]                      │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 4: SCOUTING COMBINE
    │   ┌─────────────────────────────────────────────┐
    │   │ 🏃 NFL COMBINE                             │
    │   │                                             │
    │   │ Your Scout: Marcus Williams (82 OVR)       │
    │   │ Scouting Budget: $2.5M                     │
    │   │                                             │
    │   │ TOP PROSPECTS (Your Board):                │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ 1. Caleb Williams  QB  USC   98 OVR    │ │
    │   │ │    40: 4.58 • Arm: 98 • Acc: 94       │ │
    │   │ │    Scout Grade: A+ "Generational"      │ │
    │   │ │    [View Full Report]                  │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ Position Needs: EDGE, CB, OT              │
    │   │                                             │
    │   │ [View All Prospects]   [Continue to FA]   │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 5: FREE AGENCY
    │   ┌─────────────────────────────────────────────┐
    │   │ 📝 FREE AGENCY                             │
    │   │                                             │
    │   │ Cap Space: $18.2M   Day 1 of 5            │
    │   │                                             │
    │   │ TOP AVAILABLE:                             │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ Kirk Cousins  QB  88 OVR  Asking: $35M │ │
    │   │ │ Interest: 5 teams • Your Fit: Good     │ │
    │   │ │ [Make Offer]  [Pass]                   │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ YOUR OFFERS OUT:                           │
    │   │ • Haason Reddick (EDGE) - $15M/yr ⏳      │
    │   │                                             │
    │   │ SIGNED THIS OFFSEASON:                     │
    │   │ • Jordan Poyer (S) - $8M/yr ✓             │
    │   │                                             │
    │   │ [Advance Day]   [Skip to Draft]           │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 6: NFL DRAFT (7 Rounds)
    │   ┌─────────────────────────────────────────────┐
    │   │ 🎯 NFL DRAFT - ROUND 1                     │
    │   │                                             │
    │   │ PICK 24 - DALLAS COWBOYS                   │
    │   │ ⏱️ 2:34 remaining                          │
    │   │                                             │
    │   │ TOP AVAILABLE:                             │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ 🔥 Jared Verse  EDGE  FSU   92 OVR     │ │
    │   │ │ Your Scout: "Perfect fit for our 4-3"  │ │
    │   │ │ [Draft]  [Trade Down]  [View More]     │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ TRADE OFFER INCOMING:                      │
    │   │ Raiders offer: Pick 32 + Pick 64 + 2025 2nd│
    │   │ [Accept]  [Counter]  [Decline]             │
    │   │                                             │
    │   │ [Auto-Draft Remaining]                     │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 7: UNDRAFTED FREE AGENTS
    │   ┌─────────────────────────────────────────────┐
    │   │ 📋 UNDRAFTED FREE AGENTS                   │
    │   │                                             │
    │   │ Roster: 82/90 players                      │
    │   │                                             │
    │   │ RECOMMENDED SIGNINGS:                      │
    │   │ Your scout identified 5 potential gems:    │
    │   │                                             │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ Jake Smith  WR  Texas Tech  68 OVR     │ │
    │   │ │ "Raw but elite speed, worth a flyer"   │ │
    │   │ │ [Sign to Practice Squad]               │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ [Sign All Recommended]   [Skip to OTAs]   │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 8-9: OTAs & TRAINING CAMP (Combined)
    │   ┌─────────────────────────────────────────────┐
    │   │ 🏋️ TRAINING CAMP                           │
    │   │                                             │
    │   │ Camp Progress: Day 12 of 30                │
    │   │                                             │
    │   │ DEVELOPMENT UPDATES:                       │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ 📈 BREAKOUT: Tyler Smith (OT)          │ │
    │   │ │ +3 Pass Block • +2 Run Block           │ │
    │   │ │ "Best camp of his career"              │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ 📉 STRUGGLING: Brandin Cooks (WR)      │ │
    │   │ │ -1 Speed • Losing step to younger WRs  │ │
    │   │ │ "May be roster bubble candidate"       │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ [Sim Rest of Camp]   [View Depth Chart]   │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 10: PRESEASON (3 Games)
    │   ┌─────────────────────────────────────────────┐
    │   │ 🏈 PRESEASON GAME 1                        │
    │   │                                             │
    │   │ DAL vs LAR (Exhibition)                    │
    │   │                                             │
    │   │ Purpose: Evaluate roster bubble players    │
    │   │                                             │
    │   │ WATCH LIST:                                │
    │   │ • Jake Smith (UDFA WR) - 3 rec, 42 yds ✓  │
    │   │ • Marcus Hayes (6th rd LB) - 5 tkl, 1 sack│
    │   │                                             │
    │   │ [Sim Game]   [Quick Results]              │
    │   └─────────────────────────────────────────────┘
    │
    ├─ PHASE 11: FINAL ROSTER CUTS
    │   ┌─────────────────────────────────────────────┐
    │   │ ✂️ FINAL ROSTER CUTS                       │
    │   │                                             │
    │   │ Current Roster: 78 players                 │
    │   │ Required: 53 players (must cut 25)         │
    │   │                                             │
    │   │ AI RECOMMENDATIONS:                        │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ CUT: Brandin Cooks (WR) 74 OVR         │ │
    │   │ │ Reason: Declined in camp, $12M salary  │ │
    │   │ │ [Cut]  [Keep]  [Trade Block]           │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ Practice Squad Eligible (10 spots):        │
    │   │ • Jake Smith (WR) - Consider stashing     │
    │   │                                             │
    │   │ [Auto-Cut to 53]   [Manual Cuts]          │
    │   └─────────────────────────────────────────────┘
    │
    └─ PHASE 12: SEASON START
        ┌─────────────────────────────────────────────┐
        │ 🏈 READY FOR KICKOFF                       │
        │                                             │
        │ Your 2025 Dallas Cowboys are ready!        │
        │                                             │
        │ OFFSEASON GRADES:                          │
        │ • Draft: A- (Jared Verse was a steal)     │
        │ • Free Agency: B+ (Filled EDGE need)      │
        │ • Development: A (Tyler Smith breakout)   │
        │                                             │
        │ Season Prediction: 10-7, Wild Card        │
        │                                             │
        │ Week 1: vs NYG (Rival Game!)              │
        │                                             │
        │ [★ START SEASON ★]                        │
        └─────────────────────────────────────────────┘
```

**Key UX Rules**:
- Progress bar always visible (which phase, how many left)
- Each phase has ONE primary action
- "Skip" or "Auto" options for casual players
- Meaningful choices with trade-offs
- Development reveals create anticipation
- Final cuts use AI recommendations to reduce burden
- Celebration when season begins

---

### Flow 5: Career Progression & Job Security

```
JOB SECURITY SYSTEM
    │
    │   DASHBOARD JOB SECURITY METER
    │   ┌─────────────────────────────────────────────┐
    │   │ Job Security: ████████░░ 78%               │
    │   │ Status: STABLE                             │
    │   │                                             │
    │   │ Owner Expectations:                        │
    │   │ ✓ Make playoffs (on track)                │
    │   │ ○ Win Super Bowl (not yet)                │
    │   │ ✓ Develop young talent                    │
    │   └─────────────────────────────────────────────┘
    │
    │   SECURITY LEVELS:
    │   ├─ 80-100%: SECURE (Green) - Owner loves you
    │   ├─ 60-79%:  STABLE (Blue) - Meeting expectations
    │   ├─ 40-59%:  WARM SEAT (Yellow) - Underperforming
    │   ├─ 20-39%:  HOT SEAT (Orange) - On thin ice
    │   └─ 0-19%:   DANGER (Red) - About to be fired
    │
    │   FIRING TRIGGER
    │   ┌─────────────────────────────────────────────┐
    │   │ ⚠️ OWNER MEETING                           │
    │   │                                             │
    │   │ Jerry Jones has called you into his office.│
    │   │                                             │
    │   │ "We expected better. You've had three years│
    │   │ and we haven't won a playoff game. It's    │
    │   │ time for a change."                        │
    │   │                                             │
    │   │ YOU HAVE BEEN FIRED.                       │
    │   │                                             │
    │   │ Career with Cowboys:                       │
    │   │ • Tenure: 3 seasons                        │
    │   │ • Best Record: 11-6 (Year 2)              │
    │   │ • Playoff Wins: 0                         │
    │   │                                             │
    │   │ [View Career Summary]   [Find New Job]    │
    │   └─────────────────────────────────────────────┘
    │
    │   JOB MARKET (After Firing)
    │   ┌─────────────────────────────────────────────┐
    │   │ 💼 GM JOB MARKET                           │
    │   │                                             │
    │   │ Your Resume:                               │
    │   │ • Experience: 3 years                      │
    │   │ • Best Finish: NFC Championship           │
    │   │ • GM Rating: B-                           │
    │   │                                             │
    │   │ AVAILABLE POSITIONS:                       │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ 🏈 Chicago Bears                        │ │
    │   │ │ Difficulty: ★★★★☆                      │ │
    │   │ │ Cap Space: $55M • Young QB             │ │
    │   │ │ [Apply]                                 │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │ ┌─────────────────────────────────────────┐ │
    │   │ │ 🏈 Las Vegas Raiders                    │ │
    │   │ │ Difficulty: ★★★★★                      │ │
    │   │ │ Cap Space: $12M • Rebuilding           │ │
    │   │ │ [Apply]                                 │ │
    │   │ └─────────────────────────────────────────┘ │
    │   │                                             │
    │   │ [Retire from NFL]                          │
    │   └─────────────────────────────────────────────┘
    │
    │   CAREER LEGACY (Retirement)
    │   ┌─────────────────────────────────────────────┐
    │   │ 🏆 CAREER LEGACY                           │
    │   │                                             │
    │   │ YOUR GM CAREER                             │
    │   │ ─────────────────────────────────────────── │
    │   │                                             │
    │   │ Total Seasons: 12                          │
    │   │ Teams: Cowboys (3), Bears (5), 49ers (4)  │
    │   │                                             │
    │   │ Achievements:                              │
    │   │ 🏆 Super Bowl Champion (2028 Bears)       │
    │   │ 🥈 Super Bowl Runner-Up (2031 49ers)      │
    │   │ ⭐ 3x Executive of the Year              │
    │   │ 📈 5 Playoff Appearances                  │
    │   │                                             │
    │   │ Career Win %: 58.3%                        │
    │   │ Draft Hits: 12 Pro Bowlers                │
    │   │                                             │
    │   │ HALL OF FAME ELIGIBLE                     │
    │   │                                             │
    │   │ [Start New Career]   [View Hall of Fame]  │
    │   └─────────────────────────────────────────────┘
```

**Key UX Rules**:
- Job security always visible on dashboard
- Clear expectations from owner
- Firing is dramatic but not punishing (you can continue)
- Multiple teams = extended replayability
- Hall of Fame = ultimate goal for completionists

---

## Screen-by-Screen Specifications

### Dashboard (Hub Screen)

**Purpose**: Single point of truth for "what should I do next?"

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ [Settings]              🏈 COWBOYS           [News] │
├─────────────────────────────────────────────────────┤
│                                                     │
│                    RECORD: 8-4                      │
│                    2nd in NFC East                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │                                             │   │
│   │         [★ PRIMARY ACTION ★]               │   │
│   │         "Play Week 14 @ Bills"             │   │
│   │                                             │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   Quick Links:                                      │
│   [Roster]  [Depth Chart]  [Schedule]  [Standings] │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   Job Security: ████████░░ 78% STABLE              │
│   Cap Space: $12.4M                                │
│                                                     │
│   Latest News:                                      │
│   • Dak Prescott questionable (ankle)              │
│   • Trade deadline approaching                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Interaction Rules**:
- Primary action button is ALWAYS visible
- Tapping quick links opens respective screens
- News items are tappable for details
- Swipe left = schedule, swipe right = roster (optional gesture)

---

### Player Card (Reusable Component)

**Compact Mode** (list item):
```
┌─────────────────────────────────────────────────────┐
│ [POS]  PLAYER NAME                    OVR   STATUS │
│  QB    Dak Prescott                   88    ⚠️ Q   │
│        Age 31 • $40M/yr • 2 yrs left              │
└─────────────────────────────────────────────────────┘
```

**Expanded Mode** (detail view):
```
┌─────────────────────────────────────────────────────┐
│                    [Back]                          │
│                                                     │
│            ┌─────────┐                             │
│            │  📸     │  DAK PRESCOTT              │
│            │ Avatar  │  QB • #4 • Age 31          │
│            └─────────┘                             │
│                                                     │
│   OVERALL: ████████████████░░░░ 88                │
│   Tier: ELITE (Gold)                              │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ATTRIBUTES                                         │
│                                                     │
│ Throw Power:  ████████████████░░░░ 92             │
│ Accuracy:     ███████████████░░░░░ 89             │
│ Speed:        ██████████░░░░░░░░░░ 74             │
│ Awareness:    ████████████████░░░░ 91             │
│                                                     │
├─────────────────────────────────────────────────────┤
│ TRAITS                                             │
│ [Clutch] [Field General] [Strong Arm]             │
│                                                     │
├─────────────────────────────────────────────────────┤
│ CONTRACT                                           │
│ $40M/yr • 2 years remaining • $25M guaranteed     │
│                                                     │
│ [Restructure]  [Trade]  [Cut]                     │
└─────────────────────────────────────────────────────┘
```

---

### Draft Room (Complex Screen)

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ NFL DRAFT - ROUND 1                    [Exit Draft]│
├─────────────────────────────────────────────────────┤
│                                                     │
│   ON THE CLOCK: DALLAS COWBOYS                     │
│   ⏱️ 2:34 remaining          Pick #24             │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   [Big Board]  [Team Needs]  [Trade]  [Auto-Pick] │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   BEST AVAILABLE:                                  │
│   ┌─────────────────────────────────────────────┐  │
│   │ 🔥 Jared Verse  EDGE  92 OVR  NEED: ★★★★★  │  │
│   │     [DRAFT]         [View Profile]          │  │
│   └─────────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────────┐  │
│   │    Cooper DeJean  CB   90 OVR  NEED: ★★★★  │  │
│   │     [DRAFT]         [View Profile]          │  │
│   └─────────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────────┐  │
│   │    Brock Bowers   TE   91 OVR  NEED: ★★    │  │
│   │     [DRAFT]         [View Profile]          │  │
│   └─────────────────────────────────────────────┘  │
│                                                     │
├─────────────────────────────────────────────────────┤
│   TRADE OFFER:                                     │
│   🔔 Raiders want to trade up!                    │
│   Offer: Pick 32 + Pick 64 + 2025 2nd            │
│   [View Offer]                                     │
└─────────────────────────────────────────────────────┘
```

**Interaction Rules**:
- Timer prominent and always visible
- "NEED" rating shows team fit
- One-tap draft with confirmation modal
- Trade offers create urgency notification
- Auto-pick available for casual players

---

## Design System

### Colors

```typescript
export const colors = {
  // Primary Palette
  primary: '#1a365d',        // NFL Blue - headers, primary buttons
  secondary: '#c05621',      // Orange - accents, warnings
  accent: '#805ad5',         // Purple - highlights, special items

  // Backgrounds
  background: '#f7fafc',     // Light gray - screen background
  surface: '#ffffff',        // White - card backgrounds
  surfaceHover: '#edf2f7',   // Hover state

  // Text
  textPrimary: '#1a202c',    // Near black - primary text
  textSecondary: '#4a5568',  // Gray - secondary text
  textMuted: '#a0aec0',      // Light gray - disabled/muted

  // Status
  success: '#38a169',        // Green - positive actions
  warning: '#d69e2e',        // Yellow - caution
  error: '#e53e3e',          // Red - errors, danger
  info: '#3182ce',           // Blue - informational

  // Rating Tiers
  tierElite: '#FFD700',      // Gold - 90+
  tierExcellent: '#50C878',  // Emerald - 80-89
  tierGood: '#4169E1',       // Sapphire - 70-79
  tierAverage: '#A0A0A0',    // Silver - 60-69
  tierBelow: '#CD7F32',      // Bronze - 50-59
  tierPoor: '#8B0000',       // Dark Red - <50

  // Position Groups
  offense: '#1a365d',        // Blue
  defense: '#c05621',        // Orange
  specialTeams: '#805ad5',   // Purple
};
```

### Typography

```typescript
export const typography = {
  // Font Sizes
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  display: 28,
  hero: 36,

  // Font Weights
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',

  // Line Heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};
```

### Spacing

```typescript
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};
```

### Touch Targets

**CRITICAL**: All interactive elements must be at least 44x44 points.

```typescript
export const touchTarget = {
  minSize: 44,
  padding: spacing.md,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
};
```

---

## Interaction Patterns

### Button States

```
Normal:     Background filled, text white
Hover:      10% darker background
Pressed:    20% darker background, slight scale down (0.98)
Disabled:   50% opacity, no interaction
Loading:    Spinner replaces text, disabled
```

### Transitions

```typescript
export const transitions = {
  fast: 150,      // Button press, toggle
  normal: 250,    // Screen fade, modal open
  slow: 400,      // Page transition, celebration
};
```

### Feedback Patterns

```
Success:    Green toast + haptic (light)
Error:      Red toast + haptic (medium) + shake animation
Warning:    Yellow toast
Info:       Blue toast
Major Win:  Full screen celebration + confetti + haptic (heavy)
```

### Loading States

```
Initial Load:    Skeleton screens (shimmer effect)
Data Refresh:    Pull-to-refresh spinner
Action Pending:  Button loading spinner
Background:      No visible indicator (silent)
```

---

## Production Checklist

### Pre-Launch (P0 - Must Have)

- [ ] **Accessibility**
  - [ ] All touch targets >= 44x44 points
  - [ ] All interactive elements have accessibilityLabel
  - [ ] Color contrast ratio >= 4.5:1
  - [ ] Screen reader testing (VoiceOver, TalkBack)
  - [ ] No color-only status indicators

- [ ] **Stability**
  - [ ] No crashes in happy path flows
  - [ ] Error boundaries on all screens
  - [ ] Graceful degradation for network issues
  - [ ] Save game corruption prevention

- [ ] **Core Flows**
  - [ ] New game setup works
  - [ ] Weekly progression works
  - [ ] All 12 offseason phases work
  - [ ] Playoffs and Super Bowl work
  - [ ] Firing/hiring works

### Launch (P1 - Should Have)

- [ ] **Performance**
  - [ ] Screen transitions < 300ms
  - [ ] FlatList virtualization
  - [ ] Memoization on expensive components
  - [ ] Save file size < 50MB after 10 seasons

- [ ] **UX Polish**
  - [ ] Loading states on async screens
  - [ ] Empty states with guidance
  - [ ] Navigation breadcrumbs
  - [ ] Onboarding tutorial

- [ ] **Analytics**
  - [ ] Screen view tracking
  - [ ] Event tracking (draft picks, wins, etc.)
  - [ ] Error tracking (Sentry)
  - [ ] Crash reporting

### Post-Launch (P2 - Nice to Have)

- [ ] **Engagement**
  - [ ] Push notifications
  - [ ] Daily/weekly challenges
  - [ ] Achievements system
  - [ ] Social sharing

- [ ] **Retention**
  - [ ] Dynasty mode (endless play)
  - [ ] Hall of Fame tracking
  - [ ] Multiple save slots (expand to 5)
  - [ ] Cloud sync

- [ ] **Monetization** (if applicable)
  - [ ] Premium features
  - [ ] No pay-to-win mechanics
  - [ ] Ad-free option

---

## Appendix: Screen Inventory

| Screen | Priority | Status | Notes |
|--------|----------|--------|-------|
| StartScreen | P0 | ✅ | Entry point |
| TeamSelectionScreen | P0 | ✅ | Team picker |
| GMDashboardScreen | P0 | ✅ | Main hub |
| RosterScreen | P0 | ✅ | Player list |
| DepthChartScreenV2 | P1 | ✅ | Position management |
| ScheduleScreen | P0 | ✅ | Season calendar |
| StandingsScreen | P0 | ✅ | League standings |
| LiveGameSimulationScreen | P0 | ✅ | Game sim |
| PostGameSummaryScreen | P0 | ✅ | Results |
| DraftRoomScreen | P0 | ✅ | Draft interface |
| FreeAgencyScreen | P0 | ✅ | FA market |
| OffseasonScreen | P0 | ✅ | Phase manager |
| CareerSummaryScreen | P1 | ✅ | Career stats |
| TradeScreen | P1 | ✅ | Trade proposals |
| FinancesScreen | P1 | ✅ | Cap management |
| NewsScreen | P2 | ✅ | News feed |
| SettingsScreen | P1 | ✅ | App settings |

---

*Last Updated: January 2026*
*Version: 1.0.0*
