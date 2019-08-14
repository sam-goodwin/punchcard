import util = require('util');
import zlib = require('zlib');

export interface Compression {
  type: CompressionType;
  extension?: string;
  isCompressed: boolean;
  compress(content: Buffer): Promise<Buffer>;
  decompress(content: Buffer): Promise<Buffer>;
}

export enum CompressionType {
  UNCOMPRESSED = "UNCOMPRESSED",
  GZIP = "GZIP",
  ZIP = "ZIP",
  Snappy = "Snappy"
}

export namespace Compression {
  // tslint:disable: variable-name
  export const None: Compression = {
    type: CompressionType.UNCOMPRESSED,
    isCompressed: false,
    compress: content => Promise.resolve(content),
    decompress: content => Promise.resolve(content),
  };
  export const Gzip: Compression = {
    type: CompressionType.GZIP,
    extension: 'gz',
    isCompressed: true,
    compress: util.promisify(zlib.gzip),
    decompress: util.promisify(zlib.gunzip)
  };
  export const Zip: Compression = {
    type: CompressionType.ZIP,
    extension: 'zip',
    isCompressed: true,
    compress: util.promisify(zlib.deflate),
    decompress: util.promisify(zlib.inflate)
  };
}
