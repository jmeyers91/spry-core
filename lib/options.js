const { env } = process;

// const options = [
//   {
//     key: 'port',
//     default: 8080,
//     envKey: 'PORT',
//     type: 'integer',
//     description: 'The port the server is run on (default: `env.PORT || 8080`)',
//   },
//   {
//     key: 'cors',
//     type: 'boolean',
//     envKey: 'CORS',
//     default: false,
//     description: 'Pass `true` to allow cross-origin requests (default: `env.CORS || false`)',
//   },
//   {
//     key: 'public',
//     type: 'string',
//     envKey: 'PUBLIC',
//     description: 'Directory containing static files to be served by the webserver (default: `env.PUBLIC`)',
//   },
//   {
//     key: 'apiPrefix',
//     type: 'string',
//     envKey: 'API_PREFIX',
//     default: '/api',
//     description: 'Prefix for API endpoints (default: `\'/api\'`)',
//   },
//   {
//     key: 'databaseClient',
//     type: 'string',
//     envKey: 'DATABASE_CLIENT',
//     default: 'sqlite3',
//     description: 'Database client (default: `\'sqlite3\'`)',
//   },
//   {
//     key: 'databaseFile',
//     type: 'string',
//     envKey: 'DATABASE_FILE',
//     default: 'database.sqlite',
//     description: 'Path to the database file used by SQLite (defaults to \'database.sqlite\')',
//   },
//   {
//     key: 'databaseUrl',
//     type: 'string',
//     envKey: 'DATABASE_URL',
//     description: 'Database URL used to connect to PostgreSQL database (format: `postgresql://username:password@host:port/database?param1=value1`)',
//   },
//   {
//     key: 'databaseVersion',
//     type: 'string',
//     default: env.DATABASE_VERSION,
//     description: 'Database version',
//   },
//   {
//     key: 'databaseSocketPath',
//     type: 'string',
//     default: env.DATABASE_SOCKET_PATH,
//     description: 'Database socket path used to connect to MySQL database',
//   },
//   {
//     key: 'databaseHost',
//     type: 'string',
//     default: env.DATABASE_HOST || 'localhost',
//     description: 'Database host (defaults to `\'localhost\'`)',
//   },
//   {
//     key: 'databaseUser',
//     type: 'string',
//     default: env.DATABASE_USER || env.USER,
//     description: 'Database user (default: `process.env.USER`)',
//   },
//   {
//     key: 'databasePassword',
//     type: 'string',
//     default: env.DATABASE_PASSWORD,
//     description: 'Database password',
//   },
//   {
//     key: 'databaseName',
//     type: 'string',
//     default: env.DATABASE_NAME,
//     description: 'Database name',
//   },
//   {
//     key: 'databaseDebug',
//     type: 'boolean',
//     default: env.DATABASE_DEBUG,
//     description: 'Enable Knex database debugging (default: `false`)',
//   },
//   {
//     key: 'databaseDisabled',
//     type: 'boolean',
//     default: env.DISABLE_DATABASE,
//     description: 'Stop the database from starting (default: `false`)',
//   },
//   {
//     key: 'databasePoolMin',
//     type: 'integer',
//     default: env.DATABASE_POOL_MIN || 2,
//     description: 'Database connection pool minimum size (default: `2`, ignored when using SQLite database client)',
//   },
//   {
//     key: 'databasePoolMax',
//     type: 'integer',
//     default: env.DATABASE_POOL_MAX || 10,
//     description: 'Database connection pool maximum size (default: `10`, ignored when using SQLite database client)',
//   },
//   {
//     key: 'webserverDisabled',
//     type: 'boolean',
//     default: env.DISABLE_WEBSERVER,
//     description: 'Stop the webserver from starting (default: `false`)',
//   },
//   {
//     key: 'runSeeds',
//     type: 'boolean',
//     default: false,
//     description: 'Run database seeds (default: `false`)',
//   },
//   {
//     key: 'runMigrateLatest',
//     type: 'boolean',
//     default: false,
//     description: 'Migrate database to latest migration (default: `false`)',
//   },
//   {
//     key: 'runMigrateRollback',
//     type: 'boolean',
//     default: false,
//     description: 'Rollback database to last migration (default: `false`)',
//   },
//   {
//     key: 'shortLived',
//     type: 'boolean',
//     default: false,
//     description: 'Destroy app immediately after starting (used for one-off commands like seed and migrate) (default: `false`)',
//   },
//   {
//     key: 'modelPatterns',
//     type: 'array',
//     default: ['**/*.model.js'],
//     description: 'Patterns to use when searching for models in the app directory (default: `[\'**/*.model.js\']`)',
//   },
//   {
//     key: 'routerPatterns',
//     type: 'array',
//     default: ['**/*.router.js'],
//     description: 'Patterns to use when searching for routers in the app directory (default: `[\'**/*.router.js\']`)',
//   },
//   {
//     key: 'actionPatterns',
//     type: 'array',
//     default: ['**/*.action.js'],
//     description: 'Patterns to use when searching for actions in the app directory (default: `[\'**/*.action.js\']`)',
//   },
//   {
//     key: 'seedPatterns',
//     type: 'array',
//     default: ['**/*.seed.js'],
//     description: 'Patterns to use when searching for seeds in the app directory (default: `[\'**/*.seed.js\']`)',
//   },
//   {
//     key: 'migrationPatterns',
//     type: 'array',
//     default: ['**/*.migration.js'],
//     description: 'Patterns to use when searching for migrations in the app directory (default: `[\'**/*.migration.js\']`)',
//   },
//   {
//     key: 'hookPatterns',
//     type: 'array',
//     default: ['**/*.hook.js'],
//     description: 'Patterns to use when searching for hooks in the app directory (default: `[\'**/*.hook.js\']`)',
//   },
//   {
//     key: 'ignorePatterns',
//     type: 'array',
//     default: ['node_modules'],
//     description: 'Patterns to ignore when searching for modules (models, routers, seeds, etc.) in the app directory (default: `[\'node_modules\']`)',
//   },
//   {
//     key: 'models',
//     type: 'array',
//     description: 'An array of model modules to use instead of searching with `modelPattern`',
//   },
//   {
//     key: 'routers',
//     type: 'array',
//     description: 'An array of router modules to use instead of searching with `routerPattern`',
//   },
//   {
//     key: 'actions',
//     type: 'array',
//     description: 'An array of action modules to use instead of searching with `actionPattern`',
//   },
//   {
//     key: 'seeds',
//     type: 'array',
//     description: 'An array of seed modules to use instead of searching with `seedPattern`',
//   },
//   {
//     key: 'migrations',
//     type: 'array',
//     description: 'An array of migration modules to use instead of searching with `migrationPattern`',
//   },
//   {
//     key: 'hooks',
//     type: 'array',
//     description: 'An array of hook modules to use instead of searching with `hookPattern`',
//   },
// ]

