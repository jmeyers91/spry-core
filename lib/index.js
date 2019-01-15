const path = require('path');
const baseOptionsSchema = require('./options');
const Ajv = require('ajv');
const identity = v => v;
const noop = () => {};

class App {
  constructor(root, { setup=identity, ...options }={}) {
    this.root = root;
    this.options = options = setup({
      knex: identity,
      objection: identity,
      ...options,
    });
    const { optionsSchema={} } = options;

    // Validates, adds default values, and coerces types of input options
    Ajv({ useDefaults: true, coerceTypes: true }).validate({
      ...baseOptionsSchema,
      properties: {
        ...baseOptionsSchema.properties,
        ...optionsSchema,
      },
    }, this.options);

    this.log = options.silent ? noop : console.log.bind(console);
    this.logError = console.error.bind(console);
    this.models = {};
    this.actions = {};
  }

  async start() {
    const { root, options, log } = this;
    const {
      port,
      apiPrefix,
      runSeeds,
      databaseDisabled,
      webserverDisabled,
      runCreateDatabase,
      runDropDatabase,
      runMigrateLatest,
      runMigrateRollback,
      shortLived,
      models,
      routers,
      actions,
      seeds,
      migrations,
      hooks,
    } = options;
    const databaseEnabled = !databaseDisabled;
    const webserverEnabled = !webserverDisabled;

    // Attach hooks for handling lifecycle events
    await runTask(this, 'attach hooks', async () => {
      if(hooks.length) {
        this.hooks = [];
        for(let hook of resolveModules(this, hooks)) {
          if(typeof hook === 'object') {
            this.hooks.push(hook);
          }
        }
      }
    });

    await emitToHooks(this, 'before_start');

    await runTask(this, 'database', databaseEnabled, async () => {
      const Knex = require('knex');
      const { Model, transaction } = require('objection');

      const injectKnexConfig = options.knex;
      const injectModelPlugins = options.objection;
      const knexOptions = injectKnexConfig(getKnexConfig(root, options))

      await runTask(this, 'drop database', runDropDatabase && process.env.NODE_MODULES !== 'production', async () =>
        dropDatabase(Knex, knexOptions)
      );

      await runTask(this, 'create database', runCreateDatabase, async () =>
        createDatabase(Knex, knexOptions)
      );

      const knex = Knex(knexOptions);
      Model.knex(knex);

      this.transaction = transaction;
      this.knex = knex;
      this.Model = injectModelPlugins(Model);

      await runTask(this, 'migrate', runMigrateLatest, async () =>
        knex.migrate.latest({
          migrationSource: getKnexMigrationSource(resolveModules(this, migrations), knexOptions)
        })
      );

      await runTask(this, 'rollback', runMigrateRollback, async () =>
        knex.migrate.rollback({
          migrationSource: getKnexMigrationSource(resolveModules(this, migrations), knexOptions)
        })
      );

      await runTask(this, 'attach models', async () => {
        if(models.length) {
          for(let ModelClass of resolveModules(this, models)) {
            this.models[ModelClass.name] = ModelClass;
            log('  ' + ModelClass.name)
          }
        }
      });

      await runTask(this, 'attach actions', async () => {
        if(actions.length) {
          for(let action of resolveModules(this, actions)) {
            if(typeof action === 'function') {
              this.actions[action.name] = action;
              log('  ' + action.name);
            }
          }
        }
      });

      await runTask(this, 'seed', runSeeds, async () => {
        for(let seedFn of resolveModules(this, seeds)) {
          if(typeof seedFn === 'function') {
            await seedFn();
          }
        }
      });
    });

    await runTask(this, 'webserver', webserverEnabled, async () => {
      const httpShutdown = require('http-shutdown');
      const http = require('http');
      const Router = require('koa-router');
      const Koa = require('koa');
      const getMiddleware = require('./middleware');
      const koa = new Koa();
      const server = httpShutdown(http.createServer(koa.callback()))
      const apiRouter = new Router().prefix(apiPrefix);

      this.Router = Router;
      this.server = server;
      this.koa = koa;

      await runTask(this, 'attach middleware', () => {
        for(let middleware of getMiddleware(this)) {
          koa.use(middleware);
        }
      });

      await runTask(this, 'attach routes', async () => {
        if(routers.length) {
          for(let router of resolveModules(this, routers)) {
            if(router instanceof Router) {
              apiRouter.use(router.routes()).use(router.allowedMethods());
            }
          }
        }
        koa.use(apiRouter.routes()).use(apiRouter.allowedMethods());
        await emitToHooks(this, 'afterRoutes');
      });

      await runTask(this, 'listen', async () => {
        await new Promise(resolve => server.listen(port, resolve));
      });
      
      log(`Listening on port ${port}`);
    });

    if(shortLived) {
      await this.destroy();
    }

    return this;
  }

