# Friends Betting App — Mobile UI/UX Blueprint

## Vision & Experience Goals
- **World-class social wagering companion** tailored for friends hosting casual competitions.
- **Trustworthy financial interactions** with transparent odds, payouts, and history.
- **Effortless collaboration** so organizers, participants, and bettors move between roles seamlessly.
- **Mobile-first clarity** designed for quick glances on the course, at the clubhouse, or on the go.

## Design Principles
1. **Clarity over clutter** – prioritize what users need in the moment; progressive disclosure for advanced controls.
2. **Conversational tone** – microcopy that feels like a friend guiding you; align with celebratory, sports-centric vibe.
3. **Confidence cues** – reinforce trust through consistent visual hierarchy, readable numbers, and accessible colors.
4. **Fast paths** – minimize taps for core actions (join events, place bets, split payouts).
5. **Inclusive access** – meet WCAG 2.2 AA, support dynamic text, VoiceOver/TalkBack, haptic feedback.

## Design System
### Color Palette
- **Primary (Cabernet Red #A02137)** – call-to-action buttons, key highlights.
- **Secondary (Slate Blue #334155)** – app bar, tab bar, cards.
- **Accent (Sparkling Gold #F4C542)** – odds highlights, payout banners, confirmation states.
- **Success (Verdant #1C9A63)**, **Warning (Amber #F59E0B)**, **Error (Crimson #DC2626)**.
- **Neutrals** – Warm grayscale (#0F172A to #F8FAFC) for backgrounds, cards, typography.
- Ensure 4.5:1 contrast for text; use translucent overlays (80%, 40%) for depth.

### Typography
- **Display / Headlines:** Inter Bold (28–34pt) for hero stats, page titles.
- **Body:** Inter Regular/Medium (16–18pt) for copy, with 150% line height.
- **Numbers:** Tabular Lining figures (Inter or SF Pro Rounded) for odds/payouts to align decimals.

### Spacing & Layout
- 8pt base grid; use 4pt adjustments for micro-spacing.
- Safe area respect for devices with notches/home indicators.
- Cards with 16pt padding, 12pt corner radius; elevation via soft shadow (0,6,12 dp tiers).

### Iconography & Illustration
- Feather icons with 2px stroke; custom sports illustrations in flat minimal style.
- Avatar stacks for group participation; event banners with subtle gradients.

### Components Library
- **Primary Button:** Filled Cabernet, 16pt radius, bold label; loading spinner overlay.
- **Secondary Button:** Outline Slate Blue, 2px border, ghost state for disabled.
- **Odds Pill:** Rounded chip showing implied odds %, dynamic color transitions (Verdant for improving odds, Amber for volatile).
- **Bet Slip Card:** Sliding drawer, segmented controls for stake entry, potential returns.
- **Summary Tile:** Displays net position with sparkline micro-chart.
- **Segmented Header:** Sticky tabs for Overview / Bets / Results.
- **Floating Action Button (FAB):** Gold accent for “Create Event,” contextual morph to “Finalize Payouts”.

## Information Architecture & Navigation
- **Primary Navigation:** 4-tab bottom bar (Events, Bets, Ledger, Profile).
- **Secondary Navigation:** Contextual top tabs inside Events (Overview, Leaderboard, Bets, Payouts).
- **Global Actions:** FAB on Events tab, floating “Place Bet” button on participant detail.
- **Utility Drawer:** Swipe-down to reveal wallet balance, join code entry, and quick invite.

## Key User Journeys & Screen Concepts
### 1. Onboarding & Authentication
- **Welcome Carousel:** three slides highlighting friendly wagering, instant payouts, secure tracking; CTA “Get Started”.
- **Sign Up:** phone/email + passphrase; social proof (avatar group), passwordless magic link option.
- **Two-Factor Prompt:** optional toggle; use inline progress meter for account setup completion.

### 2. Home (Events Feed)
- Hero carousel with upcoming events user participates in; background blur for depth.
- “What’s Hot” list with live odds updates; use subtle pulse animation for events nearing close.
- Quick filters: Active, Upcoming, Settled; horizontal chip row.

### 3. Event Detail
- Sticky event header with cover image, date/time, organizer avatars.
- KPI strip: total pool, participants, closing timer; countdown uses gradient progress ring.
- **Overview Tab:** timeline of announcements, pinned join code card with share button.
- **Leaderboard Tab:** collapsible rounds/sub-competitions; top performers with medal badges.
- **Bets Tab:** segmented by your bets vs. all bets; search participant, odds trend graph.
- **Payouts Tab:** pending vs. finalized payouts, ledger summary, “Settle Now” CTA for organizers.

### 4. Place a Bet Flow
1. Tap participant row → Participant drawer slides up with stats, recent form, head-to-head.
2. Tap “Place Bet” → Bet Slip expands from bottom; choose wager amount via slider + numeric keypad.
3. Odds pill updates in real-time; show potential winnings + take-home after rake.
4. Confirmation screen with celebratory confetti animation, shareable highlight card.

### 5. Manage Bets & Ledger
- **Bets Tab:** segmented controls for Active, Settled, Canceled; each card shows stake, returns, net delta, ability to cash-out (if enabled).
- **Ledger Tab:** timeline of transactions (bets placed, payouts received, transfers); filter by event, export as PDF.
- Provide at-a-glance net position (weekly/monthly) with micro charts.

### 6. Organize Event
- FAB → “Create Event” wizard (3 steps: Basics, Rules, Invite).
- Step 1: Event name, date, sport, optional cover photo (AI suggestions from Unsplash integration).
- Step 2: Configure sub-competitions with accordion builder; dynamic preview of payout table.
- Step 3: Generate join code, share via contacts/links; show QR code for in-person scanning.

### 7. Results & Payouts
- Organizer receives smart reminders after event end; “Record Results” CTA.
- Results entry uses inline editable table; auto-calculates rankings and payouts.
- Confirmation toast “Payouts distributed” with snapshot summary, ability to notify bettors.

### 8. Notifications & Activity
- In-app inbox with stacked cards: bet matched, odds shifted, payout completed.
- Allow bundling: “3 bets settled in Saturday Skins” with breakdown when expanded.
- Support push notification deep links to relevant screen state.

### 9. Profile & Wallet
- Profile includes avatar, verification badge, lifetime stats, favorite sports.
- Wallet card with balance, withdrawal/deposit actions, recent transfers.
- Settings for notifications, security, connected accounts, responsible gaming controls (self limits, reminders).

## Microinteractions & Motion
- **Haptics:** light tap for button press, medium impact for bet confirmation, success vibration for payouts.
- **Transitions:** 250ms ease-in-out slide transitions between modals; physics-based spring for drawer interactions.
- **Live Data:** odds changes animate with color flash and count-up; net position sparkline animates on refresh.

## Accessibility & Inclusivity
- Support dynamic type up to 200%; components reflow with vertical stacking.
- VoiceOver/TalkBack labels for odds, outcomes, and monetary values (“Potential win: $56”).
- Provide colorblind-safe alternate color coding (pattern overlays on charts).
- Motion sensitivity setting to reduce animations and disable confetti.

## Empty, Loading, and Error States
- **Empty Event Feed:** friendly illustration with CTA “Create or Join an Event”.
- **Loading Skeletons:** shimmer placeholders for event cards and bet slips.
- **Errors:** inline, contextual messages with retry; escalate to full-screen only for critical issues.

## Internationalization & Localization
- Support multi-currency (USD, EUR, GBP) with locale-aware formatting.
- Modular copy strings to translate dynamic bet language; ensure RTL layout support.
- Timezone awareness for event schedules.

## Design Delivery & Handoff
- Maintain master design system in Figma with variants for light/dark mode.
- Provide interactive prototypes for key flows (onboarding, placing bet, recording payouts).
- Spec export with redlines, motion tokens, and accessibility annotations for engineering handoff.

