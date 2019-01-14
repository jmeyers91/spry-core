async function requireModules(root, {
  modelPatterns,
  routerPatterns,
  actionPatterns,
  seedPatterns,
  migrationPatterns,
  hookPatterns,
  ignorePatterns,
}={}) {
  const globby = require('globby');
  const [
    models,
    routers,
    actions,
    seeds,
    migrations,
    hooks,
  ] = await Promise.all([
    requireRootGlob(modelPatterns, 'model'),
    requireRootGlob(routerPatterns, 'router'),
    requireRootGlob(actionPatterns, 'action'),
    requireRootGlob(seedPatterns, 'seed'),
    requireRootGlob(migrationPatterns, 'migration'),
    requireRootGlob(hookPatterns, 'hook'),
  ]);

  return {
    models,
    routers,
    actions,
    seeds,
    migrations,
    hooks,
  };

  async function requireRootGlob(patterns, type) {
    if(!patterns || !patterns.length) return [];
    const modulePaths = await globby(patterns, {
      cwd: root,
      ignore: ignorePatterns,
      absolute: true,
    });

    return modulePaths.map(require);
  }
}

module.exports = requireModules;
