# Code Review — Dead Code Cleanup + SQLite Local Dev + Leaderboard Audit

| Field | Value |
|-------|-------|
| **Date** | 260325 (v2) |
| **Reviewer** | NamVu — AI + 4-Eyes |
| **Scope** | Dead code cleanup, SQLite dev profile, Leaderboard API audit |
| **Files Changed** | `app/internal-sport/src/services/playerApi.ts`, `package.json` |

---

## Code Score: **90/100** ✅

---

## Changes Overview

### 1. Dead Code Cleanup (playerApi.ts)
Deprecated functions and helper code commented out — NOT deleted — per project convention.

| Function | Status | Reason |
|----------|--------|--------|
| `getAvailable()` | ✅ Commented | Replaced by `getAvailableFromView()` |
| `getUpcoming()` | ✅ Commented | `UpcomingKickoffTable` is commented out |
| `getCompleted()` | ✅ Commented | Replaced by `getCompletedPaged()` |
| `getExactScoreMatches()` | ✅ Commented | No callers found |
| `playerLeaderboardApi.getAll()` | ✅ Commented | No callers found |
| `toMatch()` | ✅ Commented | Only used by `getAvailable()` |
| `toUpcomingMatch()` | ✅ Commented | Only used by `getUpcoming()` |
| `toExactScoreMatch()` | ✅ Commented | Only used by `getExactScoreMatches()` |
| `toLeaderboardEntry()` | ✅ Commented | Only used by `getAll()` |
| `toUnresolvedSlotMatch()` | ✅ Commented | Only used by `getAvailable()` |
| `resolveUnresolvedTeamName()` | ✅ Commented | Only used by `toUnresolvedSlotMatch()` |
| `KNOCKOUT_STAGES` | ✅ Commented | Only used by `getAvailable()` |
| `STAGE_ORDER` | ✅ Commented | Only used by `getStageRank()` |
| `getStageRank()` | ✅ Commented | Only used by `getAvailable()` |
| `getKickoffRank()` | ✅ Commented | Only used by `getAvailable()` |

**Preserved (still active):**
- `toLiveMatch()` — used by `getLive()`
- `mapPickToSelectedOption()` — used by `getAvailableFromView()` + `getLive()`
- `formatStageLabel()` — used by `getAvailableFromView()`
- `isKickoffPast()` — used by `getAvailableFromView()`
- `STAGE_LABEL` — used by `formatStageLabel()`
- `fetchPlayerDataForMatches()` — still used by `getLive()`

### 2. Leaderboard Audit
**Finding: Already optimal ✅**

The `LeaderboardSection.tsx` calls `playerLeaderboardApi.getByTournament()` which hits `PredictionLeaderboard` — this is **already a CDS view** (registered as `READ` handler in `service.ts`, materialized in `PredictionHandler.readPredictionLeaderboard()`). No function/action involved, pure OData GET on a view.

| Method | Endpoint | Type | Status |
|--------|----------|------|--------|
| `getByTournament()` | `PredictionLeaderboard` | CDS View + OData GET | ✅ Already optimal |
| `getAll()` | `Leaderboard` | Old projection | ✅ Deprecated (no callers) |

### 3. SQLite Local Development Profile
Added `[development]` profile with SQLite so views can be tested locally.

```json
"[development]": {
  "db": {
    "kind": "sqlite",
    "credentials": { "database": "db.sqlite" }
  }
}
```

New scripts:
- `npm run start:local` — CDS watch + Vite dev (SQLite, auto-reload)
- `npm run start:local:stable` — CDS serve + Vite dev (SQLite, no auto-reload)

---

## Actionable Findings

### 🟡 WARNING

#### W1. `fetchPlayerDataForMatches()` still alive (pending getLive optimization)
- **Where**: `playerApi.ts` line 645
- **Issue**: `getLive()` still calls `fetchPlayerDataForMatches()` for 4 sub-requests (MyPredictions, MyScoreBets, MySlotPredictions, MySlotScoreBets). This can be optimized later with a `LiveMatchesView`.
- **Verdict**: Acceptable — live matches are a small set (0-4 typically). Low impact.

#### W2. `TournamentLeaderboardWidget.tsx` unused component
- **Where**: `app/internal-sport/src/pages/sport/components/TournamentLeaderboardWidget.tsx`
- **Issue**: Not imported anywhere. Could be cleaned up.
- **Verdict**: Minor — doesn't affect API calls or build size (tree-shaked out).

### 🔵 LOW

#### L1. SharedPlayerData interface still exported
- **Where**: `playerApi.ts` line 634
- **Issue**: `SharedPlayerData` interface is still exported but only used internally by `fetchPlayerDataForMatches`. Could be made private.
- **Verdict**: Cosmetic only.

---

## Principles Summary

| Principle | Status | Notes |
|-----------|--------|-------|
| **S** — Single Responsibility | ✅ Pass | Each deprecated section clearly marked with reason |
| **O** — Open/Closed | ✅ Pass | No existing behavior modified |
| **L** — Liskov Substitution | ✅ Pass | N/A for this changeset |
| **I** — Interface Segregation | ✅ Pass | Unused imports commented out |
| **D** — Dependency Inversion | ✅ Pass | N/A |
| **DRY** | ✅ Pass | Eliminated duplicate getCompleted (paged version exists) |
| **YAGNI** | ✅ Pass | Dead code properly marked as deprecated |
| **KISS** | ✅ Pass | SQLite config is minimal — just `kind` + `database` |

---

## Verdict: **PASS** ✅

- Score: **90/100** (≥80 threshold met)
- Critical issues: **0** 🔴
- Warnings: **2** 🟡 (both low-impact, scheduled for future)
- Low: **1** 🔵

### Net Impact

```
playerApi.ts: 1266 lines → 937 lines (-329 lines, -26%)
  └─ Deprecated: ~250 lines of function bodies
  └─ Deprecated: ~80 lines of helper functions/constants
  └─ Active helpers preserved (toLiveMatch, formatStageLabel, etc.)

package.json: +11 lines (SQLite profile + 2 scripts)
```
