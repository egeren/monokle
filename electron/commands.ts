import {BrowserWindow, dialog} from 'electron';

import {execSync} from 'child_process';
import {AnyAction} from 'redux';
import {VM} from 'vm2';

import {NewVersionCode} from '@models/appconfig';

import {updateNewVersion} from '@redux/reducers/appConfig';
import {InterpolateTemplateOptions} from '@redux/services/templates';
import {KustomizeCommandOptions} from '@redux/thunks/previewKustomization';

import {FileExplorerOptions, FileOptions} from '@atoms/FileExplorer/FileExplorerOptions';

import {PROCESS_ENV} from '@utils/env';

import autoUpdater from './auto-update';

/**
 * called by thunk to preview a kustomization
 */

export const runKustomize = (options: KustomizeCommandOptions, event: Electron.IpcMainEvent) => {
  try {
    let cmd = options.kustomizeCommand === 'kubectl' ? 'kubectl kustomize ' : 'kustomize build ';
    if (options.enableHelm) {
      cmd += '--enable-helm ';
    }

    let stdout = execSync(`${cmd} "${options.folder}"`, {
      env: {
        NODE_ENV: PROCESS_ENV.NODE_ENV,
        PUBLIC_URL: PROCESS_ENV.PUBLIC_URL,
        PATH: PROCESS_ENV.PATH,
      },
      maxBuffer: 1024 * 1024 * 10,
      windowsHide: true,
    });

    event.sender.send('kustomize-result', {stdout: stdout.toString()});
  } catch (e: any) {
    event.sender.send('kustomize-result', {error: e.toString()});
  }
};

/**
 * prompts to select a file using the native dialogs
 */

export const selectFileDialog = (event: Electron.IpcMainInvokeEvent, options: FileExplorerOptions) => {
  const browserWindow = BrowserWindow.fromId(event.sender.id);
  let dialogOptions: Electron.OpenDialogSyncOptions = {};
  if (options.isDirectoryExplorer) {
    dialogOptions.properties = ['openDirectory'];
  } else {
    if (options.allowMultiple) {
      dialogOptions.properties = ['multiSelections'];
    }
    if (options.acceptedFileExtensions) {
      dialogOptions.filters = [{name: 'Files', extensions: options.acceptedFileExtensions}];
    }
  }

  dialogOptions.properties?.push('createDirectory');

  if (options.defaultPath) {
    dialogOptions.defaultPath = options.defaultPath;
  }

  if (browserWindow) {
    return dialog.showOpenDialogSync(browserWindow, dialogOptions);
  }
  return dialog.showOpenDialogSync(dialogOptions);
};

/**
 * prompts to select a file using the native dialogs
 */

export const saveFileDialog = (event: Electron.IpcMainInvokeEvent, options: FileOptions) => {
  const browserWindow = BrowserWindow.fromId(event.sender.id);
  let dialogOptions: Electron.SaveDialogSyncOptions = {};
  if (options.acceptedFileExtensions) {
    dialogOptions.filters = [{name: 'Files', extensions: options.acceptedFileExtensions}];
  }

  dialogOptions.properties?.push('createDirectory');

  if (options.defaultPath) {
    dialogOptions.defaultPath = options.defaultPath;
  }

  if (options.title) {
    dialogOptions.title = options.title;
  }

  if (browserWindow) {
    return dialog.showSaveDialogSync(browserWindow, dialogOptions);
  }
  return dialog.showSaveDialogSync(dialogOptions);
};

/**
 * called by thunk to preview a helm chart with values file
 */

export const runHelm = (args: any, event: Electron.IpcMainEvent) => {
  try {
    let stdout = execSync(args.helmCommand, {
      env: {
        NODE_ENV: PROCESS_ENV.NODE_ENV,
        PUBLIC_URL: PROCESS_ENV.PUBLIC_URL,
        KUBECONFIG: args.kubeconfig,
        PATH: PROCESS_ENV.PATH,
      },
      maxBuffer: 1024 * 1024 * 10,
      windowsHide: true,
    });

    event.sender.send('helm-result', {stdout: stdout.toString()});
  } catch (e: any) {
    event.sender.send('helm-result', {error: e.toString()});
  }
};

/**
 * Checks for a new version of monokle
 */

export const checkNewVersion = async (dispatch: (action: AnyAction) => void, initial?: boolean) => {
  try {
    dispatch(updateNewVersion({code: NewVersionCode.Checking, data: {initial: Boolean(initial)}}));
    await autoUpdater.checkForUpdates();
  } catch (error: any) {
    if (error.errno === -2) {
      dispatch(updateNewVersion({code: NewVersionCode.Errored, data: {errorCode: -2, initial: Boolean(initial)}}));
    } else {
      dispatch(updateNewVersion({code: NewVersionCode.Errored, data: {errorCode: null, initial: Boolean(initial)}}));
    }
  }
};

/**
 * Interpolates the provided vanilla template in a sandboxed vm
 */

export const interpolateTemplate = (args: InterpolateTemplateOptions, event: Electron.IpcMainEvent) => {
  const vm = new VM({
    eval: false,
    wasm: false,
    fixAsync: true,
    sandbox: {
      forms: args.formsData,
    },
  });
  let text: string = args.templateText;
  let result: string = '';

  let ix = text.indexOf('[[');
  while (ix >= 0) {
    let ix2 = text.indexOf(']]', ix + 2);
    if (ix2 === -1) {
      break;
    }
    result += text.substring(0, ix);
    const js = text.substring(ix + 2, ix2);

    try {
      result += vm.run(js);
    } catch (e: any) {
      console.error(`Failed to interpolate [${js}]`, e.message);
    }
    text = text.substring(ix2 + 2);

    ix = text.indexOf('[[');
  }

  // add any leftover
  result += text;

  event.sender.send('interpolate-vanilla-template-result', result);
};
