const path = require('path');
const { writeFileSync } = require('fs');
const optionsSchema = require('../lib/options');

const options = Object.entries(optionsSchema.properties).map(
  ([name, prop]) => ({ name, ...prop }
));

const src = '## Options\n\n' + [
  '|Name|Description|',
  '|-|-|',
  ...options.map(option =>
    `|\`${option.name}\`|${option.description}|`
  )
].join('\n');

writeFileSync(path.resolve(__dirname, '..', 'docs', 'options.md'));