module.exports = {
  type: 'object',
  properties: {
    port: {
      type: 'integer',
      default: env.PORT || 8080,
      description: 'The port the server is run on (default: `env.PORT || 8080`)',
    },
    cors: {
      type: 'boolean',
      default: env.CORS || false,
      description: 'Pass `true` to allow cross-origin requests (default: `env.CORS || false`)',
    },
    silent: {
      type: 'boolean',
      default: env.SILENT || false,
      description: 'Disable logging',
    },
    public: {
      type: 'string',
      default: env.PUBLIC,
      description: 'Directory containing static files to be served by the webserver (default: `env.PUBLIC`)',
    },
    apiPrefix: {
      type: 'string',
      default: env.API_PREFIX || '/api',
      description: 'Prefix for API endpoints (default: `\'/api\'`)',
    },
    databaseClient: {
      type: 'string',
      default: env.DATABASE_CLIENT || 'sqlite3',
      description: 'Database client (default: `\'sqlite3\'`)',
    },
    databaseFile: {
      type: 'string',
      default: env.DATABASE_FILE || 'database.sqlite',
      description: 'Path to the database file used by SQLite (defaults to \'database.sqlite\')',
    },
    databaseUrl: {
      type: 'string',
      default: env.DATABASE_URL,
      description: 'Database URL used to connect to PostgreSQL database',
    },
    databaseVersion: {
      type: 'string',
      default: env.DATABASE_VERSION,
      description: 'Database version',
    },
    databaseSocketPath: {
      type: 'string',
      default: env.DATABASE_SOCKET_PATH,
      description: 'Database socket path used to connect to MySQL database',
    },
    databaseHost: {
      type: 'string',
      default: env.DATABASE_HOST || 'localhost',
      description: 'Database host (defaults to `\'localhost\'`)',
    },
    databaseUser: {
      type: 'string',
      default: env.DATABASE_USER || env.USER,
      description: 'Database user (default: `process.env.USER`)',
    },
    databasePassword: {
      type: 'string',
      default: env.DATABASE_PASSWORD,
      description: 'Database password',
    },
    databaseName: {
      type: 'string',
      default: env.DATABASE_NAME,
      description: 'Database name',
    },
    databaseDebug: {
      type: 'boolean',
      default: env.DATABASE_DEBUG,
      description: 'Enable Knex database debugging (default: `false`)',
    },
    databaseDisabled: {
      type: 'boolean',
      default: env.DISABLE_DATABASE,
      description: 'Stop the database from starting (default: `false`)',
    },
    databasePoolMin: {
      type: 'integer',
      default: env.DATABASE_POOL_MIN || 2,
      description: 'Database connection pool minimum size (default: `2`, ignored when using SQLite database client)',
    },
    databasePoolMax: {
      type: 'integer',
      default: env.DATABASE_POOL_MAX || 10,
      description: 'Database connection pool maximum size (default: `10`, ignored when using SQLite database client)',
    },
    webserverDisabled: {
      type: 'boolean',
      default: env.DISABLE_WEBSERVER,
      description: 'Stop the webserver from starting (default: `false`)',
    },
    runSeeds: {
      type: 'boolean',
      default: false,
      description: 'Run database seeds (default: `false`)',
    },
    runCreateDatabase: {
      type: 'boolean',
      default: false,
      description: 'Create database on startup',
    },
    runDropDatabase: {
      type: 'boolean',
      default: false,
      description: 'Drop database on startup (not available in production)',
    },
    runMigrateLatest: {
      type: 'boolean',
      default: false,
      description: 'Migrate database to latest migration (default: `false`)',
    },
    runMigrateRollback: {
      type: 'boolean',
      default: false,
      description: 'Rollback database to last migration (default: `false`)',
    },
    shortLived: {
      type: 'boolean',
      default: false,
      description: 'Destroy app immediately after starting (used for one-off commands like seed and migrate) (default: `false`)',
    },
    models: {
      type: 'array',
      description: 'An array of model modules to use instead of searching with `modelPattern`',
      default: [],
    },
    routers: {
      type: 'array',
      description: 'An array of router modules to use instead of searching with `routerPattern`',
      default: [],
    },
    actions: {
      type: 'array',
      description: 'An array of action modules to use instead of searching with `actionPattern`',
      default: [],
    },
    seeds: {
      type: 'array',
      description: 'An array of seed modules to use instead of searching with `seedPattern`',
      default: [],
    },
    migrations: {
      type: 'array',
      description: 'An array of migration modules to use instead of searching with `migrationPattern`',
      default: [],
    },
    hooks: {
      type: 'array',
      description: 'An array of hook modules to use instead of searching with `hookPattern`',
      default: [],
    },
    optionsSchema: {
      type: 'object',
      description: 'JSON Schema properties object extending the options schema with additional values',
      default: {},
    }
  },
};
