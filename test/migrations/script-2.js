/**
 * Test migrations file number 2. Used for testign the suitability of mongodb-migrations
 *
 */
'use strict';


// dependencies
const Promise = require('bluebird');

const scriptLogger = require('../scriptExecLogUtil');


//
module.exports = {
  id: 2,
  up: () => {
    scriptLogger.recordRun(2, 'up');
    return Promise.resolve()
  },
  down: () => {
    scriptLogger.recordRun(2, 'down');
    return Promise.resolve()
  }
}
