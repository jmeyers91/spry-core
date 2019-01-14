
module.exports = function seed(App, root, args) {
  return new App(root, {
    ...args,
    runSeeds: true,
    webserverDisabled: true,
    shortLived: true,
  }).start();
}
