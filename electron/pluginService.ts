import fs from 'fs';
import log from 'loglevel';
import fetch from 'node-fetch';
import path from 'path';
import tar from 'tar';
import util from 'util';

import {MonoklePlugin, isPluginPackageJson, isTemplatePluginModule} from '@models/plugin';

import {downloadFile} from '@utils/http';

const fsExistsPromise = util.promisify(fs.exists);
const fsReadFilePromise = util.promisify(fs.readFile);
const fsMkdirPromise = util.promisify(fs.mkdir);
const fsUnlinkPromise = util.promisify(fs.unlink);
const fsRmPromise = util.promisify(fs.rm);
const fsReadDirPromise = util.promisify(fs.readdir);

const GITHUB_URL = 'https://github.com';
const GITHUB_REPOSITORY_REGEX = /^https:\/\/github.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;

function isValidRepositoryUrl(repositoryUrl: string) {
  return GITHUB_REPOSITORY_REGEX.test(repositoryUrl);
}

function extractRepositoryOwnerAndName(pluginUrl: string) {
  if (!isValidRepositoryUrl(pluginUrl)) {
    throw new Error('Invalig repository URL');
  }
  const repositoryPath = pluginUrl.split(`${GITHUB_URL}/`)[1];
  const [repositoryOwner, repositoryName] = repositoryPath.split('/');

  return {
    repositoryOwner,
    repositoryName,
  };
}

async function fetchPackageJson(repositoryOwner: string, repositoryName: string, targetCommitish: string) {
  const packageJsonUrl = `https://raw.githubusercontent.com/${repositoryOwner}/${repositoryName}/${targetCommitish}/package.json`;
  const packageJsonResponse = await fetch(packageJsonUrl);
  if (!packageJsonResponse.ok) {
    throw new Error("Couldn't find package.json file in the repository");
  }
  const packageJson = await packageJsonResponse.json();
  return packageJson;
}

export async function downloadPlugin(pluginUrl: string, pluginsDir: string) {
  const {repositoryOwner, repositoryName} = extractRepositoryOwnerAndName(pluginUrl);
  const repositoryBranch = 'main'; // TODO: allow input of branch name
  const packageJson = await fetchPackageJson(repositoryOwner, repositoryName, repositoryBranch);

  if (!isPluginPackageJson(packageJson)) {
    throw new Error('The package.json file is not valid');
  }

  const doesPluginsDirExist = await fsExistsPromise(pluginsDir);
  if (!doesPluginsDirExist) {
    await fsMkdirPromise(pluginsDir);
  }

  const pluginTarballFilePath = path.join(
    pluginsDir,
    `${repositoryOwner}-${repositoryName}-${packageJson.version.replace('.', '-')}.tgz`
  );
  if (fs.existsSync(pluginTarballFilePath)) {
    await fsUnlinkPromise(pluginTarballFilePath);
  }
  const pluginTarballUrl = `https://api.github.com/repos/${repositoryOwner}/${repositoryName}/tarball/${repositoryBranch}`;
  await downloadFile(pluginTarballUrl, pluginTarballFilePath);

  const pluginFolderPath: string = path.join(pluginsDir, `${repositoryOwner}-${repositoryName}`);

  if (fs.existsSync(pluginFolderPath)) {
    await fsRmPromise(pluginFolderPath, {recursive: true});
  }

  await fsMkdirPromise(pluginFolderPath);

  await tar.extract({
    file: pluginTarballFilePath,
    cwd: pluginFolderPath,
    strip: 1,
  });

  const plugin: MonoklePlugin = {
    name: packageJson.name,
    author: packageJson.author,
    version: packageJson.version,
    description: packageJson.description,
    isActive: packageJson.monoklePlugin.modules.every(module => isTemplatePluginModule(module)),
    repository: {
      owner: repositoryOwner,
      name: repositoryName,
      branch: repositoryBranch,
    },
    modules: packageJson.monoklePlugin.modules,
  };

  return plugin;
}

const getSubfolders = async (folderPath: string) => {
  const subfolders = await fsReadDirPromise(folderPath, {withFileTypes: true});
  return subfolders.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
};

async function parsePlugin(pluginsDir: string, pluginFolderName: string): Promise<MonoklePlugin | undefined> {
  const pluginFolderPath = path.join(pluginsDir, pluginFolderName);
  const packageJsonFilePath = path.join(pluginFolderPath, 'package.json');
  const doesPackageJsonFileExist = await fsExistsPromise(packageJsonFilePath);
  if (!doesPackageJsonFileExist) {
    log.warn(`[Plugins]: Missing package.json for plugin ${pluginFolderPath}`);
    return;
  }
  const packageJsonRaw = await fsReadFilePromise(packageJsonFilePath, 'utf8');
  const packageJson = JSON.parse(packageJsonRaw);

  if (!isPluginPackageJson(packageJson)) {
    throw new Error('The package.json file is not valid.');
  }

  if (!packageJson.repository) {
    log.warn(`[Plugins]: Missing 'repository' property in ${packageJsonFilePath}`);
    return;
  }

  const {repositoryOwner, repositoryName} = extractRepositoryOwnerAndName(packageJson.repository);

  return {
    name: packageJson.name,
    author: packageJson.author,
    version: packageJson.version,
    description: packageJson.description,
    isActive: packageJson.monoklePlugin.modules.every(module => isTemplatePluginModule(module)),
    repository: {
      owner: repositoryOwner,
      name: repositoryName,
      branch: 'main', // TODO: handle the branch name
    },
    modules: packageJson.monoklePlugin.modules,
  };
}

export async function loadPlugins(pluginsDir: string) {
  const pluginFolders = await getSubfolders(pluginsDir);

  const pluginsParsingResults = await Promise.allSettled(
    pluginFolders.map(pluginFolderName => parsePlugin(pluginsDir, pluginFolderName))
  );

  const plugins = pluginsParsingResults
    .filter((r): r is {status: 'fulfilled'; value: MonoklePlugin} => r.status === 'fulfilled' && r.value !== undefined)
    .map(r => r.value);

  return plugins;
}
