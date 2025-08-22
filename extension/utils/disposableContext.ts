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

import * as vscode from 'vscode';
import { Subscription } from 'rxjs';

/**
 * This class provides a simple wrapper around vscode.Disposable that allows
 * for registering additional disposables.
 */
export class DisposableContext implements vscode.Disposable {
  private _disposables: vscode.Disposable[] = [];

  constructor() {}

  public dispose() {
    for (const disposable of this._disposables) {
      disposable.dispose();
    }
    this._disposables = [];
  }

  /**
   * Push an additional disposable to the context.
   *
   * @param disposable The disposable to register.
   */
  public pushSubscription(disposable: vscode.Disposable) {
    this._disposables.push(disposable);
  }

  public pushRxjsSubscription(subs: Subscription) {
    this._disposables.push(
      new vscode.Disposable(() => {
        subs.unsubscribe();
      }),
    );
  }
}
