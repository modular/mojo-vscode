//===----------------------------------------------------------------------===//
//
// This file is Modular Inc proprietary.
//
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
