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

// add visits to the DB
await analytics.logEvent({
  event: 'visit', // (optional) set the event type, defaults to 'visit'
  url: '/index.html', // where did they visit
  domain: 'myothersite.com', // (optional) override the default domain
  session: '12345', // (optional) user ID, should be set using a cookie or similar
  userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.79..', // (optional) user agent, lets us parse the browser, os, etc
  ip: '255.255.255.255', // (optional) user IP address
  extra: {foo: 'bar'}, // (optional) additional data that should be stored
  note: 'This is important!' // (optional) a note to be attached to the event
})

// query the DB
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
```

Note, the WHERE clause in any query have the following fields available:

 - event
 - date
 - url
 - domain
 - session
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

## Why?

SaaS solutions like Google Analytics track users around the Web (which isn't cool) and that's prompted users to block tracker scripts, which screws up your results. So: SaaS options are unethical and a bit broken.

We needed a solution for [hashbase](https://hashbase.io) so we made this.