import {Writable} from 'node:stream';

/** A writable that keeps at most `limit` bytes and remembers if it dropped any. */
export class OutputCollector extends Writable {
  private readonly chunks: Buffer[] = [];
  private size = 0;
  truncated = false;

  constructor(private readonly limit: number) {
    super();
  }

  override _write(chunk: Buffer, _enc: BufferEncoding, done: (err?: Error | null) => void) {
    const room = this.limit - this.size;
    if (chunk.length > room) {
      this.truncated = true;
      if (room > 0) this.chunks.push(chunk.subarray(0, room));
      this.size = this.limit;
    } else {
      this.chunks.push(chunk);
      this.size += chunk.length;
    }
    done();
  }

  text(): string {
    return Buffer.concat(this.chunks).toString('utf8');
  }
}
