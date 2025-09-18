# Feature Specification: Friends Betting App with Pari-Mutuel Odds

**Feature Branch**: `001-bettingapp-f-r`  
**Created**: 2025-09-16  
**Status**: Ready  
**Input**: 
- Original description (Swedish) plus clarified rules:
  - Friends-only pari-mutuel betting; house is never liable.
  - Bets placed at any time use final odds set at close.
  - Admin sets countdown/end time; auto-closes; final odds fixed at close.
  - Admin can correct bet amounts only while betting is open.
  - Participant withdrawal refunds those bets. Post-close handling defined below.
  - Exactly one winner per sub-competition.
  - Head-to-head can be Win/Loss or Win/Draw/Loss.
  - One admin per event; bettors join via join code.
  - Admin can name the unit and set min/max bet.
  - In-app notifications and two-sided settlement confirmations.
  - Username/password login; non-monetary units only.

## Execution Flow (main)
```
1. Parse user description from Input
    → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
    → Identify: actors, actions, data, constraints
3. For each unclear aspect:
    → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
    → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
    → Each requirement must be testable
    → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
    → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
    → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## User Scenarios & Testing (mandatory)

### Primary User Story
As an event organizer (admin), I create a private betting event for a friendly competition (e.g., a golf match among friends), name the event and its sub-competitions (e.g., “Golftävling dag 6”), define the unit name and min/max stake rules, choose allowed outcomes, add/remove players, set a betting countdown, and share a join code. Bettors log in with username/password, join via the code, and place unit bets while betting is open. Provisional odds update as pools change, but only the final odds at close matter. If a participant withdraws before results are posted, bets on that participant are refunded. Admin records the single winning outcome. The app computes payouts from the net pool (house never liable), generates a “who owes whom” settlement, sends notifications, and requires both payer “sent” and payee “received” confirmations. The event shows settlement status to all participants.

### Acceptance Scenarios
1. Create event with unit and constraints
   - Given I am logged in as an admin
   - When I create an event, set unit name (e.g., “Godisbilar”), set house cut (0–100%; default 0%), and min/max stake per bet (integer units)
   - Then the system creates the event, generates a unique join code, and shows configured rules.

2. Configure sub-competition outcomes
   - Given an event exists
   - When I create a sub-competition and choose allowed outcomes
     - Multi-participant: exactly one winning participant
     - Head-to-head: Win/Loss or Win/Draw/Loss
   - Then bettors see the available outcomes accordingly.

3. Open betting with countdown and finalization
   - Given a sub-competition is in draft
   - When the admin sets an end time (with visible countdown) and opens betting
   - Then bettors with the join code can place bets until the countdown ends; provisional odds update; at close, betting stops and final odds are fixed.

4. Place and correct a bet
   - Given betting is open
   - When I place a bet within min/max in the configured unit
   - Then my bet is recorded, attributed to me, and provisional odds update.
   - And if the admin edits my bet amount (with reason) before betting closes, the change is saved, I am notified, and pools/odds update.

5. Participant withdrawal
   - Given a participant withdraws before the result is posted
   - When the admin marks the participant as withdrawn
   - Then all bets on that participant are refunded; if before close, pools/odds re-normalize; if after close:
     - If at least two outcomes remain, payouts are computed on remaining outcomes with re-normalized final odds.
     - If only one outcome remains, the sub-competition is canceled and all bets are refunded.

6. Record result and compute settlements
   - Given betting is closed
   - When the admin records the single winning outcome
   - Then payouts are computed from the net pool (after house cut), ledgers are updated, and who-owes-whom obligations are generated.

7. Notify and confirm settlements
   - Given obligations exist
   - When the system notifies each payer “You owe N [unit] to X”
   - Then the payer marks “sent” and the payee confirms “received”; once both confirm, the obligation is settled and green-highlighted in the event summary visible to all.

8. Cross-event summary
   - Given I have participated in many events
   - When I open my summary and select a date range
   - Then I see cumulative wins/losses and net settled/unsettled positions.

### Edge Cases
- Invalid/expired join code → clear error, no access.
- Attempt to bet after close → rejected with reason.
- Bet below min or above max → rejected with validation.
- Admin attempts to correct a bet after close → not allowed.
- Withdrawal after close leaving one outcome → cancel sub-competition and refund all bets.
- Rounding: display odds to 2 decimals; settle amounts to nearest 0.01 unit with largest-remainder reconciliation to conserve the net pool exactly.
- Timezone: event has a timezone; countdowns display consistently; close time is server-authoritative.
- Notifications delivery failure → retries and in-app inbox; status visible in event.
- Authentication failures and password reset → rate-limited self-service reset flow.

## Requirements (mandatory)

### Functional Requirements
- FR-001: The system MUST allow users to register and log in with username and password.
- FR-002: The system MUST allow an authenticated user to create a new private event and configure:
  - Event name/title
  - Unit display name (e.g., “Godisbilar”)
  - House cut percentage (0–100%; default 0% → 100% pool payout)
  - Bet constraints: integer min and max units per bet (inclusive)
- FR-003: The system MUST enforce exactly one admin per event; only the admin can change event settings, rosters, betting windows, and results.
- FR-004: The system MUST generate a unique join code per event and allow users with the code to join while the event is active.
- FR-005: The system MUST allow admins to create and name sub-competitions within an event.
- FR-006: The system MUST allow admins to add, edit, and remove participants for each sub-competition.
- FR-007: The system MUST allow admins to configure allowed outcomes per sub-competition:
  - Multi-participant: exactly one winning participant
  - Head-to-head: Win/Loss or Win/Draw/Loss
- FR-008: The system MUST compute pari-mutuel implied odds and:
  - Display decimal odds to 2 decimal places during betting (provisional)
  - Fix final odds from the pool snapshot at the exact close time; odds at bet time do not lock
- FR-009: The system MUST allow the admin to open betting by setting an explicit end time (visible countdown shown to all), support manual early close, and prohibit reopening once closed.
- FR-010: The system MUST enable bettors to place bets in integer units on a selected participant/outcome while betting is open; enforce min/max rules.
- FR-011: The system MUST attribute each bet to the bettor (who/what/when) and maintain an audit trail of changes.
- FR-012: The system MUST allow the admin to edit/correct a bettor’s bet amount with a required reason only while betting is open; notify the affected bettor; update pools/odds accordingly.
- FR-013: The system MUST support participant withdrawal prior to result entry:
  - Refund all bets on the withdrawn participant
  - If before close: re-normalize pools/odds over remaining participants/outcomes
  - If after close and ≥2 outcomes remain: settle over remaining outcomes with re-normalized odds
  - If after close and only 1 outcome remains: cancel the sub-competition and refund all bets
  - Notify affected bettors
- FR-014: The system MUST allow the admin to record exactly one winning outcome per sub-competition.
- FR-015: Upon result entry, the system MUST calculate payouts pari-mutuel from the net pool (total pool minus house cut) and update each bettor’s ledger; the house MUST never be liable for a deficit.
- FR-016: The system MUST produce a settlement plan (“who owes whom”) that minimizes pairwise transfers and reflects each user’s net position within the event.
- FR-017: The system MUST send in-app notifications: bet corrected, betting closed, results posted, settlement created, payer marked “sent,” payee “received.”
- FR-018: The system MUST present an event-level settlement summary visible to all event participants showing obligations and statuses; settled items are clearly marked (e.g., green).
- FR-019: The system MUST provide per-user statements per sub-competition/event showing stake, final-odds basis, pool share, house cut, and net result.
- FR-020: The system MUST maintain cross-event summaries of wins/losses and net settled/unsettled positions per user, filterable by date range.
- FR-021: The system MUST prevent any bets after betting is closed and provide clear feedback.
- FR-022: The system MUST provide an audit trail for admin actions (roster changes, bet edits, betting window changes, results, withdrawals, cancellations).
- FR-023: The system MUST define rounding/precision rules:
  - Internal calculations at ≥1e-6 precision
  - Display odds to 2 decimals
  - Settlement amounts rounded to nearest 0.01 unit
  - Use largest-remainder method to reconcile rounding so totals equal the net pool
- FR-024: The system MUST allow export of event-level settlement summaries in CSV and JSON formats.
- FR-025: The system MUST handle invalid/expired join codes gracefully with clear errors.
- FR-026: The system MUST treat units as non-monetary (no real-money processing); settlements are user-to-user acknowledgments only; no payment integrations.
- FR-027: The system MUST support an event timezone setting; countdowns and close times are displayed consistently to all users based on the event timezone and enforced by server time.
- FR-028: The system SHOULD provide a polished, accessible UI/UX suitable for non-technical users (clear navigation, readable odds, accessible forms).

### Key Entities (include if feature involves data)
- User: username, display name, credentials; relationships: creates events, places bets, owes/is owed settlements.
- Event: name, unit name, house cut %, min/max settings, join code, admin (single), status, timezone, audit log.
- Sub-Competition: name, allowed outcomes, betting window (end time/countdown), status (draft/open/closed/canceled/settled), participants.
- Participant: name, status (active/withdrawn), notes; belongs to sub-competition roster.
- Bet: bettor, participant/outcome, stake units, timestamp, status (active/edited/refunded), audit entries.
- Pool: per sub-competition aggregated stakes by participant/outcome and totals; final snapshot at close; adjusted snapshot if post-close withdrawals occur.
- Payout: results-based distribution from net pool; amount per bettor; house cut amount; rounding reconciliation data.
- Ledger Entry: credit/debit per user from settlement; references event/sub-competition.
- Settlement Obligation: payer, payee, amount, status (pending/sent/received/settled), timestamps; two-sided confirmations.
- Notification: user-targeted message with type and status.
- Join Code: value, creation/expiry, usage rules.

---

## Review & Acceptance Checklist
GATE: Automated checks run during main() execution

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
Updated by main() during processing

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

