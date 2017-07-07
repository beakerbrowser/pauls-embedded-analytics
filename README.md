# pauls-embedded-analytics

A sqlite-backed embedded analytics module for nodejs.

## Usage

```js
const PEAnalytics = require('pauls-embedded-analytics')

// open/create an instance
var analytics = new PEAnalytics({
  db: './analytics.db',
  domain: 'mysite.com'
})

// event tracking
// =

// add visits to the DB
await analytics.logEvent({
  event: 'visit', // (optional) set the event type, defaults to 'visit'
  url: '/index.html', // where did they visit
  domain: 'myothersite.com', // (optional) override the default domain
  session: '12345', // (optional) user ID, should be set using a cookie or similar
  referer: 'google.com', // (optional) referer header
  userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.79..', // (optional) user agent, lets us parse the browser, os, etc
  ip: '255.255.255.255', // (optional) user IP address
  extra: {foo: 'bar'}, // (optional) additional data that should be stored
  note: 'This is important!' // (optional) a note to be attached to the event
})

// query
await analytics.listEvents({
  where: `date BETWEEN date('now', '-1 day') AND date('now')`, // WHERE clause
  limit: 100,
  offset: 0
})
await analytics.listVisits({
  // same params as listEvents but filters to event='visit'
})
await analytics.countEvents({
  unique: false, // unique visits only (according to session)? default false
  groupBy: 'url' | 'date' | false, // outputs as eg [{url:, count}], [{date:, count:}], or just a number
  where: `date BETWEEN date('now', '-1 day') AND date('now')` // WHERE clause
})
await analytics.countVisits({
  // same params as countEvents but filters to event='visit'
})

// cohort tracking
// =

// track state in the active_users campaign
// (in this example, cohort 2 might mean '2nd week since launch', and state 3 might me 'is active')
await analytics.updateCohort('active_users', {
  cohort: 2, // 2nd week since launch
  subject: user.id,
  state: 3 // is active
})

// query
await analytics.countCohortStates('active_users')
```

Note, the WHERE clause in any query have the following fields available:

 - event
 - date
 - url
 - domain
 - session
 - referer
 - ip
 - isMobile
 - isDesktop
 - isBot
 - browser
 - version
 - os
 - platform
 - events_extra.key / events_extra.value

These are also the fields output by a list call.

### Cohorts

Cohort tracking is designed to help questions about user retention. A cohort should be identified by a value specified by the application. Each cohort specifies a grouping of users. A simple example cohort id would be the year + the week of the year, eg 201701 for the first week of 2017.

The update method tracks the state of a `subject` within the cohort. State may be anything, but a recommended scheme would be a set of enums. In hashbase's `active_users` campaign, we use `1` for registered, `2` for "activated," and `3` for active in the last 2 weeks.

When a user registers, we run:

```js
analytics.updateCohort('active_users', {
  cohort: getUserCohort(user),
  subject: user.id,
  state: 1 // is registered
})
```

When they upload an archive, we run:

```js
analytics.updateCohort('active_users', {
  cohort: getUserCohort(user),
  subject: user.id,
  state: 3 // is active
})
```

And every week we do a full sweep of the users table, where we set the state to `1`, `2`, or `3` based on the state of their archives.

The `countCohortStates` method outputs an array which looks like this:

```js
[ { cohort: '201701', state: '1', count: 3 },
  { cohort: '201701', state: '2', count: 2 },
  { cohort: '201701', state: '3', count: 1 },
  { cohort: '201702', state: '1', count: 3 },
  { cohort: '201702', state: '2', count: 2 },
  { cohort: '201702', state: '3', count: 1 } ]
```

For hashbase, these numbers are actually cumulative. 50 users are in the registered state, but activated and active users are also registered, so there's actually 50+30+15 = 95 registered users.

## Why?

SaaS solutions like Google Analytics track users around the Web (which isn't cool) and that's prompted users to block tracker scripts, which screws up your results. So: SaaS options are unethical and a bit broken.

We needed a solution for [hashbase](https://hashbase.io) so we made this.