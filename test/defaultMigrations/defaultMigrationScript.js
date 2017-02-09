/**
 * Default migration test script. This is copied into the default migration directory by the test harness, before
 * running the tests related to the default migrations directory. After running the test this file and it's parent
 * directory should be deleted.
 *
 */
'use strict';


// dependencies
const Promise = require('bluebird');

const scriptLogger = require('../test/scriptExecLogUtil');


// Public API
module.exports = {
  id: 7,  // different id to other test scripts
  up: () => {
    scriptLogger.recordRun(module.exports.id, 'up');
    return Promise.resolve();
  },
  down: () => {
    scriptLogger.recordRun(module.exports.id, 'down');
    return Promise.resolve();
  }
};
