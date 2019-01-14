const path = require('path');
const { readFileSync, existsSync, writeFileSync } = require('fs');
const makeDir = require('make-dir');
const Handlebars = require('handlebars');
const inquirer = require('inquirer');
const upperFirst = require('lodash.upperfirst');
const camelCase = require('lodash.camelcase');
const snakeCase = require('lodash.snakecase');
const templates = require('../templates');
const now = new Date();

Handlebars.registerHelper('camelCase', s => camelCase(s));
Handlebars.registerHelper('snakeCase', s => snakeCase(s));
Handlebars.registerHelper('classNameCase', s => upperFirst(camelCase(s)));
Handlebars.registerPartial('timestamp', [
  now.getFullYear().toString(),
  zeroPad(now.getMonth() + 1, 2),
  zeroPad(now.getDate(), 2),
  zeroPad(now.getHours(), 2),
  zeroPad(now.getMinutes(), 2),
  zeroPad(now.getSeconds(), 2),
].join(''));

function zeroPad(number, length) {
	number = ''+number;
	while(number.length < length) number = '0' + number;
	return number;
}

function getTemplateByName(name) {
  return templates.find(template => template.name === name);
}

async function promptWithPrefils(prompts, prefilled) {
  const promptsWithoutPrefills = prompts.slice(prefilled.length);
  const prefilledAnswers = {};

  for(let i = 0; i < prefilled.length; i++) {
    const prompt = prompts[i];
    const value = prefilled[i];
    if(prompt) {
      prefilledAnswers[prompt.name] = value;
    }
  }

  if(promptsWithoutPrefills.length === 0) return prefilledAnswers;
  const answers = await inquirer.prompt(promptsWithoutPrefills);

  return {
    ...prefilledAnswers,
    ...answers,
  };
}

module.exports = async function gen(root, args) {
  let [ _, templateName, ...prefilled ] = args._;

  if(!templateName) {
    const listAnswers = await inquirer.prompt([
      {
        name: 'templateName',
        type: 'list',
        message: 'Select a template',
        default: 'yes',
        choices: templates.map(t => t.name)
      },
    ]);
    templateName = listAnswers.templateName;
  }

  renderTemplate(templateName, prefilled);

  async function renderTemplate(name, prefilled) {
    const template = getTemplateByName(name);

    if(!template) {
      console.log(`Unknown template "${name}"\nValid templates ${templates.map(t => t.name).join(', ')}`)
      return;
    }
  
    const render = Handlebars.compile(readFileSync(template.path, 'utf8'));
    const answers = await promptWithPrefils(template.prompts, prefilled);
    const resultSrc = render(answers);
    const renderedOutPath = path.resolve(root, Handlebars.compile(template.outPath)(answers));

    if(existsSync(renderedOutPath)) {
      console.log(`A file already exists at "${renderedOutPath}"`);
    } else {
      await makeDir(path.parse(renderedOutPath).dir);
      writeFileSync(renderedOutPath, resultSrc);
      console.log(`${name} -> ${path.relative(root, renderedOutPath)}`);
      if(template.after) {
        await template.after(answers, renderTemplate)
      }
    }
  }
}
