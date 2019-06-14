import AWS = require('aws-sdk');

import iam = require('@aws-cdk/aws-iam');
import kms = require('@aws-cdk/aws-kms');
import { Cache, Dependency, PropertyBag, Runtime } from './compute';
import { Resource } from './enumerable/resource';
import { Omit } from './utils';

import crypto = require('crypto');

export class Key implements Resource<kms.EncryptionKey>, Dependency<Key.EncryptDecrypt> {
  constructor(public readonly resource: kms.EncryptionKey) {}

  public bootstrap(properties: PropertyBag, cache: Cache): Key.Client {
    return new Key.Client(properties.get('keyArn'), cache.getOrCreate('aws:kms', () => new AWS.KMS()));
  }

  public install(target: Runtime): void {
    this.encryptDecryptAccess().install(target);
  }

  public encryptAccess(): Dependency<Key.Encrypt> {
    return this._client(g => this.resource.grantEncrypt(g));
  }

  public decryptAccess(): Dependency<Key.Decrypt>  {
    return this._client(g => this.resource.grantDecrypt(g));
  }

  public encryptDecryptAccess(): Dependency<Key.EncryptDecrypt>  {
    return this._client(g => this.resource.grantEncryptDecrypt(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Dependency<Key.Client> {
    return {
      install: target => {
        target.properties.set('keyArn', this.resource.keyArn);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

// https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#enveloping
// https://stackoverflow.com/questions/44895166/how-to-use-aws-kms-encryption-in-the-node-js-sdk - node.js implementation of envelope encryption
// https://docs.aws.amazon.com/kms/latest/developerguide/policy-conditions.html - might be useful for gdpr/phi
// https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/message-format.html
export namespace Key {
  export type DecryptRequest = AWS.KMS.DecryptRequest;
  export type DecryptResponse = AWS.KMS.DecryptResponse;
  export type EncryptRequest = Omit<AWS.KMS.EncryptRequest, 'KeyId'>;
  export type EncryptResponse = AWS.KMS.EncryptResponse;
  export type GenerateDataKeyRequest = Omit<AWS.KMS.GenerateDataKeyRequest, 'KeyId'>;
  export type GenerateDataKeyResponse = AWS.KMS.GenerateDataKeyResponse;

  export type EncryptDecrypt = Client;
  export type Encrypt = Omit<Client, 'decrypt'>;
  export type Decrypt = Omit<Client, 'encrypt'>;

  export class Client {
    constructor(
      public readonly keyArn: string,
      public readonly client: AWS.KMS
    ) {}

    public generateDataKey(request: GenerateDataKeyRequest): Promise<GenerateDataKeyResponse> {
      return this.client.generateDataKey({
        ...request,
        KeyId: this.keyArn
      }).promise();
    }

    public encrypt(request: EncryptRequest): Promise<EncryptResponse> {
      return this.client.encrypt({
        ...request,
        KeyId: this.keyArn
      }).promise();
    }

    public decrypt(request: DecryptRequest): Promise<DecryptResponse> {
      return this.client.decrypt(request).promise();
    }
  }
  export class Encryption {
    constructor(
      public readonly masterKey: Client,
      public readonly encryptionType: Encryption.Type) {}

    public async encrypt(data: Buffer, encryptionContext?: { [key: string]: string }): Promise<Encryption.Envelope> {
      const dataKey = await this.masterKey.generateDataKey({
        EncryptionContext: encryptionContext,
        KeySpec: 'AES_256'
      });

      if (typeof dataKey.Plaintext === 'string') {
        dataKey.Plaintext = Buffer.from(dataKey.Plaintext, 'base64');
      }
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', dataKey.Plaintext as any, iv, {
        authTagLength: 128
      });
      const buf = Buffer.concat([cipher.update(data), cipher.final()]);

      return null as any;
    }
  }
  export namespace Encryption {
    // https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/algorithms-reference.html
    // https://aws.amazon.com/blogs/security/how-to-protect-the-integrity-of-your-encrypted-data-by-using-aws-key-management-service-and-encryptioncontext/
    // https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/message-format-examples.html
    export class Envelope {
      public readonly dataKeys: Buffer[];
      public readonly data: Buffer;
      public readonly encryptionContext?: { [key: string]: string; };

      constructor(props: {
        dataKeys: Buffer[];
        data: Buffer;
        encryptionContext?: { [key: string]: string };
      }) {
        this.dataKeys = props.dataKeys;
        this.data = props.data;
        this.encryptionContext = props.encryptionContext;
      }

      public serialize(): Buffer {

      }
    }
    export class Type {
      public static readonly AES_256 = new Type('AES_256', 'aes-256, gcm');

      constructor(
        public readonly keySpec: string,
        public readonly cipherType: string
      ) {}

      public iv(bytes?: number): Buffer {
        // https://crypto.stackexchange.com/questions/17999/aes256-gcm-can-someone-explain-how-to-use-it-securely-ruby
        return crypto.randomBytes(bytes || 16);
      }
    }
  }
}
