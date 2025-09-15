//===----------------------------------------------------------------------===//
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
//===----------------------------------------------------------------------===//

import * as vscode from 'vscode';
import { Optional } from '../types';

/**
 *  Gets the config value `mojo.<key>`, with an optional workspace folder.
 */
export function get<T>(
  key: string,
  workspaceFolder: Optional<vscode.WorkspaceFolder>,
): Optional<T>;

/**
 *  Gets the config value `mojo.<key>`, with an optional workspace folder and a
 * default value.
 */
export function get<T>(
  key: string,
  workspaceFolder: Optional<vscode.WorkspaceFolder>,
  defaultValue: T,
): T;

export function get<T>(
  key: string,
  workspaceFolder: Optional<vscode.WorkspaceFolder> = undefined,
  defaultValue: Optional<T> = undefined,
): Optional<T> {
  if (defaultValue === undefined) {
    return vscode.workspace
      .getConfiguration('mojo', workspaceFolder)
      .get<T>(key);
  }
  return vscode.workspace
    .getConfiguration('mojo', workspaceFolder)
    .get<T>(key, defaultValue);
}

/**
 *  Sets the config value `mojo.<key>`.
 */
export function update<T>(
  key: string,
  value: T,
  target?: vscode.ConfigurationTarget,
) {
  return vscode.workspace.getConfiguration('mojo').update(key, value, target);
}
