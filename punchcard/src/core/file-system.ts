// import AWS = require('aws-sdk');

// import fs = require('fs');
// import path = require('path');
// import util = require('util');

// const copyFile = util.promisify(fs.copyFile);
// const exists = util.promisify(fs.exists);
// const mkdir = util.promisify(fs.mkdir);
// const readFile = util.promisify(fs.readFile);
// const symlink = util.promisify(fs.symlink);
// const writeFile = util.promisify(fs.writeFile);
// const chmod = util.promisify(fs.chmod);

// export class File implements Dependency<File.Reference> {
//   private readonly symbol = Symbol();
//   constructor(
//     public readonly asset: assets.Asset) {
//   }

//   public install(namespace: Namespace, grantable: iam.IGrantable): void {
//     namespace.set('s3BucketName', this.asset.s3BucketName);
//     namespace.set('s3ObjectKey', this.asset.s3ObjectKey);
//     if ((grantable as any)[this.symbol] !== true) {
//       this.asset.grantRead(grantable);
//       (grantable as any)[this.symbol] = true;
//     }
//   }

//   public async bootstrap(namespace: Namespace, cache: Cache): Promise<File.Reference> {
//     const key = namespace.get('s3ObjectKey');
//     const file = path.join('/tmp', key);

//     if (! await exists(file)) {
//       const s3 = cache.getOrCreate('aws:s3', () => new AWS.S3());
//       await promisifiedPipe(s3
//         .getObject({
//           Bucket: namespace.get('s3BucketName'),
//           Key: key,
//         })
//         .createReadStream()
//         .pipe(fs.createWriteStream(file)));
//     }

//     return new File.Reference(file);
//   }
// }

export namespace File {
  export class Reference {
    constructor(public readonly path: string) {}
  }
}

/**
 * Streams input to output and resolves only after stream has successfully ended.
 * Closes the output stream in success and error cases.
 * @param input {stream.Readable} Read from
 * @param output {stream.Writable} Write to
 * @return Promise Resolves only after the output stream is "end"ed or "finish"ed.
 * @see https://stackoverflow.com/questions/44013020/using-promises-with-streams-in-node-js
 */
// @ts-ignore
function promisifiedPipe(input: any, output?: any) {
  let ended = false;
  function end() {
    if (!ended) {
      ended = true;
      // tslint:disable: no-unused-expression
      output.close && output.close();
      input.close && input.close();
      return true;
    }
    return false;
  }

  return new Promise((resolve, reject) => {
    input.pipe(output);
    input.on('error', errorEnding);

    function niceEnding() {
      if (end()) {
        resolve();
      }
    }

    function errorEnding(error: Error) {
      if (end()) {
        reject(error);
      }
    }

    output.on('finish', niceEnding);
    output.on('end', niceEnding);
    output.on('error', errorEnding);
  });
}
