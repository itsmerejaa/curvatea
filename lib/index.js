/**
 * This is a wrapper around mongodb-migrations so it can function the way we would like it to.
 *
 * The version to migrate to is stored in config.migrations.currentVersion
 *
 */
'use strict'

// dependencies
const _ = require('lodash')
const mm = require('mongodb-migrations')
const Promise = require('bluebird')
const requireDirectory = require('require-directory')
const MongoClient = require('mongodb').MongoClient
const migrations = requireDirectory(module, '../test/migrations')


function _promiseToCallback(promiseScript) {
  return (done) => {
    promiseScript().then(() => {
      done()
    })
    .catch((error) => {
      done(error)
    })
  }
}


/**
 * From the complete list of migration scripts selects the delta from the current version and target version, as well as
 * work out the direction of migration, either up or down, and return this information in an object.
 *
 * @param currentVersion  number, the version as stored in the DB
 * @param targetVersion   number, the version "requested" as stored in the application configuration file.
 * @return {{
 *   direction:   string, The direction to "migrate", will be one of [ "migrate", "rollback", "no op" ]
  *  migrations:  Array<*>, Only the scripts needed to run, in ascending order.
  * }}
 *
 */
function _selectMigrations(currentVersion, targetVersion) {
  const selectedMigrations = []

  function inDelta(version) {
    return (targetVersion > currentVersion)
      ? (version > currentVersion && version <= targetVersion)
      : (version <= currentVersion && version > targetVersion)
  }

  _.forEach(migrations, (migration) => {
    if (inDelta(migration.id)) {
      selectedMigrations.push({
        id: migration.id,
        up: _promiseToCallback(migration.up),
        down: _promiseToCallback((migration.down))
      })
    }
  })
  selectedMigrations.sort((a, b) => {
    return a.id - b.id
  })
  return selectedMigrations
}


function getCurrentVersion(dbConnectionUrl) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(dbConnectionUrl, { promiseLibrary: Promise }, (err, db) => {
      if (err) return reject(err)
      let migrationsCollection = db.collection('_migrations')  // default collection name for mongodb-migrations

      migrationsCollection.find({}).sort({id: -1}).limit(1).toArray((err, docs) => {
        db.close()
        if (err) return reject(err)
        if (docs.length === 0) return resolve(0) // no history of migrations so we'll start from 0
        return resolve(docs[0].id)
      })
    })
  })
}


// Public API
module.exports = {
  run: (options) => {
    return Promise.all([
      getCurrentVersion(options.dbUrl),
      Promise.resolve(options.targetVersion)
    ])
    .spread((currentVersion, targetVersion) => {
      return new Promise((resolve, reject) => {
        if (targetVersion === currentVersion) return resolve({message: 'no migration required'})

        const direction = (targetVersion > currentVersion) ? 'migrate' : 'rollback'
        let selectedMigrations = _selectMigrations(currentVersion, targetVersion)

        // sanity check
        if (selectedMigrations.length === 0) return reject('Unable to locate migration script to run')

        // load migrations that need to be run
        let migrator = new mm.Migrator({url: options.dbUrl})
        selectedMigrations.forEach((value, key) => {
          migrator.add(value)
        })

        if (direction === 'rollback') {
          // HACK: A rollback won't run unless a migrate was run first. However we just want to run a rollback,
          // so we need to trick mongodb-migrations into thinking it's already "tried" to migrate up.
          migrator._lastDirection = 'up'
          selectedMigrations.forEach(migration => {
            migrator._result[migration.id] = { status: 'ok' }
          })
        }

        // start the migration
        migrator[direction]((error, results) => {
          if (error) return reject(error)

          return resolve({ message: `successfully migrated to ${targetVersion}`, code: 'MIGRATION' });
        })
      })
    })
  }
}
