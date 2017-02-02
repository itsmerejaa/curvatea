/**
 * Test migrations file. Used while testing the suitability of mongodb-migrations
 *
 */
'use strict'


// dependencies
const Promise = require('bluebird')


module.exports = {
  id: 3,
  up: () => {
    console.log(`This is the ${module.exports.id} migration file UP running`)
    return Promise.reject('testing')
  },
  down: () => {
    console.log(`This is the ${module.exports.id} migration file DOWN running`)
    return Promise.resolve()
  }
}
