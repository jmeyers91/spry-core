
module.exports = function rollback(App, root, args) {
  return new App(root, {
    ...args,
    runMigrateRollback: true,
    webserverDisabled: true,
    shortLived: true,
  }).start();
}
