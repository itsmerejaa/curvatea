/**
 * Test migrations file number 2. Used for testign the suitability of mongodb-migrations
 *
 */
'use strict'


// dependencies
const Promise = require('bluebird')


module.exports = {
  id: 2,
  up: () => {
    console.log(`This is the ${module.exports.id} migration file UP running`)
    return Promise.resolve()
  },
  down: () => {
    console.log(`This is the ${module.exports.id} migration file DOWN running`)
    return Promise.resolve()
  }
}
