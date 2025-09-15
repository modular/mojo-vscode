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

import { Disposable } from './types';

export class DisposableCallback implements Disposable {
  private callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
  }

  dispose(): void {
    this.callback();
  }
}

/**
 * This class provides a simple wrapper around `Disposable` that allows for
 * registering additional disposables.
 *
 * Note: We can't use vscode.Disposable because the proxy can't depend on the
 * VSCode API.
 */
export class DisposableContext implements Disposable {
  private _disposables: Disposable[] = [];

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
  public pushSubscription(disposable: Disposable) {
    this._disposables.push(disposable);
  }
}
