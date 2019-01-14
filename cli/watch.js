const path = require('path');
const chokidar = require('chokidar');
const start = require('../lib/index');

module.exports = async function watch(root, args) {
  const watcher = chokidar.watch(root);
  let appInstance = await restart();

  watcher
    .on('raw', async (_, path) => {
      const inCache = require.cache[path];
      if(inCache) {
        delete require.cache[path];
      }
      appInstance && appInstance.log('Restarting');
      appInstance = await restart(appInstance);
    });

  const { repl=true } = args;
  if(repl) startRELP();

  async function destroy(instance) {
    if(instance) {
      try {
        await instance.destroy();
      } catch(error) {
        console.log('Failed to destroy', error.stack);
      }
    }
  }

  async function restart(lastInstance) {    
    await destroy(lastInstance);
    try {
      return await start(root, args);
    } catch(error) {
      console.log('Failed to start', error.stack);
    }
  }

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
