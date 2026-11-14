import {Writable} from 'node:stream';

/**
 * A writable that keeps at most `limit` bytes and remembers if it dropped any.
 * `onOverflow` fires once, the first time output goes past the limit, so the
 * executor can stop a program that prints forever instead of waiting for TLE.
 */
export class OutputCollector extends Writable {
  private readonly chunks: Buffer[] = [];
  private size = 0;
  truncated = false;

  constructor(
    private readonly limit: number,
    private readonly onOverflow?: () => void,
  ) {
    super();
  }

  override _write(chunk: Buffer, _enc: BufferEncoding, done: (err?: Error | null) => void) {
    const room = this.limit - this.size;
    if (chunk.length > room) {
      if (room > 0) this.chunks.push(chunk.subarray(0, room));
      this.size = this.limit;
      if (!this.truncated) {
        this.truncated = true;
        this.onOverflow?.();
      }
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
