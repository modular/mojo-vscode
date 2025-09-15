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

import { DisposableContext } from '../utils/disposableContext';
import * as vscode from 'vscode';
import { MessageSignature, CancellationToken } from 'vscode-languageclient';
import { createWriteStream, WriteStream } from 'fs';

export class LSPRecorder extends DisposableContext {
  private output: WriteStream;

  constructor(outPath: string) {
    super();

    this.output = createWriteStream(outPath);

    this.pushSubscription(
      new vscode.Disposable(() => {
        this.output.close();
      }),
    );
  }

  // Follows GeneralMiddleware implementation from vscode-languageclient.
  public sendRequest<P, R>(
    type: string | MessageSignature,
    param: P | undefined,
    token: CancellationToken | undefined,
    next: (
      type: string | MessageSignature,
      param?: P,
      token?: CancellationToken,
    ) => Promise<R>,
  ): Promise<R> {
    const message = {
      type: 'request',
      method: type,
      param: param,
    };

    this.output.write(JSON.stringify(message));
    this.output.write('\n');
    return next(type, param, token);
  }

  public sendNotification<P>(
    type: string | MessageSignature,
    next: (type: string | MessageSignature, params?: P) => Promise<void>,
    param: P,
  ): Promise<void> {
    const message = {
      type: 'notification',
      method: type,
      param: param,
    };

    this.output.write(JSON.stringify(message));
    this.output.write('\n');
    return next(type, param);
  }
}
