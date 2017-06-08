const useragent = require('express-useragent')
const mtb36 = require('monotonic-timestamp-base36')
const setupDB = require('./lib/setup-db')
const zipObject = require('lodash.zipobject')

class PEAnalytics {
  constructor ({db, domain}) {
    this.db = setupDB(db)
    this.domain = domain
  }

  // write an event row
  async logEvent (data) {
    // parse user agent
    var userAgentParsed = data.useragent ? useragent.parse(data.useragent) : {}

    // construct row
    var row = {
      id: mtb36(),
      event: data.event || 'visit',
      url: data.url,
      domain: data.domain || this.domain,
      session: data.session,
      isMobile: userAgentParsed.isMobile,
      isDesktop: userAgentParsed.isDesktop,
      isBot: userAgentParsed.isBot,
      browser: userAgentParsed.browser,
      version: userAgentParsed.version,
      os: userAgentParsed.os,
      platform: userAgentParsed.platform,
      ip: data.ip,
      note: data.note
    }

    if (data.date) {
      // date override (mainly for testing)
      row.date = data.date
    }

    // run query
    var keysArray = Object.keys(row)
    var keys = keysArray.join(', ')
    var qs = keysArray.map(v => '?').join(', ')
    var values = Object.values(row)
    await this.db.run(`INSERT INTO events (${keys}) VALUES (${qs})`, values)

    // write extra
    for (var k in data.extra) {
      await this.db.run(
        `INSERT INTO events_extra (event_id, key, value) VALUES (?, ?, ?)`,
        [row.id, k, data.extra[k]]
      )
    }
  }

  // list an event range
  async listEvents ({where, limit, offset} = {}) {
    if (offset && !limit) limit = -1
    limit = typeof limit === 'number' ? `LIMIT ${limit}` : ''
    offset = typeof offset === 'number' ? `OFFSET ${offset}` : ''
    where = where || `1 = 1`
    var res = await this.db.all(`
      SELECT
          events.*,
          GROUP_CONCAT(events_extra.key, "|||") AS extraKeys,
          GROUP_CONCAT(events_extra.value, "|||") AS extraValues
        FROM events
        LEFT JOIN events_extra ON events_extra.event_id = events.id
        WHERE ${where}
        GROUP BY id
        ${limit}
        ${offset}
    `)
    return res.map(row => {
      if (row.extraKeys) {
        row.extra = zipObject(row.extraKeys.split('|||'), row.extraValues.split('|||'))
      } else {
        row.extra = {}
      }
      delete row.extraKeys
      delete row.extraValues
      return row
    })
  }

  // sugar to list visit events
  async listVisits ({where, limit, offset} = {}) {
    if (where) {
      where = `event = 'visit' AND ${where}`
    } else {
      where = `event = 'visit'`
    }
    return this.listEvents({where, limit, offset})
  }

  // count an event range
  async countEvents ({unique, groupByDay, where} = {}) {
    where = where || '1 = 1'
    // TODO unique
    if (unique) {
      if (groupByDay) {
        return this.db.all(`
          SELECT COUNT(DISTINCT session) AS count, DATE(events.date) AS date FROM events
            LEFT JOIN events_extra ON events_extra.event_id = events.id
            WHERE ${where} AND session IS NOT NULL
            GROUP BY strftime('%d-%m-%Y', date)
        `)
      } else {
        let res = await this.db.get(`
          SELECT COUNT(DISTINCT session) AS count FROM events
            LEFT JOIN events_extra ON events_extra.event_id = events.id
            WHERE ${where} AND session IS NOT NULL
        `)
        return res.count
      }
    } else {
      if (groupByDay) {
        return this.db.all(`
          SELECT COUNT(DISTINCT id) AS count, DATE(events.date) AS date FROM events
            LEFT JOIN events_extra ON events_extra.event_id = events.id
            WHERE ${where}
            GROUP BY strftime('%d-%m-%Y', date)
        `)
      } else {
        let res = await this.db.get(`
          SELECT COUNT(DISTINCT id) AS count FROM events
            LEFT JOIN events_extra ON events_extra.event_id = events.id
            WHERE ${where}
        `)
        return res.count
      }
    }
  }

  // sugar to count visit events
  async countVisits ({unique, groupByDay, where} = {}) {
    if (where) {
      where = `event = 'visit' AND ${where}`
    } else {
      where = `event = 'visit'`
    }
    return this.countEvents({unique, groupByDay, where})
  }
}

module.exports = PEAnalytics