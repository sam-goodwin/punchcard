import util from "util";
import zlib from "zlib";

export interface Compression {
  compress(content: Buffer): Promise<Buffer>;
  decompress(content: Buffer): Promise<Buffer>;
  extension?: string;
  isCompressed: boolean;
  type: CompressionType;
}

export enum CompressionType {
  GZIP = "GZIP",
  Snappy = "Snappy",
  UNCOMPRESSED = "UNCOMPRESSED",
  ZIP = "ZIP",
}

export namespace Compression {
  export const None: Compression = {
    compress: (content) => Promise.resolve(content),
    decompress: (content) => Promise.resolve(content),
    isCompressed: false,
    type: CompressionType.UNCOMPRESSED,
  };
  export const Gzip: Compression = {
    compress: util.promisify(zlib.gzip),
    decompress: util.promisify(zlib.gunzip),
    extension: "gz",
    isCompressed: true,
    type: CompressionType.GZIP,
  };
  export const Zip: Compression = {
    compress: util.promisify(zlib.deflate),
    decompress: util.promisify(zlib.inflate),
    extension: "zip",
    isCompressed: true,
    type: CompressionType.ZIP,
  };
}
