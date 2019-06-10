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

function delete() {
  rm -rf ${working_dir}
}
trap delete EXIT

version=$(node -e "console.log(require('./packages/punchcard/package.json').version);")

lerna --scope punchcard exec -- npm pack

rsync -av --exclude='node_modules' --exclude='cdk.out' --exclude='.cdk.staging' --exclude='.punchcard' ./examples/* ${working_dir}

cd ${working_dir}

npm install --production
npm install --production ${project_dir}/packages/punchcard/punchcard-${version}.tgz

if [ "$1" = "deploy" ]; then
  find ./lib -name '*.js' -exec cdk deploy -y -a {} \;
else 
  find ./lib -name '*.js' -exec cdk synth -a {} \;
fi