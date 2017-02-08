/**
 * default migration file. This is copied into the default migration directory by the test harness, before running the
 * tests related to the default migrations directory. After running the test this file and it's parent directory should
 * be deleted.
 *
 */
'use strict';


// dependencies
const Promise = require('bluebird');

const scriptLogger = require('../test/scriptExecLogUtil');


module.exports = {
  id: 5,  // different id to other test scripts
  up: () => {
    scriptLogger.recordRun(5, 'up');
    return Promise.resolve();
  },
  down: () => {
    scriptLogger.recordRun(5, 'down');
    return Promise.resolve();
  }
};
