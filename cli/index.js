#!/usr/bin/env node

const path = require('path');
const yargsParser = require('yargs-parser');

const commands = ['gen', 'help', 'migrate', 'rollback', 'seed', 'start', 'watch'];
const args = yargsParser(process.argv.slice(2));
const command = args._.find(v => commands.includes(v)) || 'start';
const root = args.root ? path.resolve(args.root) : process.cwd();
const commandScript = getCommandScript(command);

commandScript(root, args, command);

function getCommandScript(command) {
  if(commands.includes(command)) {
    return require(`./${command}`);
  } else {
    return require('./help');
  }
}
