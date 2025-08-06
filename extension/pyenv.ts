//===----------------------------------------------------------------------===//
//
// This file is Modular Inc proprietary.
//
//===----------------------------------------------------------------------===//

import * as vscode from 'vscode';
import * as ini from 'ini';
import { DisposableContext } from './utils/disposableContext';
import { PythonExtension } from '@vscode/python-extension';
import assert from 'assert';
import { Logger } from './logging';
import path from 'path';
import * as util from 'util';
import { execFile as callbackExecFile } from 'child_process';
import { Memoize } from 'typescript-memoize';
import { TelemetryReporter } from './telemetry';
import { directoryExists } from './utils/files';
const execFile = util.promisify(callbackExecFile);

export enum SDKKind {
  Environment = 'environment',
  Custom = 'custom',
  Internal = 'internal',
}

/// Represents a usable instance of the MAX SDK.
export class SDK {
  constructor(
    private logger: Logger,
    /// What kind of SDK this is. Primarily used for logging and context hinting.
    readonly kind: SDKKind,
    /// The unparsed version string of the SDK.
    readonly version: string,
    /// The home path of the SDK. This is always a directory containing a modular.cfg file.
    readonly homePath: string,
    /// The path to the language server executable.
    readonly lspPath: string,
    /// The path to the mblack executable.
    readonly mblackPath: string,
    /// The path to the Mojo LLDB plugin.
    readonly lldbPluginPath: string,
    /// The path to the DAP server executable.
    readonly dapPath: string,
    /// The path to the Mojo executable.
    readonly mojoPath: string,
    /// The path to the directory containing LLDB debug visualizers.
    readonly visualizersPath: string,
    /// The path to the LLDB executor.
    readonly lldbPath: string,
  ) {}

  @Memoize()
  /// Checks if the version of LLDB shipped with this SDK supports Python scripting.
  public async lldbHasPythonScriptingSupport(): Promise<boolean> {
    try {
      let { stdout, stderr } = await execFile(this.lldbPath, [
        '-b',
        '-o',
        'script print(100+1)',
      ]);
      stdout = (stdout || '') as string;
      stderr = (stderr || '') as string;

      if (stdout.indexOf('101') != -1) {
        this.logger.info('Python scripting support in LLDB found.');
        return true;
      } else {
        this.logger.info(
          `Python scripting support in LLDB not found. The test script returned:\n${
            stdout
          }\n${stderr}`,
        );
      }
    } catch (e) {
      this.logger.error(
        'Python scripting support in LLDB not found. The test script failed with',
        e,
      );
    }
    return false;
  }

  /// Gets an appropriate environment to spawn subprocesses from this SDK.
  public getProcessEnv(withTelemetry: boolean = true) {
    return {
      MODULAR_HOME: this.homePath,
      MODULAR_TELEMETRY_ENABLED: withTelemetry ? 'true' : 'false',
    };
  }
}

export class PythonEnvironmentManager extends DisposableContext {
  private api: PythonExtension | undefined = undefined;
  private logger: Logger;
  private reporter: TelemetryReporter;
  public onEnvironmentChange: vscode.Event<void>;
  private envChangeEmitter: vscode.EventEmitter<void>;
  private displayedSDKError: boolean = false;

  constructor(logger: Logger, reporter: TelemetryReporter) {
    super();
    this.logger = logger;
    this.reporter = reporter;
    this.envChangeEmitter = new vscode.EventEmitter();
    this.onEnvironmentChange = this.envChangeEmitter.event;
  }

  public async init() {
    this.api = await PythonExtension.api();
    this.pushSubscription(
      this.api.environments.onDidChangeActiveEnvironmentPath((_) => {
        this.displayedSDKError = false;
        this.envChangeEmitter.fire();
      }),
    );
  }

