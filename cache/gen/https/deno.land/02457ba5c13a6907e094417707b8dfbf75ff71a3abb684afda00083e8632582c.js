import { assert } from "./deps.ts";
import { stripEol } from "./util.ts";
const DEFAULT_BUF_SIZE = 4096;
const MIN_BUF_SIZE = 16;
const MAX_CONSECUTIVE_EMPTY_READS = 100;
const CR = "\r".charCodeAt(0);
const LF = "\n".charCodeAt(0);
export class BufferFullError extends Error {
    constructor(partial) {
        super("Buffer full");
        this.partial = partial;
        this.name = "BufferFullError";
    }
}
export class BufReader {
    constructor(rd, size = DEFAULT_BUF_SIZE) {
        this.#posRead = 0;
        this.#posWrite = 0;
        this.#eof = false;
        this.#fill = async () => {
            if (this.#posRead > 0) {
                this.#buffer.copyWithin(0, this.#posRead, this.#posWrite);
                this.#posWrite -= this.#posRead;
                this.#posRead = 0;
            }
            if (this.#posWrite >= this.#buffer.byteLength) {
                throw Error("bufio: tried to fill full buffer");
            }
            for (let i = MAX_CONSECUTIVE_EMPTY_READS; i > 0; i--) {
                const rr = await this.#reader.read(this.#buffer.subarray(this.#posWrite));
                if (rr === null) {
                    this.#eof = true;
                    return;
                }
                assert(rr >= 0, "negative read");
                this.#posWrite += rr;
                if (rr > 0) {
                    return;
                }
            }
            throw new Error(`No progress after ${MAX_CONSECUTIVE_EMPTY_READS} read() calls`);
        };
        this.#reset = (buffer, reader) => {
            this.#buffer = buffer;
            this.#reader = reader;
            this.#eof = false;
        };
        if (size < MIN_BUF_SIZE) {
            size = MIN_BUF_SIZE;
        }
        this.#reset(new Uint8Array(size), rd);
    }
    #buffer;
    #reader;
    #posRead;
    #posWrite;
    #eof;
    #fill;
    #reset;
    buffered() {
        return this.#posWrite - this.#posRead;
    }
    async readLine(strip = true) {
        let line;
        try {
            line = await this.readSlice(LF);
        }
        catch (err) {
            let { partial } = err;
            assert(partial instanceof Uint8Array, "Caught error from `readSlice()` without `partial` property");
            if (!(err instanceof BufferFullError)) {
                throw err;
            }
            if (!this.#eof &&
                partial.byteLength > 0 &&
                partial[partial.byteLength - 1] === CR) {
                assert(this.#posRead > 0, "Tried to rewind past start of buffer");
                this.#posRead--;
                partial = partial.subarray(0, partial.byteLength - 1);
            }
            return { bytes: partial, eol: this.#eof };
        }
        if (line === null) {
            return null;
        }
        if (line.byteLength === 0) {
            return { bytes: line, eol: true };
        }
        if (strip) {
            line = stripEol(line);
        }
        return { bytes: line, eol: true };
    }
    async readSlice(delim) {
        let s = 0;
        let slice;
        while (true) {
            let i = this.#buffer.subarray(this.#posRead + s, this.#posWrite).indexOf(delim);
            if (i >= 0) {
                i += s;
                slice = this.#buffer.subarray(this.#posRead, this.#posRead + i + 1);
                this.#posRead += i + 1;
                break;
            }
            if (this.#eof) {
                if (this.#posRead === this.#posWrite) {
                    return null;
                }
                slice = this.#buffer.subarray(this.#posRead, this.#posWrite);
                this.#posRead = this.#posWrite;
                break;
            }
            if (this.buffered() >= this.#buffer.byteLength) {
                this.#posRead = this.#posWrite;
                const oldbuf = this.#buffer;
                const newbuf = this.#buffer.slice(0);
                this.#buffer = newbuf;
                throw new BufferFullError(oldbuf);
            }
            s = this.#posWrite - this.#posRead;
            try {
                await this.#fill();
            }
            catch (err) {
                err.partial = slice;
                throw err;
            }
        }
        return slice;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmX3JlYWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJ1Zl9yZWFkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBT3JDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0FBQzlCLE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQztBQUN4QixNQUFNLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztBQUN4QyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFOUIsTUFBTSxPQUFPLGVBQWdCLFNBQVEsS0FBSztJQUV4QyxZQUFtQixPQUFtQjtRQUNwQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFESixZQUFPLEdBQVAsT0FBTyxDQUFZO1FBRHRDLFNBQUksR0FBRyxpQkFBaUIsQ0FBQztJQUd6QixDQUFDO0NBQ0Y7QUFHRCxNQUFNLE9BQU8sU0FBUztJQTZDcEIsWUFBWSxFQUFlLEVBQUUsT0FBZSxnQkFBZ0I7UUExQzVELGFBQVEsR0FBRyxDQUFDLENBQUM7UUFDYixjQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsU0FBSSxHQUFHLEtBQUssQ0FBQztRQUdiLFVBQUssR0FBRyxLQUFLLElBQW1CLEVBQUU7WUFFaEMsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRTtnQkFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUM7Z0JBQ2hDLElBQUksQ0FB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