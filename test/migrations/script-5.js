/**
 * Test migrations script number 5. Used in test suite.
 *
 */
'use strict';


// dependencies
const Promise = require('bluebird');

const scriptLogger = require('../scriptExecLogUtil');


// Public API
module.exports = {
  id: 5,
  up: () => {
    // for testing, this script is intentionally designed to fail
    return Promise.reject('Intentional FAIL for testing reasons.');
  },
  down: () => {
    scriptLogger.recordRun(module.exports.id, 'down');
    return Promise.resolve();
  }
};
