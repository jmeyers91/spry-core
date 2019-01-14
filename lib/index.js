const { existsSync } = require('fs');
const path = require('path');
const requireModules = require('./requireModules');
const getOptions = require('./getOptions');

const emptyArgs = { _: {} };

class App {
  constructor(root, args=emptyArgs) {
    const dotEnvPath = getDotEnvPath(root);
    const env = require('dotenv').config({ path: dotEnvPath }).parsed || {};

    this.root = root;
    this.destroyed = false;
    this.log = console.log.bind(console);
    this.logError = console.error.bind(console);
    this.inputOptions = getOptions({ env, args });
  }

  async start() {
    try {
      return await this._start();
    } catch(error) {
      this.logError(`Failed to start`, error.stack);
      try {
        await this.destroy();
      } catch(error) {
        this.logError(`Failed to shutdown`, error.stack);
      }
      throw error;
    }
  }

  async _start() {
    const { root, inputOptions, log } = this;
    const options = this.options = await getOptions.validate(inputOptions);
    const {
      port,
      apiPrefix,
      runSeeds,
      databaseDisabled,
      webserverDisabled,
      runMigrateLatest,
      runMigrateRollback,
      shortLived,
    } = options;

    log('Resolved config');

    const {
      models,
      routers,
      actions,
      seeds,
      migrations,
      hooks,
    } = await requireModules(root, options);

    log('Resolved modules');

    if(hooks.length) {
      this.hooks = [];
      for(let hook of await resolveModules(this, hooks)) {
        if(typeof hook === 'object') {
          this.hooks.push(hook);
        }
      }
      log('Hooks attached');
    }

    await emitToHooks(this, 'beforeStart');

    await emitToHooks(this, 'beforeActions');
    if(actions.length) {
      this.actions = {};
      for(let action of await resolveModules(this, actions)) {
        if(typeof action === 'function') {
          this.actions[action.name] = action;
          log(`Action "${action.name}" attached`);
        }
      }
      log('Actions attached');
    }
    await emitToHooks(this, 'afterActions');

    await emitToHooks(this, 'beforeDatabase');
    if(!databaseDisabled) {
      const Knex = require('knex');
      const { Model } = require('objection');
      
      const migrationSource = (runMigrateLatest || runMigrateRollback) 
        ? getMigrationSource(await resolveModules(this, migrations))
        : null;

      const knexOptions = getKnexConfig(root, options);
      const knex = Knex(knexOptions);
      Model.knex(knex);

      this.knex = knex;
      this.Model = Model;

      await emitToHooks(this, 'beforeMigrations');
      if(runMigrateLatest) {
        log('Running database migrations');
        await knex.migrate.latest({ migrationSource });
        log('Database migrations finished successfully');
      } else if(runMigrateRollback) {
        log('Rolling back database migrations');
        await knex.migrate.rollback({ migrationSource });
        log('Database rollback finished successfully');
      }
      await emitToHooks(this, 'afterMigrations');

      await emitToHooks(this, 'beforeModels');
      if(models.length) {
        this.models = {};
        for(let ModelClass of await resolveModules(this, models)) {
          this.models[ModelClass.name] = ModelClass;
          log(`Model "${ModelClass.name}" attached`);
        }
        log('Models attached')
      }
      await emitToHooks(this, 'afterModels');

      await emitToHooks(this, 'beforeSeeds');
      if(runSeeds) {
        log('Running database seeds');
        for(let seedFn of await resolveModules(this, seeds)) {
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

      await emitToHooks(this, 'beforeRoutes');
      if(routers.length) {
        for(let router of await resolveModules(this, routers)) {
          if(router instanceof Router) {
            apiRouter.use(router.routes()).use(router.allowedMethods());
          }
        }
        log('Routers attached');
      }
      
      koa.use(apiRouter.routes()).use(apiRouter.allowedMethods());
      await emitToHooks(this, 'afterRoutes');

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
    if(this.destroyed) return;

    this.destroyed = true;
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

async function resolveModules(app, modules) {
  if(!modules || !modules.length) return [];
  const resolvedModules = await Promise.all(
    modules.map(module => typeof module === 'function' ? module(app) : null)
  );
  return resolvedModules.filter(value => !!value);
}

function getMigrationSource(migrations) {
  return {
    async getMigrations() {
      return migrations;
    },

    getMigrationName(migration) {
      return migration.name || `Migration ${migrations.indexOf(migration)}`;
    },

    getMigration(migration) {
      return migration;
    }
  };
}

function getDotEnvPath(root) {
  const { NODE_ENV } = process.env;
  if(NODE_ENV && NODE_ENV !== 'development') {
    const nodeEnvConfigPath = path.resolve(root, `.env.${NODE_ENV}`);
    if(existsSync(nodeEnvConfigPath)) {
      return nodeEnvConfigPath;
    }
  }
  return path.resolve(root, '.env');
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
  } = options;

  let connection;

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

  return {
    client: databaseClient,
    version: databaseVersion,
    debug: databaseDebug,
    useNullAsDefault: databaseClient === 'sqlite3',
    connection,
  };
}

async function startApp(root, args) {
  return new App(root, args).start();
}

module.exports = startApp;
