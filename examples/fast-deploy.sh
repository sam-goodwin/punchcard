
app=$1
arn=$2

rm -rf cdk.out

cdk synth -a $1

asset=$(find cdk.out | grep app.js | sed 's/\/app\.js//g' | head -1)

staging=$(mktemp -d)
function cleanup() {
  rm -rf $staging
}
trap cleanup EXIT


code=$staging/code.zip
cd $asset
zip $code -r *.js

unzip -l $code

aws lambda update-function-code --function-name $arn --zip-file fileb://$code
