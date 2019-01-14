const path = require('path');

module.exports = [
  {
    name: 'model',
    path: path.resolve(__dirname, 'model.hbs'),
    outPath: 'models/{{{ classNameCase name }}}.model.js',
    prompts: [
      {
        name: 'name',
        type: 'input',
        message: 'Model name'
      },
      {
        name: 'createTable',
        type: 'list',
        message: 'Create table migration',
        default: 'yes',
        choices: ['yes', 'no']
      },
    ],
    after({ name, createTable }, renderTemplate) {
      if(createTable === 'yes') {
        return renderTemplate('table', [name]);
      }
    },
  },

  {
    name: 'action',
    path: path.resolve(__dirname, 'action.hbs'),
    outPath: 'actions/{{{ camelCase name }}}.action.js',
    prompts: [
      {
        name: 'name',
        type: 'input',
        message: 'action name'
      },
    ],
  },

  {
    name: 'router',
    path: path.resolve(__dirname, 'router.hbs'),
    outPath: 'routers/{{{ camelCase name }}}.router.js',
    prompts: [
      {
        name: 'name',
        type: 'input',
        message: 'router name'
      },
    ],
  },

  {
    name: 'seed',
    path: path.resolve(__dirname, 'seed.hbs'),
    outPath: 'seeds/{{{ camelCase name }}}.seed.js',
    prompts: [
      {
        name: 'name',
        type: 'input',
        message: 'seed name'
      },
    ],
  },

  {
    name: 'migration',
    path: path.resolve(__dirname, 'migration.hbs'),
    outPath: 'migrations/{{> timestamp}}_{{{ snakeCase name }}}.migration.js',
    prompts: [
      {
        name: 'name',
        type: 'input',
        message: 'migration name'
      },
    ],
  },

  {
    name: 'table',
    path: path.resolve(__dirname, 'table.hbs'),
    outPath: 'migrations/{{> timestamp}}_create_{{{ snakeCase name }}}_table.migration.js',
    prompts: [
      {
        name: 'name',
        type: 'input',
        message: 'table name'
      },
    ],
  },
];
