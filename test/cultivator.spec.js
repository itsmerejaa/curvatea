'use strict';


// dependencies
const expect = require('chai').expect;
const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');

const config = require('./config');


// function under test
const run = require('../lib/index.js').run;


// tests
describe('The run() function', function () {
  let dbConnection;
  let customerCollection;
  let migrationsCollection;

  before(function () {
    return MongoClient.connect(config.mongodbUrl, { promiseLibrary: Promise })
    .then(db => {
      dbConnection = db;
      customerCollection = db.collection(config.testCollection);
      migrationsCollection = db.collection(config.migrationsCollection);
    })
    .catch(error => {
      console.log('Before: caught some error:', error);
    })
  });

  after(function () {
    dbConnection && dbConnection.close && dbConnection.close();
  });

  it('should exit as a function', function () {
    expect(typeof run).to.equal('function')
  });

  it('should run a single "up" migration script', function () {
    const options = {
      dbUrl: config.mongodbUrl,
      migrationsDir: config.migrationsDirectory,
      migrationsCollection: config.migrationsCollection,
      targetVersion: 1
    };

    return Promise.all([
      migrationsCollection.deleteMany({}),
      customerCollection.deleteMany({})
    ])
    .spread((migrationsResult, customerResult) => {
      return run(options);
    })
    .then((result) => {
      expect(result.code).to.equal('MIGRATION');
      return customerCollection.find({}).toArray()
    })
    .then(docs => {
      expect(docs.length).to.equal(1);
    });
  });
});


// TODO make migrations directory configurable
// TODO add codes to the result object of run() for easier programmatic evaluation.
