const start = require('../lib/index');

module.exports = function migrate(root, args) {
  return start(root, {
    ...args,
    runMigrateLatest: true,
    webserverDisabled: true,
    shortLived: true,
  });
}
