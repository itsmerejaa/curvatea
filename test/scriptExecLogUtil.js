/**
 *
 *
 */
'use strict';


let _changelog = {};

module.exports = {
  wasRun: (version, direction) => {
    _changelog[version] = _changelog[version] || {};
    return (_changelog[version][direction]) ? true : false;
  },
  reset: () => {
    _changelog = {};
  },
  recordRun: (version, direction) => {
    _changelog[version] = _changelog[version] || {};
    _changelog[version][direction] = true;
  },
  noneRan: () => {
    return (Object.keys(_changelog).length === 0) ? true : false;
  }
};
