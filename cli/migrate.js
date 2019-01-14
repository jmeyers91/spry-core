
module.exports = function migrate(App, root, args) {
  return new App(root, {
    ...args,
    runMigrateLatest: true,
    webserverDisabled: true,
    shortLived: true,
  }).start();
}
