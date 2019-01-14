const path = require('path');
const optionsSchema = require('./options');
const Ajv = require('ajv');

class App {
  constructor(root, inputOptions) {
    this.root = root;
    this.options = { ...inputOptions };

    // Validates, adds default values, and coerces types of input options
    Ajv({ useDefaults: true, coerceTypes: true }).validate(optionsSchema, this.options);

    this.log = console.log.bind(console);
    this.logError = console.error.bind(console);
  }

  async start() {
    const { root, options, log } = this;
    const {
      port,
      apiPrefix,
      runSeeds,
      databaseDisabled,
      webserverDisabled,
      runMigrateLatest,
      runMigrateRollback,
      shortLived,
      modelPatterns,
      routerPatterns,
      actionPatterns,
      seedPatterns,
      migrationPatterns,
      hookPatterns,
      ignorePatterns,
    } = options;

    // Use modules passed directly in options or load modules using patterns passed in options
    const [
      models,
      routers,
      actions,
      seeds,
      migrations,
      hooks,
    ] = await Promise.all([
      options.models || requireModules(root, modelPatterns, ignorePatterns),
      options.routers || requireModules(root, routerPatterns, ignorePatterns),
      options.actions || requireModules(root, actionPatterns, ignorePatterns),
      options.seeds || requireModules(root, seedPatterns, ignorePatterns),
      options.migrations || requireModules(root, migrationPatterns, ignorePatterns),
      options.hooks || requireModules(root, hookPatterns, ignorePatterns),
    ]);

    // Attach hooks for handling lifecycle events
    if(hooks.length) {
      this.hooks = [];
      for(let hook of await runModules(this, hooks)) {
        if(typeof hook === 'object') {
          this.hooks.push(hook);
        }
      }
      log('Hooks attached');
    }

    await emitToHooks(this, 'beforeStart');

    // Create database connection, run migrations, run seeds, and attach models
    // Models are accessable through `app.models`
    await emitToHooks(this, 'beforeDatabase');
    if(!databaseDisabled) {
      const Knex = require('knex');
      const { Model } = require('objection');

      const knexOptions = getKnexConfig(root, options);
      const knex = Knex(knexOptions);
      Model.knex(knex);

      this.knex = knex;
      this.Model = Model;

      // Migrate / Rollback
      if(runMigrateLatest) {
        await emitToHooks(this, 'beforeMigrateLatest');
        log('Running database migrations');
        await knex.migrate.latest({
          migrationSource: getKnexMigrationSource(await runModules(this, migrations), knexOptions)
        });
        log('Database migrations finished successfully');
        await emitToHooks(this, 'afterMigrateLatest')
      } else if(runMigrateRollback) {
        await emitToHooks(this, 'beforeMigrateRollback');
        log('Rolling back database migrations');
        await knex.migrate.rollback({
          migrationSource: getKnexMigrationSource(await runModules(this, migrations), knexOptions)
        });
        log('Database rollback finished successfully');
        await emitToHooks(this, 'afterMigrateRollback');
      }

      // Attach database models
      await emitToHooks(this, 'beforeModels');
      if(models.length) {
        this.models = {};
        for(let ModelClass of await runModules(this, models)) {
          this.models[ModelClass.name] = ModelClass;
          log(`Model "${ModelClass.name}" attached`);
        }
        log('Models attached')
      }
      await emitToHooks(this, 'afterModels');

      await emitToHooks(this, 'beforeSeeds');
      if(runSeeds) {
        log('Running database seeds');
        for(let seedFn of await runModules(this, seeds)) {
          if(typeof seedFn === 'function') {
            await seedFn();
            log(`Seed ${seedFn.name || 'unnamed'} ran`);
          }
        }
        log('Database seeds finished successfully');
      }
      await emitToHooks(this, 'afterSeeds');
    }
    await emitToHooks(this, 'afterDatabase');

    // Attach actions for running business logic
    // Actions are accessable through `app.actions`
    await emitToHooks(this, 'beforeActions');
    if(actions.length) {
      this.actions = {};
      for(let action of await runModules(this, actions)) {
        if(typeof action === 'function') {
          this.actions[action.name] = action;
          log(`Action "${action.name}" attached`);
        }
      }
      log('Actions attached');
    }
    await emitToHooks(this, 'afterActions');

    // Create webserver, attach global middleware, create top-level API router and attach routes
    await emitToHooks(this, 'beforeWebserver');
    if(!webserverDisabled) {
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

      await emitToHooks(this, 'beforeMiddleware');
      for(let middleware of getMiddleware(this)) {
        koa.use(middleware);
      }
      await emitToHooks(this, 'afterMiddleware');

      // Attach API routers
      await emitToHooks(this, 'beforeRoutes');
      if(routers.length) {
        for(let router of await runModules(this, routers)) {
          if(router instanceof Router) {
            apiRouter.use(router.routes()).use(router.allowedMethods());
          }
        }
        log('Routers attached');
      }
      
      // Attach top-level API router
      koa.use(apiRouter.routes()).use(apiRouter.allowedMethods());
      await emitToHooks(this, 'afterRoutes');

      // Listen for requests
      await emitToHooks(this, 'beforeListen');
      await new Promise(resolve => server.listen(port, resolve));
      log(`Listening on port ${port}`);
      await emitToHooks(this, 'afterListen');
    }
    await emitToHooks(this, 'afterWebserver');

    if(shortLived) {
      await this.destroy();
    }

    return this;
  }

  async destroy() {
    const { knex, server, log, logError } = this;

    await emitToHooks(this, 'beforeDestroy');
    if(knex) {
      try {
        await knex.destroy()
        log('Database connection closed');
      } catch(error) { 
        logError('Failed to close database connection:', error.message);
      }
    }

    if(server) {
      log('Closing webserver');
      try {
        await new Promise(resolve => server.shutdown(resolve))
        log('Webserver closed');
      } catch(error) {
        logError('Failed to close HTTP server:', error.message);
      }
    }
    await emitToHooks(this, 'afterDestroy');
  }
}

async function requireModules(root, patterns, ignorePatterns) {
  const globby = require('globby');
  const modulePaths = await globby(patterns, {
    cwd: root, 
    absolute: true,
    ignore: ignorePatterns,
  });
  return modulePaths.map(require);
}

async function runModules(app, modules) {
  if(!modules || !modules.length) return [];
  const resolvedModules = await Promise.all(
    modules
      .sort((a, b) => {
        const aOrder = isNaN(a.order) ? Infinity : a.order;
        const bOrder = isNaN(b.order) ? Infinity : b.order;
        return aOrder - bOrder;
      })
      .map(module => typeof module === 'function' ? module(app) : null)
  );
  return resolvedModules.filter(value => !!value);
}

async function emitToHooks(app, eventId, event) {
  const { hooks } = app;
  if(!hooks) return;
  for(let hook of hooks) {
    if(typeof hook[eventId] === 'function') {
      await hook[eventId](event);
    }
  }
}

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

  if(databaseUrl) {
    connection = databaseUrl;
  } else {
    connection = {};
    if(databaseHost) connection.host = databaseHost;
    if(databaseUser) connection.user = databaseUser;
    if(databasePassword) connection.password = databasePassword;
    if(databaseName) connection.database = databaseName;
    if(databaseFile && !databaseName) {
      connection.filename = path.isAbsolute(databaseFile)
        ? databaseFile
        : path.resolve(root, databaseFile)
    }
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

module.exports = App;
