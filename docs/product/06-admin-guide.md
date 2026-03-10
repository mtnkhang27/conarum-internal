# Admin Guide — Conarum Prediction

> **Version:** 1.0 | **Last Updated:** 2026-02-25

---

## 1. Admin Panel Overview

The Admin Panel provides complete control over the prediction platform. Only users with the **Admin** role can access these pages.

### Admin Navigation

| Page | What You Do |
|------|-------------|
| **Match Management** | Create, edit, delete matches. Enter final scores. |
| **Team Management** | Manage team roster (name, flag, confederation) |
| **Player Management** | View/manage registered players, track activity |
| **Tournament Management** | Create tournaments, set dates, manage status |
| **UC Config Dashboard** | Toggle use cases on/off, overview of all configs |
| **UC1: Score Prediction Config** | Set pricing, rewards, multipliers for exact score |
| **UC2: Match Outcome Config** | Set points, weights, prizes, tie-breaks, bonuses |
| **UC3: Champion Config** | Control betting status, dates, champion prizes |

---

## 2. Daily Operations

### Match Day Workflow

```
1. Before Match Day
   ├── Create matches in Match Management
   ├── Assign weight (1x-5x) based on importance
   └── Verify match details (teams, date, time, venue)

2. During Match
   ├── Monitor that auto-lock is working
   └── Check no late submissions got through

3. After Match
   ├── Wait for official final score
   ├── Enter result: Match Management → Edit → Enter Score
   ├── System auto-calculates points after delay (default: 2h)
   └── Verify leaderboard updated correctly
```

### Weekly Tasks

- Review leaderboard for anomalies
- Check for any support requests from players
- Update upcoming match schedule
- Verify bonuses applied correctly (Perfect Week, Win Streaks)

### End of Tournament

1. Enter final match result
2. Lock all remaining predictions
3. Export final leaderboard
4. Announce winners
5. Distribute prizes manually
6. Close UC3 (Champion Prediction) status → "Closed"

---

## 3. Use Case 1 Configuration — Exact Score

### Key Settings

| Setting | Default | Range | Notes |
|---------|---------|-------|-------|
| Enable | ✅ On | — | Toggle entire UC1 |
| Max Bets per Match | 3 | 1–10 | How many scores a user can guess |
| Base Price (VND) | 50,000 | — | Cost per bet |
| Base Reward (VND) | 200,000 | — | Payout for correct score |
| Allow Duplicate Bets | ✅ Yes | — | Same score multiple times |
| Duplicate Multiplier | 2x | 1–10x | Reward multiplier for duplicates |
| Bonus Multiplier | 1.5x | 1–5x | Extra multiplier for special matches |
| Platform Fee | 5% | 0–20% | Deducted from winnings |
| Lock Before Match | 30 min | 0–120 min | Stop bets X min before kickoff |
| Payout Delay | 24h | 0–72h | Wait before paying out (for corrections) |

### Reward Formula

```
Payout = BaseReward × DupMultiplier × BonusMultiplier × (1 − Fee/100)
```

**Example:** 2 bets on same score (2-1), correct, finals match:
```
= 200,000 × 2 × 1.5 × (1 − 0.05) = 570,000 VND
```

---

## 4. Use Case 2 Configuration — Match Outcome ⭐

### Point System

| Prediction Result | Base Points | Configurable? |
|-------------------|-------------|---------------|
| Correct | 3 pts | ✅ (0–10) |
| Draw/Partial | 1 pt | ✅ (0–10) |
| Wrong | 0 pts | ✅ (-5 to +5) |

### Match Weights

> [!IMPORTANT]
> Assign weights carefully — they **multiply** the base points. A Final match with weight 5x means a correct pick is worth 15 points instead of 3.

| Category | Default Weight | When to Use |
|----------|---------------|-------------|
| Regular | 1x | Group stage matches |
| Important | 2x | Decisive group matches, rivalry games |
| Semi-Final | 3x | Semi-final round |
| Final | 5x | Championship final |

### Bonus Points

| Bonus | Points | How It Works |
|-------|--------|-------------|
| Perfect Week | +5 | All predictions correct in a calendar week |
| Consecutive Wins | +2 per streak | Extra points per each consecutive correct prediction |

### Prize Tiers

> [!CAUTION]
> Prizes are configured here but **distributed manually by admin** after the tournament ends.

