const chokidar = require('chokidar');

module.exports = async function watch(App, root, args) {
  const watcher = chokidar.watch(root);
  let app;

  await start();

  watcher
    .on('raw', async (_, path) => {
      if(require.cache[path]) delete require.cache[path];
      start();
    });

  async function start() {
    if(app) {
      try {
        await app.destroy();
      } catch(error) {
        console.log('Failed to destroy app', error.stack);
      }
      app = null;
    }

    app = new App(root, args);
    try {
      await app.start();
    } catch(error) {
      console.log(`Failed to start app`, error.stack);
    }
  }

  // const { repl=true } = args;
  // if(repl) startRELP();

  function startRELP() {
    require('repl')
      .start({
        prompt: '> ',
        async eval(command, context, filename, callback) {
          try {
            const result = await eval(`
              (async () => {
                const rapid = appInstance;
                const { models, actions, knex, options } = rapid;
                const { ${Object.keys(appInstance.models).join(', ')} } = models;
                const { ${Object.keys(appInstance.actions).join(', ')} } = actions;
    
                return ${command};
              })();
            `);
            callback(null, result);
          } catch(error) {
            callback(error);
          }
        }
      })
      .on('exit', async () => {
        await destroy();
        process.exit(1);
      });
  }
}
