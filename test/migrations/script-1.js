/**
 * Test migrations file. Used while testing the suitability of mongodb-migrations
 *
 */
'use strict';


// dependencies
const Promise = require('bluebird');

const config = require('../config');

const scriptLogger = require('../scriptExecLogUtil');


module.exports = {
  id: 1,
  up: () => {
    scriptLogger.recordRun(1, 'up');
    return Promise.resolve();
  },
  down: () => {
    scriptLogger.recordRun(1, 'down');
    return Promise.resolve();
  }
};
