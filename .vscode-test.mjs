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

import { defineConfig } from '@vscode/test-cli';

const baseConfig = {
  platform: 'desktop',
  version: '1.92.2',
  mocha: {
    timeout: 5 * 60 * 1000,
    reporter: 'out/test/reporter.js',
  },
};

export default defineConfig([
  {
    ...baseConfig,
    label: 'default',
    workspaceFolder: './',
    files: 'out/**/*.test.default.js',
  },
  {
    ...baseConfig,
    label: 'pixi',
    workspaceFolder: 'fixtures/pixi-workspace/',
    files: 'out/**/*.test.pixi.js',
  },
]);
