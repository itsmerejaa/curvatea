'use strict';


// dependencies
const _ = require('lodash');
const expect = require('chai').expect;
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));

const config = require('./config');
const scriptLogger = require('./scriptExecLogUtil');


// function under test
const run = require('../lib/migrator.js').run;


// helper functions

function _createStandardOptions(options) {
  const defaults = {
    dbUrl: config.mongodbUrl,
    directory: config.migrationsDirectory,
    collection: config.migrationsCollection
  };

  return _.merge(defaults, options);
}


function _createChangeLogDocs(idList) {
  const changeLog = [];
  if (!Array.isArray(idList)) idList = [idList];

  idList.forEach(value => {
    changeLog.push({id: value});
  });

  return changeLog
}

function _emptyCollections(collectionList) {
  const work = [];
  if (!Array.isArray(collectionList)) collectionList = [ collectionList ];

  collectionList.forEach(collection => {
    work.push(collection.deleteMany({}));
  });
  return Promise.all(work);
}


// tests
describe('The run() function', function () {
  let dbConnection;
  let migrationsCollection;
  let defaultMigrationsCollection;
  let thenResult;
  let catchResult;

  before(function () {
    return MongoClient.connect(config.mongodbUrl, { promiseLibrary: Promise })
    .then(db => {
      dbConnection = db;
      migrationsCollection = db.collection(config.migrationsCollection);
      defaultMigrationsCollection = db.collection('_migrations');
    })
    .catch(error => {
      console.log('Before: caught some error:', error);
    })
  });

  after(function () {
    dbConnection && dbConnection.close && dbConnection.close();
  });

  // utility function to run the function under test, `run()` and save it's reject and resolve promises for future
  // validation.
  function _runWithAndSave(options) {
    thenResult = undefined;
    catchResult = undefined;

    return run(options)
    .then(res => {
      thenResult = res
    })
    .catch(err => {
      catchResult = err
    })
  }

  describe('WHEN there is no options argument provided', function () {
    before(function () {
      return _runWithAndSave(null)
    });

    it('should not resolve the promise', function () {
      expect(thenResult).to.equal(undefined);
    });

    it('should reject the promise with an object', function () {
      expect(typeof catchResult).to.equal('object')
    });

    it('should contain a property "error: NO_OPTIONS"', function () {
      expect(catchResult.error).to.equal('NO_OPTIONS');
    });

    it('should contain a property "message" of type string', function () {
      expect(typeof catchResult.message).to.equal('string');
    });

  });

  describe('WHEN the options argument does not contain a dbUrl property', function () {
    before(function () {
      const options = _createStandardOptions({ targetVersion: 1 });

      delete options.dbUrl;
      return _runWithAndSave(options);
    });

    it('should not resolve the promise', function () {
      expect(thenResult).to.equal(undefined);
    });

    it('should return a rejected promise with an informative error', function () {
      expect(typeof catchResult).to.equal('object');
    });

    it('should contain a property "error: NO_MONGODB_URL"', function () {
      expect(catchResult.error).to.equal('NO_MONGODB_URL');
    });

    it('should contain a property "message" of type string', function () {
      expect(typeof catchResult.message).to.equal('string');
    })
  });

  describe('WHEN the options argument does not contain a "targetVersion" property', function () {
    before(function () {
      return _runWithAndSave(_createStandardOptions());  // can use default options since it doesn't contain a targetVersion
    });

    it('should not resolve the promise', function () {
      expect(thenResult).to.equal(undefined);
    });

    it('should return a rejected promise as an object', function () {
      expect(typeof catchResult).to.equal('object');
    });

    it('should contain a property "error: NO_TARGET_VERSION"', function () {
      expect(catchResult.error).to.equal('NO_TARGET_VERSION');
    });

    it('should contain a property ', function () {
      expect(typeof catchResult.message).to.equal('string');
    });
  });

  describe('WHEN the options argument does not contain a "directory" property', function () {
    const defaultMigrationsPath = path.join(process.cwd(), './migrations');
    const defaultMigrationsSource = path.join(process.cwd(), './test/defaultMigrations/defaultMigrationScript.js');
    const defaultMigrationsFile = path.join(defaultMigrationsPath, 'defaultMigrationsScript.js');

    before(function () {
      return _emptyCollections([migrationsCollection])
      .then(() => {
        // setup the default directory and populate with a "default" script
        return fs.mkdirAsync(defaultMigrationsPath)
      })
      .then(() => {
        return fs.readFileAsync(defaultMigrationsSource)
      })
      .then((buffer) => {
        return fs.writeFileAsync(defaultMigrationsFile, buffer)
      })
      .catch(error => {
        console.log('ERROR while creating migration script in default directory:', error)
      })
    });

    after(function () {
      // cleanup by deleting the default script and directory
      return fs.unlinkAsync(defaultMigrationsFile)
      .then(() => {
        return fs.rmdirAsync(defaultMigrationsPath)
      })
      .catch(error => {
        console.log('ERROR while cleaning up defaultMigrationsPath:', error)
      })
    });

    it('should default to using "./migrations"', function () {
      const options = _createStandardOptions({ targetVersion: 7 });

      scriptLogger.reset();
      delete options.directory;
      return run(options)
      .then((result) => {
        expect(typeof result).to.equal('object');
        expect(result.code).to.equal('MIGRATE');
        expect(scriptLogger.wasRun(7, 'up')).to.equal(true);
        expect(scriptLogger.wasRun(1, 'up')).to.equal(false);  // crosscheck that the usual test scripts didn't run
      })
    });
  });

  describe('WHEN the "directory" options property points to an empty directory', function () {
    const missingPath = './test/emptyDirectory';
    before(function () {
      const options = _createStandardOptions({ targetVersion: 1, directory: missingPath });

      return _runWithAndSave(options)
    });

    it('should not return a resolved promise', function () {
      expect(thenResult).to.equal(undefined);
    });

    it('should return a rejected promise with an error object', function () {
      expect(typeof catchResult).to.equal('object');
    });

    it('should contain a property "error: NO_SCRIPTS" ', function () {
      expect(catchResult.error).to.equal('NO_SCRIPTS');
    });

    it('should contain a property "message" indicating the missing directory', function () {
      const fullMissingPath = path.join(process.cwd(), missingPath);

      expect(catchResult.message).to.contain(fullMissingPath);
    })
  });

  describe('WHEN the options argument does not contain a migrationsCollection', function () {
    it('should default to using "_migrations"', function () {
      const options = _createStandardOptions({ targetVersion: 1 });

      delete options.collection;
      return _emptyCollections([defaultMigrationsCollection])
      .then(() => {
        return run(options);
      })
      .then(result => {
        expect(result.code).to.equal('MIGRATE');

        return defaultMigrationsCollection.find({}).toArray();
      })
      .then(docs => {
        // check the default collection "_migrations" for a changelog of the migration script running.
        expect(docs.length).to.equal(1);
        expect(docs[0].id).to.equal(1);
      })
    });
  });


  describe('WHEN the options argument is valid', function () {

    describe('AND one forward migration is required', function () {

      describe('AND the target migration script exists', function () {

        before(function () {
          scriptLogger.reset();
          return _emptyCollections([migrationsCollection])
          .then(() => {
            return _runWithAndSave(_createStandardOptions({ targetVersion: 1 }));
          });
        });

        it('should execute the "up" migration script', function () {
          expect(scriptLogger.wasRun(1, 'up')).to.equal(true);
        });

        it('should return, as a resolved promise, an object with property "code: MIGRATE"', function () {
          expect(thenResult.code).to.equal('MIGRATE');
        });

        it('should add a "changelog" document to the migrations collection, with matching version number', function () {
          return migrationsCollection.findOne({ id: 1 })
          .then(doc => {
            expect(doc.id).to.equal(1);
          });
        });

      });

      describe('AND the target migration script does not exist.', function () {
        before(function () {
          return _emptyCollections([migrationsCollection])
          .then(() => {
            return migrationsCollection.insertOne({ id: 5 })
          })
          .then(() => {
            return _runWithAndSave(_createStandardOptions({ targetVersion: 6 }));
          });
        });

        it('should return, as a rejected promise, an object with "error: MISSING_TARGET_SCRIPT"', function () {
          expect(catchResult.error).to.equals('MISSING_TARGET_SCRIPT')
        });

        it('should not change the migrations changelog collection', function () {
          return migrationsCollection.find({}).toArray()
          .then(docs => {
            expect(docs.length).to.equal(1);
            expect(docs[0].id).to.equal(5);
          });
        });

      });
    });

    describe('AND one backward migration is required', function () {
      before(function () {
        scriptLogger.reset();
        return _emptyCollections([migrationsCollection])
        .then(() => {
          return migrationsCollection.insert(_createChangeLogDocs([1]));
        })
        .then(() => {
          return _runWithAndSave(_createStandardOptions({ targetVersion: 0 }))
        });
      });

      it('should return, as a resolved promise, an object with property "code: MIGRATE"', function () {
        expect(thenResult.code).to.equal('ROLLBACK');
      });

      it('should run the "down" migration script', function () {
        expect(scriptLogger.wasRun(1, 'down')).to.equal(true);
        expect(scriptLogger.wasRun(1, 'up')).to.equal(false);  // should run down not up
      });

      it('should remove the "changelog" document from the migrations collection with the matching version number', function () {
        return migrationsCollection.find({}).toArray()
        .then(docs => {
          expect(docs.length).to.equal(0)
        });
      });

    });


    describe('AND no migration is required (targetVersion === currentVersion)', function () {
      before(function () {
        scriptLogger.reset();
        return _emptyCollections([migrationsCollection])
        .then(() => {
          return migrationsCollection.insert({ id: 1 })
        })
        .then(function () {
          return _runWithAndSave(_createStandardOptions({ targetVersion: 1 }));
        });
      });

      it('should return, as a resolved promise, an object with property "code: NO_MIGRATION_REQUIRED"', function () {
        expect(thenResult.code).to.equal('NO_MIGRATION_REQUIRED');
      });

      it('should not add or remove any documents from the migrations changelog collection', function () {
        return migrationsCollection.find({}).toArray()
        .then(docs => {
          expect(docs.length).to.equal(1);
          expect(docs[0].id).to.equal(1);
        });
      });

      it('should not run any migraitons', function () {
        expect(scriptLogger.noneRan()).to.equal(true)
      });

    });


    describe('AND several forward migrations are required', function () {
      before(function () {
        return _emptyCollections([migrationsCollection])
        .then(() => {
          return _runWithAndSave(_createStandardOptions({ targetVersion: 3 }));
        });
      });

      it('should return, as a resolved promise, an object with "code: MIGRATE" property', function () {
        expect(thenResult.code).to.equal('MIGRATE');
      });

      it('should add a document to the migrations changelog collection for all successful migrations', function () {
        return migrationsCollection.find({}).sort({ id: 1}).toArray()
        .then(docs => {
          expect(docs.length).to.equal(3);
          expect(docs[0].id).to.equal(1);
          expect(docs[1].id).to.equal(2);
          expect(docs[2].id).to.equal(3);
        });
      });

    });

    describe('AND several backward migrations are required', function () {
      before(function () {

        scriptLogger.reset();
        return _emptyCollections([migrationsCollection])
        .then(() => {
          return migrationsCollection.insertMany(_createChangeLogDocs([1, 2, 3]));
        })
        .then(() => {
          return _runWithAndSave(_createStandardOptions({ targetVersion: 1 }))
        });
      });

      it('should remove documents from the migrations changelog collection for each rollback', function () {
        return migrationsCollection.find({}).toArray()
        .then(docs => {
          expect(docs.length).to.equal(1);
          expect(docs[0].id).to.equal(1);
        });
      });

      it('should return, as a resolved promise, an object with "code: ROLLBACK" property', function () {
        expect(thenResult.code).to.equal('ROLLBACK');
      });

      it('should rollback several versions', function () {
        expect(scriptLogger.wasRun(3, 'down')).to.equal(true);
        expect(scriptLogger.wasRun(2, 'down')).to.equal(true);
        expect(scriptLogger.wasRun(1, 'down')).to.equal(false); // rolled back to 1 so this does not get run
      });

    });

    describe('AND several forward migrations are required, the last of which fails', function () {
      before(function () {
        scriptLogger.reset();
        return _emptyCollections([migrationsCollection])
        .then(() => {
          return migrationsCollection.insertMany(_createChangeLogDocs([1, 2]))
        })
        .then(() => {
          return _runWithAndSave(_createStandardOptions({ targetVersion: 5 }))
        });
      });

      it('should return, as a rejected promise, an object with "code: MIGRATION_FAILED" property', function () {
        expect(catchResult.error).to.equal('MIGRATION_FAILED');
      });

      it('should not record the last (failing) migration in the changelog collection', function () {
        return migrationsCollection.find({ id: 5 }).toArray()
        .then(docs => {
          expect(docs.length).to.equal(0);
        });
      });

      it('should not run the rollback for the failed migration script', function () {
        expect(scriptLogger.wasRun(5, 'down')).to.equal(false);
      });

      it('should record the successful migration scripts in the changelog collection', function () {
        return migrationsCollection.find({}).sort({ id: 1 }).toArray()
        .then(logs => {
          expect(logs.length).to.equal(4);
          // 1 and 2 were seeded in this test and since the length is 4 we can assume they are there.
          expect(logs[2].id).to.equal(3);
          expect(logs[3].id).to.equal(4);
        });
      });

      it('should run the successful migration scripts', function () {
        // started at 2 and target was 5, so 3 and 4 should have run, but not 5 as it failed.
        expect(scriptLogger.wasRun(3, 'up')).to.equal(true);
        expect(scriptLogger.wasRun(4, 'up')).to.equal(true);
      });

    });

    describe('AND several backward migrations are required, one of which fails', function () {
      before(function () {
        scriptLogger.reset();
        return _emptyCollections([migrationsCollection])
        .then(() => {
          return migrationsCollection.insertMany(_createChangeLogDocs([1, 2, 3, 4, 5]));
        })
        .then(() => {
          return _runWithAndSave(_createStandardOptions({ targetVersion: 3 }));
        });
      });

      it('should return, as a rejected promise, an object with "code: ROLLBACK_FAILED" property', function () {
        expect(catchResult.error).to.equal('ROLLBACK_FAILED');
      });

      it('should not remove the failing rollback from the changelog collection', function () {
        return migrationsCollection.find({ id: 4 }).toArray()
        .then(docs => {
          expect(docs.length).to.equal(1);
        });
      });

      it('should remove the successful rollbacks from the changelog collection', function () {
        return migrationsCollection.find({ id: 5 }).toArray()
        .then(docs => {
          expect(docs.length).to.equal(0);
        });
      });

      it('should run the successful rollback scripts', function () {
        expect(scriptLogger.wasRun(5, 'down')).to.equal(true);
      });

    })

  });

});
