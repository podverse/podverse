/**
 * archiver@8 is native ESM with format classes (e.g. ZipArchive).
 * @types/archiver still models the older default factory API and breaks named imports.
 */
declare module "archiver" {
  import type { Transform } from "node:stream";
  import type { ZlibOptions } from "node:zlib";

  export interface ZipArchiveOptions {
    highWaterMark?: number;
    statConcurrency?: number;
    zlib?: ZlibOptions;
  }

  export class ZipArchive extends Transform {
    constructor(options?: ZipArchiveOptions);

    append(source: Buffer | string | NodeJS.ReadableStream, data: { name: string }): this;

    finalize(): Promise<void>;

    pointer(): number;

    pipe<T extends NodeJS.WritableStream>(destination: T): T;
  }
}
