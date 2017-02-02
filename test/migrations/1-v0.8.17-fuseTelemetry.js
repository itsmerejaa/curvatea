/**
 * Test migrations file. Used while testing the suitability of mongodb-migrations
 *
 */
'use strict'


// dependencies
const Promise = require('bluebird')
const MongoClient = require('mongodb').MongoClient

const config = require('../config')

module.exports = {
  id: 1,
  up: () => {
    console.log(`This is the ${module.exports.id} migration file UP running`)
    return MongoClient.connect(config.mongodbUrl, { promiseLibrary: Promise })
    .then(db => {
      const customerCollection = db.collection(config.testCollection)

      return customerCollection.insertOne({ name: 'Chirs Hemsworth', balance: '78M' })
    })
    .then(doc => {
      console.log('added doc:', doc)
    })
  },
  down: () => {
    console.log(`This is the ${module.exports.id} migration file DOWN running`)
    return Promise.resolve()
  }
}
