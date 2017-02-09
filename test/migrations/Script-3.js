/**
 * Test migrations script number 3. Used in test suite.
 *
 */
'use strict'


// dependencies
const Promise = require('bluebird');

const scriptLogger = require('../scriptExecLogUtil');


// Public API
module.exports = {
  id: 3,
  up: () => {
    scriptLogger.recordRun(module.exports.id, 'up');
    return Promise.resolve();
  },
  down: () => {
    scriptLogger.recordRun(module.exports.id, 'down');
    return Promise.resolve();
  }
}
