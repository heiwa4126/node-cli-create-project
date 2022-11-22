import chalk from 'chalk';
import fs from 'fs';
import ncp from 'ncp';
import path from 'path';
import {promisify} from 'util';
import {execa} from 'execa';
import Listr from 'listr';
import {projectInstall} from 'pkg-install';


const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
  return copy(options.templateDirectory, options.targetDirectory, {
    clobber: false,
  });
}

async function initGit(options) {
  const result = await execa('git', ['init'], {
    cwd: options.targetDirectory,
  });
  if (result.failed) {
    return Promise.reject(new Error('Failed to initialize git'));
  }
  return;
}

export async function createProject(options) {
  options = {
    ...options,
    targetDirectory: options.targetDirectory || process.cwd(),
  };

  const currentFileUrl = import.meta.url;
  const templateDir = path.resolve(
    new URL(currentFileUrl).pathname,
    '../../templates',
    options.template.toLowerCase()
  );
  options.templateDirectory = templateDir;

  try {
    await access(templateDir, fs.constants.R_OK);
  } catch (err) {
    console.error('%s Invalid template name', chalk.red.bold('ERROR'));
    process.exit(1);
  }

  const tasks = new Listr([
    {
      title: 'プロジェクトファイルのコピー',
      task: () => copyTemplateFiles(options),
    },
    {
      title: 'gitの初期化',
      task: () => initGit(options),
      enabled: () => options.git,
    },
    {
      title: '依存関係のインストール',
      task: () =>
      projectInstall({
        cwd: options.targetDirectory,
      }),
      skip: () =>
      !options.runInstall
        ? '依存関係を自動的にインストールする場合は --install オプションを渡してください'
        : undefined,
    },
  ]);

  await tasks.run();
  console.log('%s プロジェクトの準備ができました', chalk.green.bold('完了'));
  return true;
}
