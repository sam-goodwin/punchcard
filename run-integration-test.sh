#! /bin/sh

# makes sure that the examples synth OK by installing the packed punchcard tarball

set -e
set -x

lerna clean -y
lerna bootstrap
lerna run build
lerna run test

project_dir=$(pwd)
working_dir=$(mktemp -d)
echo ${working_dir}

function delete() {
  rm -rf ${working_dir}
}
trap delete EXIT

version=$(node -e "console.log(require('./packages/punchcard/package.json').version);")

lerna --scope punchcard exec -- npm pack

rsync -av --exclude='node_modules' --exclude='cdk.out' --exclude='.cdk.staging' ./examples/* ${working_dir}

cd ${working_dir}

npm install --production
npm install --production ${project_dir}/packages/punchcard/punchcard-${version}.tgz

find ./lib -name '*.js' -not -path './lib/.punchcard/*' -exec cdk synth -a {} \;
