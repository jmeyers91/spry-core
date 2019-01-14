#!/usr/bin/env node

const path = require('path');
const { existsSync } = require('fs');
const yargsParser = require('yargs-parser');

const commands = ['gen', 'help', 'migrate', 'rollback', 'seed', 'start', 'watch'];
const command = process.argv[2];
const args = yargsParser(process.argv.slice(3));
const root = args.root ? path.resolve(args.root) : process.cwd();
require('dotenv').config({ path: getDotEnvPath(root) });

getCommandScript(command)(require('../lib/index'), root, args, command)

function getCommandScript(command) {
  if(!command) {
    return require('./help');
  } else if(commands.includes(command)) {
    return require(`./${command}`);
  } else {
    console.log(`Command not found "${command}"`);
    return require('./help');
  }
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
