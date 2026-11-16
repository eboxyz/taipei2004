# Taipei 2004: improvement priorities

Code review · November 15, 2026 · Approved priorities · implementation status below

## Recommendation

Start with save reliability and a small analytics setup, then make the next useful action clearer. Keep the current economy and squad behavior while collecting evidence from real sessions.

This review uses the source code, design document, prior battle simulations and the issues reported during phone testing. It is not a fresh visual audit or a study of player behavior. Impact and effort below are estimates.

## 1. Make save health visible — high priority, small to medium effort

**Evidence:** `saveLocal()` returns false when browser storage fails, but `engine.save()` ignores that result. Office promises automatic saving and offers string export/import. Hosting on a different URL also creates a separate browser save.

**Proposal:** show last successful save time in Office; display a persistent, gentle message when saving fails, with an Export action. Add download/upload backup files alongside strings. Keep the stable production URL in sharing instructions.

**Success:** a simulated storage failure is visible and the player can export a usable backup. Measure save failures without sending save contents. Cloud sync can wait; it adds account and conflict-handling complexity.

## 2. Measure the main loop — high priority, medium effort

**Evidence:** there is no analytics integration yet. We have simulator results, but no observed progression, retention or device error data.

**Proposal:** add PostHog events for session starts, progression milestones, completed battles, completed draws, motion connection and exceptions. Include build version and a test-session marker. Disable development capture by default and keep personal testing out of player dashboards.

**Success:** one test playthrough produces the expected events exactly once. Initial views: progression funnel, battle results by rival/fill/day/night, returning browsers, and errors by device/build. Track active playtime separately from wall time so idle play is interpretable.

## 3. Turn the resource guide into useful actions — high priority, small to medium effort

**Evidence:** the map guide explains sources and identifies a free Temple visit, but cannot take the player there. The Draws tab dot only covers zodiac selection/free Temple visits, not affordable scratch or lottery draws. The Draws wallet omits some sources listed in the map guide.

**Proposal:** offer “Visit Temple” when free, and a compact “Draws available” action for held currency. Add “Find a rewarded rematch” when one is eligible. Share resource-source descriptions across Map and Draws. Consider remembering whether the player folded the guide away.

**Success:** a player can discover and use an earned draw without searching multiple screens. Measure guide actions followed by draw or rematch completion; do not judge success from clicks alone.

## 4. Give players one clear next goal — medium priority, medium effort

**Evidence:** tab dots identify opportunities, but can represent several different tasks. Progression, staffing and battle information lives across separate screens.

**Proposal:** add one small contextual objective above the map: collect the safe, buy toward the next lieutenant threshold, post an available manager, or challenge an unlocked rival. Show a concrete reason and a direct action. Make it dismissible; avoid competing alerts.

**Success:** shorter active time to the first property and first lieutenant, with fewer repeated screen visits before an action. Treat this as an onboarding hypothesis until tested with new players.

## 5. Make battle advice more honest — medium priority, small effort for wording

**Evidence:** prep verdicts (“You should win this” / “An even fight”) use displayed power relative to recommended power. Prior simulations showed that attacks, commander auras and skills can create large outcome differences at similar displayed power. Offensive still struggles against some daytime bosses.

**Proposal:** describe power as an estimate and put the rival trick, suggested fill and time-of-day effect beside it. Keep the approved squad behavior. Show reward cooldowns clearly before rematches. Avoid exact win percentages unless a validated predictor supports them.

**Success:** collect losses and repeated attempts by rival, fill, power ratio and day/night before retuning. Results must be segmented by roster strength; a global 60% target would hide progression differences.

## 6. Finish phone verification — high priority, small testing pass

**Evidence:** motion permission and sensor status are now visible, but successful physical shaking has not been confirmed in this conversation. Builds and unit tests do not establish hardware behavior.

**Proposal:** test iPhone Chrome and Safari over HTTPS: first permission grant, denial/retry, shake completion, swipe/tap alternatives, app background/resume, and save recovery. Check the expanded map legend at narrow widths, long text, larger text settings and reduced motion.

**Success:** each path can complete a draw, with no duplicate reward or lost save. Record motion connection and completion method, never raw sensor streams.

## Suggested order

1. Connect PostHog with explicit, limited events; finish the phone checks.
2. Add save health and easy file backups.
3. Add resource actions and align the wallet explanations.
4. Improve battle wording and trial one contextual next-goal prompt.
5. Review real sessions before changing rewards, pacing or adding more content.

## PostHog: what the account owner needs to do

1. Rename the existing **Default Project** to **Taipei 2004**. A new account already has a project; there is no need for another one.
2. Open the project setup instructions and choose **React** for this Vite app.
3. Find the **project token** and **API/ingestion host** in project settings. Provide those two values to Codex, or configure them directly. The project token is intended for browser ingestion; do not provide a personal API key, password or email login code.
4. Stay on the free plan. We can use one project with environment/test properties rather than separate paid projects.
5. After integration and deployment, play a test session and verify the events arrive. Account creation alone does not collect game events.

For the current locally built deployment workflow, the frontend values must be present when building. Adding Vercel environment variables alone will not change an already compiled bundle.

Official references: [React setup](https://posthog.com/docs/libraries/react), [projects and project tokens](https://posthog.com/docs/settings/projects), [data collection controls](https://posthog.com/docs/privacy/data-collection).

## Implementation update

Tracking, save health, file backups, resource shortcuts, a dismissible next-step prompt, and battle wording are implemented. Automated checks pass. PostHog dashboard receipt and physical phone checks still need verification; no player data conclusions have been drawn.
