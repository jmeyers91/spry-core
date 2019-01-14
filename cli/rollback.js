const start = require('../lib/index');

module.exports = function rollback(root, args) {
  return start(root, {
    ...args,
    runMigrateRollback: true,
    webserverDisabled: true,
    shortLived: true,
  });
}
