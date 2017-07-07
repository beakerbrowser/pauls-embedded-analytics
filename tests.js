const test = require('ava')
const tempy = require('tempy')
const path = require('path')
const PEAnalytics = require('./index')

const userAgent = '"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
const OLD_DATE = '2017-06-01 19:30:27'

var analytics

test('create instance', async t => {
  analytics = new PEAnalytics({
    db: path.join(tempy.directory(), 'analytics.db'),
    domain: 'mysite.com'
  })

  t.pass()
})

test('insert events', async t => {
  // simple usage
  await analytics.logEvent({
    url: '/index.html'
  })
  await analytics.logEvent({
    url: '/foo.html'
  })
  await analytics.logEvent({
    url: '/bar.html'
  })

  // full usage
  await analytics.logEvent({
    url: '/index.html',
    session: '1',
    userAgent,
    ip: '255.255.255.255',
    note: 'This is important!'
  })
  await analytics.logEvent({
    url: '/foo.html',
    session: '2',
    userAgent,
    ip: '255.255.255.255',
    note: 'This is important!'
  })
  await analytics.logEvent({
    url: '/bar.html',
    session: '1',
    userAgent,
    ip: '255.255.255.255',
    note: 'This is important!'
  })

  // with extra
  await analytics.logEvent({
    url: '/index.html',
    extra: {
      foo: 'asdf',
      bar: '100'
    }
  })

  // override domain
  await analytics.logEvent({
    url: '/index.html',
    domain: 'foo.com'
  })

  // override event
  await analytics.logEvent({
    event: 'click',
    session: '2',
    url: '/index.html'
  })

  // override date
  await analytics.logEvent({
    url: '/index.html',
    session: '2',
    date: OLD_DATE
  })

  t.pass()
})

test('countEvents / countVisits', async t => {
  t.is(await analytics.countEvents(), 10)
  t.is(await analytics.countVisits(), 9)
  t.is(await analytics.countEvents({where: `event = 'click'`}), 1)
  t.is(await analytics.countEvents({where: `domain = 'foo.com'`}), 1)
  t.is(await analytics.countVisits({where: `domain = 'foo.com'`}), 1)
  t.is(await analytics.countEvents({where: `date > '${OLD_DATE}'`}), 9)
  t.is(await analytics.countVisits({where: `date > '${OLD_DATE}'`}), 8)
})

test('countEvents / countVisits group by', async t => {
  var res
  res = await analytics.countEvents({groupBy: 'date'})
  t.is(res.length, 2)
  t.is(res[0].count, 1)
  t.is(res[0].date, OLD_DATE.split(' ')[0])
  t.is(res[1].count, 9)

  var res
  res = await analytics.countVisits({groupBy: 'date'})
  t.is(res.length, 2)
  t.is(res[0].count, 1)
  t.is(res[0].date, OLD_DATE.split(' ')[0])
  t.is(res[1].count, 8)

  var res
  res = await analytics.countEvents({groupBy: 'url'})
  t.deepEqual(res, [
    { count: 2, url: '/bar.html' },
    { count: 2, url: '/foo.html' },
    { count: 6, url: '/index.html' }
  ])

  var res
  res = await analytics.countVisits({groupBy: 'url'})
  t.deepEqual(res, [
    { count: 2, url: '/bar.html' },
    { count: 2, url: '/foo.html' },
    { count: 5, url: '/index.html' }
  ])
})

test('countEvents / countVisits unique', async t => {
  t.is(await analytics.countEvents({unique: true}), 2)
  t.is(await analytics.countEvents({unique: true, where: `event = 'click'`}), 1)
  t.is(await analytics.countEvents({unique: true, where: `date > '${OLD_DATE}'`}), 2)
  t.is(await analytics.countVisits({unique: true, where: `date > '${OLD_DATE}'`}), 2)
})

test('countEvents / countVisits unique, group by day', async t => {
  var res
  res = await analytics.countEvents({unique: true, groupBy: 'date'})
  t.is(res.length, 2)
  t.is(res[0].count, 1)
  t.is(res[0].date, OLD_DATE.split(' ')[0])
  t.is(res[1].count, 2)

  var res
  res = await analytics.countVisits({unique: true, groupBy: 'date'})
  t.is(res.length, 2)
  t.is(res[0].count, 1)
  t.is(res[0].date, OLD_DATE.split(' ')[0])
  t.is(res[1].count, 2)

  var res
  res = await analytics.countEvents({unique: true, groupBy: 'url'})
  t.deepEqual(res, [
    { count: 1, url: '/bar.html' },
    { count: 1, url: '/foo.html' },
    { count: 2, url: '/index.html' }
  ])

  var res
  res = await analytics.countVisits({unique: true, groupBy: 'url'})
  t.deepEqual(res, [
    { count: 1, url: '/bar.html' },
    { count: 1, url: '/foo.html' },
    { count: 2, url: '/index.html' }
  ])
})