| Rank | Default Prize | Default Value |
|------|--------------|---------------|
| 🥇 1st | iPhone 15 Pro Max | 35,000,000 VND |
| 🥈 2nd | Honda Vision 2024 | 30,000,000 VND |
| 🥉 3rd | MacBook Air M3 | 25,000,000 VND |
| 4th–13th | Cash consolation | 500,000 VND each |

### Calculation Settings

| Setting | Default | Notes |
|---------|---------|-------|
| Auto Calculate | ✅ On | Automatically score after match result entered |
| Calc Delay | 2h | Wait for potential score corrections |
| Tie-Break Rule | Head-to-Head | Options: H2H, Goal Diff, Total Correct, Earliest Join |
| Show Live Ranking | ✅ On | Let users see real-time leaderboard |
| Update Interval | 5 min | How often leaderboard refreshes |

---

## 5. Use Case 3 Configuration — Champion Prediction

### Betting Status Control

| Status | Meaning | When |
|--------|---------|------|
| 🟢 **Open** | Accepting predictions | Before tournament |
| 🟡 **Locked** | No new predictions | Tournament in progress |
| 🔴 **Closed** | Tournament ended | After final match |

> [!WARNING]
> Status changes take effect **immediately**. Double-check before changing.

### Timeline Configuration

| Date | Default | Purpose |
|------|---------|---------|
| Open Date | June 1 | When predictions become available |
| Lock Date | June 14 | Deadline for submissions |
| Close Date | July 14 | Tournament end date |
| Change Deadline | June 10 | Last day to modify a prediction |

### Prize Settings

| Prize | Default | Notes |
|-------|---------|-------|
| Grand Prize | iPhone 15 Pro Max 256GB | For correct champion prediction |
| 2nd Prize | iPad Pro 12.9" | Random draw among correct guessers |
| 3rd Prize | AirPods Pro 2 | Random draw among correct guessers |

### Multiple Winners

| Setting | Default | Notes |
|---------|---------|-------|
| Split Prize if Tie | ✅ On | Divide grand prize among winners |
| Max Winners to Split | 5 | Cap on prize splitting |
| Cash Alternative | ✅ On | Winners can choose 30M VND instead |

### Notifications

| Notification | Default | Notes |
|-------------|---------|-------|
| Predictions Open | ✅ On | Notify when UC3 opens |
| Before Lock | ✅ On | Reminder before deadline |
| Hours Before Lock | 24h | When to send reminder |
| On Tournament Result | ✅ On | Winner announcement |

---

## 6. Match Management

### Creating a Match

1. Go to **Match Management**
2. Click **Add Match**
3. Fill in:
   - Home Team (from team roster)
   - Away Team (from team roster)
   - Tournament
   - Date & Time
   - Venue
   - Weight (1x–5x based on importance)
4. Click **Create Match**

### Entering Match Results

> [!IMPORTANT]
> This is the **most critical admin action**. Incorrect results will miscalculate all user points.

1. Go to **Match Management**
2. Find the finished match
3. Click **Edit**
4. Enter the final score (Home Score : Away Score)
5. Change status to **Finished**
6. Click **Update** → System auto-scores all predictions

### Result Correction

If a wrong score was entered:
1. Edit the match → correct the score
2. System will recalculate all affected predictions
3. Leaderboard updates automatically
4. (Delay buffer exists: default 2 hours before payout for UC1)

---

## 7. Player Management

### Viewing Players

The Player Management page shows:
- Registered employees
- Total predictions made
- Points accumulated
- Last active date

### Actions

| Action | Description |
|--------|-------------|
| View Details | See all predictions made by a player |
| Deactivate | Temporarily disable a player's account |
| Export | Download player data for reporting |

---

## 8. Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| User can't submit prediction | Match already kicked off | Auto-lock working correctly. No action needed. |
| Leaderboard not updating | Calculation delay active | Wait for delay period (default 2h). Or manually trigger recalculation. |
| Wrong score entered | Human error | Edit match, correct score. System auto-recalculates. |
| Duplicate prediction slip entries | User submitted multiple times | System deduplicates. Check DB for unique constraint. |
| UC3 still "Open" during tournament | Admin forgot to lock | Go to UC3 Config → Change status to "Locked". |
| Prize split calculation wrong | Max winners exceeded | Check `maxWinnersForSplit` setting. |
