//===----------------------------------------------------------------------===
// Copyright (c) 2025, Modular Inc. All rights reserved.
//
// Licensed under the Apache License v2.0 with LLVM Exceptions:
// https://llvm.org/LICENSE.txt
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//===----------------------------------------------------------------------===
//
// Implements a wrapper around @vscode/extension-telemetry to allow us more
// control over the telemetry reporting process.
//
//===----------------------------------------------------------------------===//

import * as vscode from 'vscode';

import BaseTelemetryReporter from '@vscode/extension-telemetry';
import {
  TelemetryEventProperties,
  TelemetryEventMeasurements,
} from '@vscode/extension-telemetry';

export class TelemetryReporter implements vscode.Disposable {
  /**
   * Enables or disables telemetry reporting. If this flag is set to `false`,
   * calls to telemetry reporting methods will become no-ops.
   */
  get enabled() {
    return this.reporter !== undefined && this._enabled;
  }

  set enabled(value) {
    this._enabled = value;
  }

  private _enabled: boolean = true;

  private reporter?: BaseTelemetryReporter;
  private additionalProperties: { [key: string]: string } = {};
  private additionalMeasurements: { [key: string]: number } = {};

  /**
   * Creates a new telemetry reporter. If the connection string is undefined,
   * the reporter will be permanently disabled and will never report telemetry
   * to the remote server.
   */
  constructor(connectionString?: string) {
    if (connectionString) {
      this.reporter = new BaseTelemetryReporter(connectionString);
    }
  }

  public sendTelemetryEvent(
    eventName: string,
    properties?: TelemetryEventProperties,
    measurements?: TelemetryEventMeasurements,
  ): void {
    if (!this.enabled || !this.reporter) {
      return;
    }

    this.reporter.sendTelemetryEvent(
      eventName,
      { ...properties, ...this.additionalProperties },
      { ...measurements, ...this.additionalMeasurements },
    );
  }

  public sendTelemetryErrorEvent(
    eventName: string,
    properties?: TelemetryEventProperties,
    measurements?: TelemetryEventMeasurements,
  ): void {
    if (!this.enabled || !this.reporter) {
      return;
    }

    this.reporter.sendTelemetryErrorEvent(
      eventName,
      { ...properties, ...this.additionalProperties },
      { ...measurements, ...this.additionalMeasurements },
    );
  }

  public dispose() {
    if (this.reporter) {
      this.reporter.dispose();
    }
  }
}
