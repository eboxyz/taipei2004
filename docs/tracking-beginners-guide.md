# Game tracking: a beginner’s guide

**Taipei 2004 · Recommended setup: PostHog · Integration available · collection off until you opt in**

Tracking helps answer three questions: **Are people enjoying the game? Where do they get stuck? What breaks?** It does not replace or back up game saves.

## 1. Know the basic words

- **Event:** one meaningful action, such as finishing a battle.
- **Property:** detail attached to an event, such as the rival, squad fill, or result.
- **Funnel:** a sequence of steps that shows where players stop progressing.
- **Retention:** how often players return after their first visit.
- **Error tracking:** reports of code failures, with details that help us fix them.

For example: a `battle_finished` event could include `rival: zhongshan_boss`, `fill: balanced`, `time: day`, and `result: win`.

## 2. Start small

Track these four groups first:

- **Progress:** first property, district cleared, prestige, and active playtime.
- **Battles:** rival, squad fill, day/night, power ratio, result, and fight duration.
- **Temple draws:** motion permission, sensor connection, and whether the draw finished by shaking, swiping, or tapping.
- **Health and visits:** browser errors, build version, sessions, and return visits.

Record completed actions. Do not send an event for every sensor reading, income tick, or animation frame.

## 3. Set it up

1. Create a free account at [PostHog](https://posthog.com/) and a project named **Taipei 2004**.
2. Choose a hosting region and the **React / JavaScript** setup instructions.
3. This project uses US Cloud (`https://us.i.posthog.com`). Its browser ingestion token is configured locally; keep personal API keys private.
4. In the game, open **Office → Settings → Share game statistics** to enable optional tracking. Development builds do not send events.
5. Play one short session on the live site. Confirm that `session_started`, `battle_finished` and `draw_purchased` appear in PostHog’s activity feed. Basic browser errors appear as custom `browser_error` events.

## 4. Keep collection modest

Use a random browser ID rather than a name or email. Keep save contents out of events. Start with automatic click capture and session recordings off. Disable stored IP addresses and location enrichment separately, and provide a tracking choice.

Return visits count browsers, not verified people: changing devices or clearing browser storage can look like a new player. Client events can also be blocked or altered, so treat them as useful signals rather than an authoritative game ledger.

## 5. Review once a week

Ask: Where does progression slow down? Which rivals cause repeated losses? Do all three fills have useful matchups? Does motion connect on iPhones? Are players coming back? Which errors affect the most sessions?

Change one thing at a time and compare the next batch of sessions. A handful of fights is too small to judge a 60% win-rate target; separate results by rival, day/night, and squad strength.

**Budget:** PostHog currently includes 1 million analytics events and 100,000 exceptions monthly on its free tier. Begin without a payment card and review usage before enabling extra collection.

Sources checked November 16, 2026: [PostHog pricing](https://posthog.com/pricing) · [Data collection controls](https://posthog.com/docs/privacy/data-collection). Vercel Hobby does not include [custom analytics events](https://vercel.com/docs/analytics/limits-and-pricing), which is why PostHog is recommended here.