  async destroy() {
    const { knex, server } = this;

    await runTask(this, 'destroy', async () => {
      await runTask(this, 'destroy database', !!knex, async () =>
        await knex.destroy()
      );

      await runTask(this, 'destroy webserver', !!server, async () =>
        new Promise(resolve => server.shutdown(resolve))
      );
    });
  }
}

async function runTask(app, name, enabled, fn) {
  if(arguments.length === 3) {
    fn = enabled;
    enabled = true;
  }
  const hookName = name.replace(/\s/g, '_').toLowerCase();
  if(enabled) {
    await emitToHooks(app, `before_${hookName}`);
    try {
      app.log(name);
      await fn();
      await emitToHooks(app, `after_${hookName}`);
    } catch(error) {
      app.logError(`Error at ${name}`);
      throw error;
    }
  }
}

function resolveModules(app, modules) {
  if(!modules || !modules.length) return [];
  const isFunction = v => typeof v === 'function';
  const isNotFalsy = v => !!v;
  const resolveModule = module => {
    const resolved = module(app);
    if(resolved) resolved.inject = module;
    return resolved;
  };
  const sortByOrder = (a, b) => {
    const aOrder = isNaN(a.order) ? Number.MAX_SAFE_INTEGER : a.order;
    const bOrder = isNaN(b.order) ? Number.MAX_SAFE_INTEGER : b.order;
    return aOrder - bOrder;
  };

  return modules
    .filter(isFunction)
    .sort(sortByOrder)
    .map(resolveModule)
    .filter(isNotFalsy);
}

async function emitToHooks(app, eventId) {
  const { hooks } = app;
  if(!hooks) return;
  for(let hook of hooks) {
    if(typeof hook[eventId] === 'function') {
      await hook[eventId]();
    }
  }
}

// Takes flat config passed to app constructor and transforms it into a Knex config object
function getKnexConfig(root, options) {
  const {
    databaseClient,
    databaseUrl,
    databaseVersion,
    databaseFile,
    databaseHost,
    databaseUser,
    databasePassword,
    databaseName,
    databaseDebug,
    databasePoolMin,
    databasePoolMax,
  } = options;

  let connection;
  let pool;

  // Build connection based on the client and provided values
  if(databaseUrl && databaseClient === 'pg') {
    connection = databaseUrl;
  } else if(databaseFile && databaseClient === 'sqlite3') {
    if(path.isAbsolute(databaseFile)) {
      connection = { filename: databaseFile };
    } else {
      connection = { filename: path.resolve(root, databaseFile) };
    }
  } else {
    connection = {};
    if(databaseHost) connection.host = databaseHost;
    if(databaseUser) connection.user = databaseUser;
    if(databasePassword) connection.password = databasePassword;
    if(databaseName) connection.database = databaseName;
  }

  if(databaseClient === 'sqlite3') {
    pool = { min: 1, max: 1 };
  } else {
    pool = { min: databasePoolMin, max: databasePoolMax };
  }

  return {
    client: databaseClient,
    version: databaseVersion,
    debug: databaseDebug,
    useNullAsDefault: databaseClient === 'sqlite3',
    connection,
    pool,
  };
}

function getKnexMigrationSource(migrations, knexOptions) {
  return {
    async getMigrations() {
      return migrations.map(migration => ({
        config: { transaction: knexOptions.client !== 'sqlite3' },
        ...migration,
      }));
    },

    getMigrationName(migration) {
      return migration.name || `Migration ${migrations.indexOf(migration)}`;
    },

    getMigration(migration) {
      return migration;
    }
  };
}

async function queryPostgreRoot(Knex, knexOptions, query) {
  const knex = Knex({
    ...knexOptions,
    connection: {
      ...knexOptions.connection,
      database: 'postgres',
    },
  });

  try {
    return await knex.raw(query);
  } finally {
    await knex.destroy().catch(error => {
      console.log('Failed to destroy root postgres knex', error);
    });
  }
}

async function dropDatabase(Knex, knexOptions) {
  const { client, connection } = knexOptions;

  if(client === 'sqlite3') {
    const { filename } = connection;
    require('fs').unlinkSync(filename);
  } else if(client === 'pg') {
    return queryPostgreRoot(Knex, knexOptions, `DROP DATABASE ${connection.database}`).catch(error => {
      // Ignore "database does not exist" errors
      if(error.code !== '3D000') {
        throw error;
      }
    });
  } else {
    throw new Error(`dropDatabase does not yet support the database client "${client}"`);
  }
}

async function createDatabase(Knex, knexOptions) {
  const { client, connection } = knexOptions;

  if(client === 'sqlite3') {
    return; // created automatically by knex
  } else if(client === 'pg') {
    return queryPostgreRoot(Knex, knexOptions, `CREATE DATABASE ${connection.database}`)
      .catch(error => {
        // Ignore "database already exists" errors
        if(error.code !== '42P04') {
          throw error;
        }
      });
  } else {
    throw new Error(`createDatabase does not yet support the database client "${client}"`);
  }
}

module.exports = App;