test('listEvents / listVisits', async t => {

  var res = (await analytics.listEvents({limit: 1}))[0]
  var keys = [
    'event',
    'date',
    'url',
    'domain',
    'session',
    'ip',
    'isMobile',
    'isDesktop',
    'isBot',
    'browser',
    'version',
    'os',
    'platform'
  ]
  for (var k in keys) {
    t.truthy(typeof res[keys[k]] !== 'undefined', keys[k])
  }

  t.is((await analytics.listEvents()).length, 10, 'listEvents()')
  t.is((await analytics.listVisits()).length, 9, 'listVisits()')
  t.is((await analytics.listEvents({limit: 5})).length, 5, 'listEvents() limit')
  t.is((await analytics.listVisits({limit: 5})).length, 5, 'listVisits() limit')
  t.is((await analytics.listEvents({offset: 8})).length, 2, 'listEvents() offset')
  t.is((await analytics.listVisits({offset: 8})).length, 1, 'listVisits() offset')
  t.is((await analytics.listEvents({offset: 8, limit: 1})).length, 1, 'listEvents() limit & offset')
  t.is((await analytics.listVisits({offset: 8, limit: 1})).length, 1, 'listVisits() limit & offset')
  t.is((await analytics.listEvents({where: `event = 'click'`}))[0].event, 'click', 'listEvents() event filter')
  t.is((await analytics.listEvents({where: `domain = 'foo.com'`}))[0].domain, 'foo.com', 'listEvents() domain filter')
  t.is((await analytics.listVisits({where: `domain = 'foo.com'`}))[0].domain, 'foo.com', 'listVisits() domain filter')
  t.is((await analytics.listVisits({where: `date = '${OLD_DATE}'`}))[0].date, OLD_DATE, 'listVisits() date filter')
  t.is((await analytics.listVisits({where: `events_extra.key = 'foo' AND events_extra.value = 'asdf'`}))[0].extra.foo, 'asdf', 'listEvents() extra filter')
})

test('cohorts', async t => {
  var counts

  // 2 cohorts, each with 3 in state 1, 2 in state 2, and 1 in state 1
  await analytics.updateCohort('test', {cohort: 1, subject: 1, state: 1})
  await analytics.updateCohort('test', {cohort: 1, subject: 2, state: 1})
  await analytics.updateCohort('test', {cohort: 1, subject: 3, state: 1})
  await analytics.updateCohort('test', {cohort: 1, subject: 4, state: 2})
  await analytics.updateCohort('test', {cohort: 1, subject: 5, state: 2})
  await analytics.updateCohort('test', {cohort: 1, subject: 6, state: 3})
  await analytics.updateCohort('test', {cohort: 2, subject: 7, state: 1})
  await analytics.updateCohort('test', {cohort: 2, subject: 8, state: 1})
  await analytics.updateCohort('test', {cohort: 2, subject: 9, state: 1})
  await analytics.updateCohort('test', {cohort: 2, subject: 10, state: 2})
  await analytics.updateCohort('test', {cohort: 2, subject: 11, state: 2})
  await analytics.updateCohort('test', {cohort: 2, subject: 12, state: 3})

  counts = await analytics.countCohortStates('test')
  t.deepEqual(counts, [
    { cohort: '1', state: '1', count: 3 },
    { cohort: '1', state: '2', count: 2 },
    { cohort: '1', state: '3', count: 1 },
    { cohort: '2', state: '1', count: 3 },
    { cohort: '2', state: '2', count: 2 },
    { cohort: '2', state: '3', count: 1 }
  ])

  // modify some states
  await analytics.updateCohort('test', {cohort: 1, subject: 4, state: 1}) // 2 -> 1
  await analytics.updateCohort('test', {cohort: 2, subject: 11, state: 3}) // 2 -> 3

  counts = await analytics.countCohortStates('test')
  t.deepEqual(counts, [
    { cohort: '1', state: '1', count: 4 },
    { cohort: '1', state: '2', count: 1 },
    { cohort: '1', state: '3', count: 1 },
    { cohort: '2', state: '1', count: 3 },
    { cohort: '2', state: '2', count: 1 },
    { cohort: '2', state: '3', count: 2 }
  ])
})