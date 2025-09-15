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

import * as assert from 'assert';
import * as vscode from 'vscode';
import { extension } from './extension';
import { SDKKind } from './pyenv';

suite('pyenv', function () {
  test('should detect Pixi environments', async function () {
    await vscode.commands.executeCommand('mojo.extension.restart');
    const sdk = await extension.pyenvManager!.getActiveSDK();
    assert.ok(sdk);
    assert.strictEqual(sdk.kind, SDKKind.Environment);
    assert.strictEqual(sdk.version, '25.5.0.dev2025071605');
  });
});
