/**
 * Test migrations file. Used while testing the suitability of mongodb-migrations
 *
 */
'use strict'


// dependencies
const Promise = require('bluebird');
const scriptLogger = require('../scriptExecLogUtil');


module.exports = {
  id: 3,
  up: () => {
    // use utility to record a script ran, so tests can verify
    scriptLogger.recordRun(3, 'up');
    return Promise.resolve()
  },
  down: () => {
    scriptLogger.recordRun(3, 'down');
    return Promise.resolve()
  }
}
