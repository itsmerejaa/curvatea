/**
 * Test migrations script number 4. Used in test suite.
 *
 */
'use strict';


// dependencies
const Promise = require('bluebird');

const scriptLogger = require('../scriptExecLogUtil');


// Public API
module.exports = {
  id: 4,
  up: () => {
    scriptLogger.recordRun(module.exports.id, 'up');
    return Promise.resolve();
  },
  down: () => {
    // for testing, this script is intentionally designed to fail
    return Promise.reject('Intentional FAIL for testing reasons.');
  }
};
