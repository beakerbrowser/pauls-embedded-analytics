const sqlite3 = require('sqlite3')
const fs = require('fs')
const path = require('path')

// exported API
// =

module.exports = function setup (dbPath) {
  const migrations = [
    migration('v1.sql')
  ]
  function migration (file) {
    return cb => db.exec(fs.readFileSync(path.join(__dirname, '..', 'sql', file), 'utf8'), cb)
  }

  // open database
  var db = new sqlite3.Database(dbPath)
  var setupPromise = runMigrations(db, migrations, '[PROFILES]')
  return {
    async get (...args) {
      await setupPromise
      return cbPromise(cb => db.get(...args, cb))
    },
    async all (...args) {
      await setupPromise
      return cbPromise(cb => db.all(...args, cb))
    },
    async run (...args) {
      await setupPromise
      return cbPromise(cb => db.run(...args, cb))
    }
  }
}

// internal methods
// =

// helper to run database migrations
function runMigrations (db, migrations, logTag) {
  return new Promise((resolve, reject) => {
    db.get('PRAGMA user_version;', (err, res) => {
      if (err) return reject(err)

      var version = (res && res.user_version) ? +res.user_version : 0
      var neededMigrations = migrations.slice(version)
      if (neededMigrations.length === 0) {
        return resolve()
      }

      runNeededMigrations()
      function runNeededMigrations (err) {
        if (err) return reject(err)

        var migration = neededMigrations.shift()
        if (!migration) {
          // done
          return resolve()
        }

        migration(runNeededMigrations)
      }
    })
  })
}

// helper to make node-style CBs into promises
// usage: cbPromise(cb => myNodeStyleMethod(cb)).then(...)
function cbPromise (method, b) {
  return new Promise((resolve, reject) => {
    method((err, value) => {
      if (err) reject(err)
      else resolve(value)
    })
  })
}