  /// Retrieves the active SDK from the currently active Python virtual environment, or undefined if one is not present.
  public async getActiveSDK(): Promise<SDK | undefined> {
    assert(this.api !== undefined);
    // Prioritize retrieving a monorepo SDK over querying the environment.
    const monorepoSDK = await this.tryGetMonorepoSDK();

    if (monorepoSDK) {
      this.logger.info(
        'Monorepo SDK found, prioritizing that over Python environment.',
      );
      return monorepoSDK;
    }

    const envPath = this.api.environments.getActiveEnvironmentPath();
    const env = await this.api.environments.resolveEnvironment(envPath);
    this.logger.info('Loading MAX SDK information from Python venv');

    if (!env) {
      this.logger.error(
        'No Python enviroment could be retrieved from the Python extension.',
      );
      await this.displaySDKError(
        'Unable to load a Python enviroment from the VS Code Python extension.',
      );
      return undefined;
    }

    this.logger.info(`Found Python environment at ${envPath.path}`);

    const homePath = path.join(env.executable.sysPrefix, 'share', 'max');
    if (!(await directoryExists(homePath))) {
      this.logger.error(
        `SDK home path ${homePath} does not exist in the Python environment's system prefix. MAX is not installed.`,
      );
      await this.displaySDKError(
        `MAX is not installed in Python environment located at ${envPath.path}. Please install the MAX SDK to proceed.`,
      );
      return undefined;
    }

    return this.createSDKFromHomePath(SDKKind.Environment, homePath);
  }

  private async displaySDKError(message: string) {
    if (this.displayedSDKError) {
      return;
    }

    this.displayedSDKError = true;
    await vscode.window.showErrorMessage(message);
  }

  /// Attempts to create a SDK from a home path. Returns undefined if creation failed.
  public async createSDKFromHomePath(
    kind: SDKKind,
    homePath: string,
  ): Promise<SDK | undefined> {
    const modularCfgPath = path.join(homePath, 'modular.cfg');
    const decoder = new TextDecoder();
    let bytes;
    try {
      bytes = await vscode.workspace.fs.readFile(
        vscode.Uri.file(modularCfgPath),
      );
    } catch (e) {
      await this.displaySDKError(`Unable to read modular.cfg: ${e}`);
      this.logger.error('Error reading modular.cfg', e);
      return undefined;
    }

    let contents;
    try {
      contents = decoder.decode(bytes);
    } catch (e) {
      await this.displaySDKError(
        'Unable to decode modular.cfg; your MAX installation may be corrupted.',
      );
      this.logger.error('Error decoding modular.cfg bytes to string', e);
      return undefined;
    }

    let config;
    try {
      config = ini.parse(contents);
    } catch (e) {
      await this.displaySDKError(
        'Unable to parse modular.cfg; your MAX installation may be corrupted.',
      );
      this.logger.error('Error parsing modular.cfg contents as INI', e);
      return undefined;
    }

    try {
      const version = 'version' in config.max ? config.max.version : '0.0.0';
      this.logger.info(`Found SDK with version ${version}`);

      this.reporter.sendTelemetryEvent('sdkLoaded', {
        version,
        kind,
      });

      return new SDK(
        this.logger,
        kind,
        version,
        homePath,
        config['mojo-max']['lsp_server_path'],
        config['mojo-max']['mblack_path'],
        config['mojo-max']['lldb_plugin_path'],
        config['mojo-max']['lldb_vscode_path'],
        config['mojo-max']['driver_path'],
        config['mojo-max']['lldb_visualizers_path'],
        config['mojo-max']['lldb_path'],
      );
    } catch (e) {
      await this.displaySDKError(
        'Unable to read a configuration key from modular.cfg; your MAX installation may be corrupted.',
      );
      this.logger.error('Error creating SDK from modular.cfg', e);
      return undefined;
    }
  }

  /// Attempt to load a monorepo SDK from the currently open workspace folder.
  /// Resolves with the loaded SDK, or undefined if one doesn't exist.
  private async tryGetMonorepoSDK(): Promise<SDK | undefined> {
    if (!vscode.workspace.workspaceFolders) {
      return;
    }

    if (vscode.workspace.workspaceFolders.length !== 1) {
      return;
    }

    const folder = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders[0].uri,
      '.derived',
    );
    try {
      const info = await vscode.workspace.fs.stat(folder);
      if (info.type & vscode.FileType.Directory) {
        return this.createSDKFromHomePath(SDKKind.Internal, folder.fsPath);
      }
    } catch (e) {
      this.logger.error(`Error reading ${folder.fsPath}`, e);
      return undefined;
    }
  }
}
