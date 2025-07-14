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
const execFile = util.promisify(callbackExecFile);

export enum SDKKind {
  Environment = 'environment',
  Custom = 'custom',
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
      this.api.environments.onDidChangeActiveEnvironmentPath((_) =>
        this.envChangeEmitter.fire(),
      ),
    );
  }

  /// Inform the user that they need to install the MAX SDK.
  public async showInstallWarning() {
    await vscode.window.showErrorMessage(
      'The MAX SDK is not installed in your current Python environment. Please install the MAX SDK or select a Python environment with MAX installed.',
    );
  }

  /// Retrieves the active SDK from the currently active Python virtual environment, or undefined if one is not present.
  public async getActiveSDK(): Promise<SDK | undefined> {
    assert(this.api !== undefined);
    const envPath = this.api.environments.getActiveEnvironmentPath();
    const env = await this.api.environments.resolveEnvironment(envPath);
    this.logger.info('Loading MAX SDK information from Python venv');

    if (!env) {
      return undefined;
    }

    if (!env.environment) {
      return undefined;
    }

    this.logger.info(`Found Python environment at ${envPath.path}`);

    const homePath = path.join(env.executable.sysPrefix, 'share', 'max');
    return this.createSDKFromHomePath(SDKKind.Environment, homePath);
  }

  /// Attempts to create a SDK from a home path. Returns undefined if creation failed.
  public async createSDKFromHomePath(
    kind: SDKKind,
    homePath: string,
  ): Promise<SDK | undefined> {
    const modularCfgPath = path.join(homePath, 'modular.cfg');
    try {
      const decoder = new TextDecoder();
      const bytes = await vscode.workspace.fs.readFile(
        vscode.Uri.file(modularCfgPath),
      );
      const contents = decoder.decode(bytes);
      const config = ini.parse(contents);
      this.logger.info(`Found SDK with version ${config.max.version}`);

      this.reporter.sendTelemetryEvent('sdkLoaded', {
        version: config.max.version,
        kind,
      });

      return new SDK(
        this.logger,
        kind,
        config.max.version,
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
      this.logger.error('Error loading SDK', e);
      return undefined;
    }
  }
}
