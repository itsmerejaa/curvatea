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
const path = require('path')
const Promise = require('bluebird')
const requireDirectory = require('require-directory')
const MongoClient = require('mongodb').MongoClient



// helper functions


function _mergeWithDefaults(options) {
  const DEFAULT_OPTIONS = {
    directory: './migrations',  // the directory containing migration scripts
    collection: '_migrations'   // the collection to store the version changelog
  };

  return _.merge(DEFAULT_OPTIONS, options);
}

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
function _selectMigrations(migrations, currentVersion, targetVersion) {
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

/**
 *
 * @param dbConnectionUrl
 */
function getCurrentVersion(dbConnectionUrl, collection) {
  return new Promise((resolve, reject) => {
    MongoClient.connect(dbConnectionUrl, {promiseLibrary: Promise}, (err, db) => {
      if (err) return reject(err)
      let migrationsCollection = db.collection(collection)

      migrationsCollection.find({}).sort({id: -1}).limit(1).toArray((err, docs) => {
        db.close()
        if (err) return reject(err)
        if (docs.length === 0) return resolve(0) // no history of migrations so we'll start from 0
        return resolve(docs[0].id)
      })
    })
  })
}


function getMigrationScripts(path) {
  try {
    return requireDirectory(module, path)
  } catch (e) {
    return {}  // probably invalid path or insufficient permissions. Ehther way return an empty array []
  }
}


// Public API
/**
 * Programatic way to migrate up or down to the given targetVersion from the currentVersion
 *
 * @param options object, a configuration object containing:
 *   dbUrl:  string, a valid MongoDB connection url
 *   targetVersion  number, the version to migrate to, can be above or below the current version
 *   directory:  string, the directory containing all the scripts to use. Defaults to './migrations'
 *   collection:  string, the name of the MongoDB collection containing the changelog of scripts run. Defaults to '_migraitons'
 *
 */
module.exports = {
  run: (options) => {
    if (!options || typeof options !== 'object') {
      return Promise.reject({
        error: 'NO_OPTIONS',
        message: 'No options argument given.'
      });
    }
    if (!options.dbUrl) {
      return Promise.reject({
        error: 'NO_MONGODB_URL',
        message: 'Options argument is missing the MongoDB connection string property "dbUrl"'
      });
    }
    if (!options.targetVersion && options.targetVersion !== 0) {
      return Promise.reject({
        error: 'NO_TARGET_VERSION',
        message: 'No targetVersion given. Don\'nt know where to migrate to'
      });
    }
    options = _mergeWithDefaults(options);

    const migrationsPath = path.join(process.cwd(), options.directory);
    const migrations = getMigrationScripts(migrationsPath);

    if (Object.keys(migrations).length === 0) {
      return Promise.reject({
        error: 'NO_SCRIPTS',
        message: `No migration scripts found at: '${migrationsPath}'`
      });
    }

    return Promise.all([
      getCurrentVersion(options.dbUrl, options.collection),
      Promise.resolve(options.targetVersion)
    ])
    .spread((currentVersion, targetVersion) => {

      return new Promise((resolve, reject) => {
        if (targetVersion === currentVersion) {
          return resolve({
            code: 'NO_MIGRATION_REQUIRED',
            message: 'The current version is the same as the target version.'
          })
        }
        const direction = (targetVersion > currentVersion) ? 'migrate' : 'rollback';
        let selectedMigrations = _selectMigrations(migrations, currentVersion, targetVersion);

        // sanity check
        if (selectedMigrations.length === 0) {
          return reject({
            error: 'MISSING_TARGET_SCRIPT',
            message: 'The target migration script could not be found.'
          });
        }

        // load migrations that need to be run
        let migrator = new mm.Migrator({ url: options.dbUrl, collection: options.collection });
        selectedMigrations.forEach((value, key) => {
          migrator.add(value)
        });

        if (direction === 'rollback') {
          // HACK: A rollback won't run unless a migrate was run first. However we just want to run a rollback,
          // so we need to trick mongodb-migrations into thinking it's already "tried" to migrate up.
          migrator._lastDirection = 'up';
          selectedMigrations.forEach(migration => {
            migrator._result[migration.id] = {status: 'ok'}
          });
        }

        // start the migration
        migrator[direction]((error, results) => {
          if (error) return reject(error);

          return resolve({message: `successfully migrated to ${targetVersion}`, code: direction.toUpperCase()});
        })
      })
    })
  }
}
