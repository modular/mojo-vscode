# ===----------------------------------------------------------------------=== #
# Copyright (c) 2025, Modular Inc. All rights reserved.
#
# Licensed under the Apache License v2.0 with LLVM Exceptions:
# https://llvm.org/LICENSE.txt
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ===----------------------------------------------------------------------=== #


import sys
from pathlib import Path


JS_LICENSE_TEXT = """
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
""".strip()

PY_YAML_LICENSE_TEXT = """
# ===----------------------------------------------------------------------=== #
# Copyright (c) 2025, Modular Inc. All rights reserved.
#
# Licensed under the Apache License v2.0 with LLVM Exceptions:
# https://llvm.org/LICENSE.txt
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ===----------------------------------------------------------------------=== #
""".strip()

EXCLUDES = [Path(p) for p in [
    ".pre-commit-config.yaml",
    "package.json",
    "package-lock.json",
    "language-configuration.json",
    "extension/external/psList.ts",
    "extension/server/RpcServer.ts",
    "extension/logging.ts",
    "esbuild.mjs",
    "eslint.config.mjs",
    ".vscode-test.mjs",
]]


def check_file(path: Path):
    with open(path, "r") as f:
        contents = f.read().strip()

        if path in EXCLUDES:
            return True

        if path.suffix in [".js", ".ts", ".mjs"] and not contents.startswith(JS_LICENSE_TEXT):
            return False
        elif path.suffix in [".py", ".mojo", ".yaml"] and not contents.startswith(PY_YAML_LICENSE_TEXT):
            return False

    return True


def main():
    failing = []

    for arg in sys.argv[1:]:
        if not Path(arg).name.endswith((".js", ".ts", ".mjs")):
            continue

        if not check_file(Path(arg)):
            failing.append(arg)

    if len(failing) > 0:
        print("Missing license headers")
        for f in failing:
            print(f)

        sys.exit(1)


if __name__ == "__main__":
    main()
