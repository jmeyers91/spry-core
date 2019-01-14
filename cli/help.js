
module.exports = function help(_, root, args) {
  console.log([
    `Usage: cli <command> [--root path] [...args]`,
    '',
    'Run your app',
    '  start      Start the app',
    '  watch      Start the app and restart on changes',
    '',
    'Manage the database',
    '  migrate    Run database migrations',
    '  rollback   Rollback database migrations',
    '  seed       Run database seeds',
    '',
    'Generate project files',
    '  gen        Generate project files',
  ].join('\n'));
}
