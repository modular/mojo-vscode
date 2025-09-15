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
import { Logger } from '../logging';

/**
 * Check if user has NVIDIA Nsight extension installed.
 * Prompts user to install if not installed.
 * Returns undefined if extension is installed and enabled.
 * Returns an error message string if the extension is not enabled.
 */
export async function checkNsightInstall(logger: Logger) {
  const nsight = vscode.extensions.getExtension('nvidia.nsight-vscode-edition');
  if (!nsight) {
    // Tell the user to install the nsight extension.
    const message =
      'Unable to start the cuda-gdb debug session. You first need to install and enablethe NVIDIA Nsight extension (nsight-vscode-edition).';
    logger.info(message);
    const response = await vscode.window.showInformationMessage(
      'Unable to debug with cuda-gdb mode without the NVIDIA Nsight extension.',
      'Find NVIDIA Nsight extension',
    );
    if (response) {
      vscode.commands.executeCommand(
        'workbench.extensions.search',
        '@id:nvidia.nsight-vscode-edition',
      );
    }
    return message;
  }
  return false;
}
