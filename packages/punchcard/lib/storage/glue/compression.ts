import util = require('util');
import zlib = require('zlib');

export interface Compression {
  extension?: string;
  isCompressed: boolean;
  compress(content: Buffer): Promise<Buffer>;
  decompress(content: Buffer): Promise<Buffer>;
}

export namespace Compression {
  // tslint:disable: variable-name
  export const None: Compression = {
    isCompressed: false,
    compress: content => Promise.resolve(content),
    decompress: content => Promise.resolve(content),
  };
  export const Gzip: Compression = {
    extension: 'gz',
    isCompressed: true,
    compress: util.promisify(zlib.gzip),
    decompress: util.promisify(zlib.gunzip)
  };
  export const Zip: Compression = {
    extension: 'zip',
    isCompressed: true,
    compress: util.promisify(zlib.deflate),
    decompress: util.promisify(zlib.inflate)
  };
}