#!/bin/bash

# Cleans, bootstraps and builds the punchcard mono-repo.

set -euo pipefail

npm install

./node_modules/.bin/lerna clean -y
./node_modules/.bin/lerna bootstrap --ci
./node_modules/.bin/lerna run build
./node_modules/.bin/lerna run test
