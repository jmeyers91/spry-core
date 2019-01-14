const start = require('../lib/index');

module.exports = function seed(root, args) {
  return start(root, {
    ...args,
    runSeeds: true,
    webserverDisabled: true,
    shortLived: true,
  });
}
