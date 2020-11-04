import { encode } from "../encoding/utf8.ts";
import { BufReader, BufWriter } from "../io/bufio.ts";
import { assert } from "../_util/assert.ts";
import { deferred, MuxAsyncIterator } from "../async/mod.ts";
import { bodyReader, chunkedBodyReader, emptyReader, readRequest, writeResponse, } from "./_io.ts";
export class ServerRequest {
    constructor() {
        this.done = deferred();
        this._contentLength = undefined;
        this._body = null;
        this.finalized = false;
    }
    get contentLength() {
        if (this._contentLength === undefined) {
            const cl = this.headers.get("content-length");
            if (cl) {
                this._contentLength = parseInt(cl);
                if (Number.isNaN(this._contentLength)) {
                    this._contentLength = null;
                }
            }
            else {
                this._contentLength = null;
            }
        }
        return this._contentLength;
    }
    get body() {
        if (!this._body) {
            if (this.contentLength != null) {
                this._body = bodyReader(this.contentLength, this.r);
            }
            else {
                const transferEncoding = this.headers.get("transfer-encoding");
                if (transferEncoding != null) {
                    const parts = transferEncoding
                        .split(",")
                        .map((e) => e.trim().toLowerCase());
                    assert(parts.includes("chunked"), 'transfer-encoding must include "chunked" if content-length is not set');
                    this._body = chunkedBodyReader(this.headers, this.r);
                }
                else {
                    this._body = emptyReader();
                }
            }
        }
        return this._body;
    }
    async respond(r) {
        let err;
        try {
            await writeResponse(this.w, r);
        }
        catch (e) {
            try {
                this.conn.close();
            }
            catch {
            }
            err = e;
        }
        this.done.resolve(err);
        if (err) {
            throw err;
        }
    }
    async finalize() {
        if (this.finalized)
            return;
        const body = this.body;
        const buf = new Uint8Array(1024);
        while ((await body.read(buf)) !== null) {
        }
        this.finalized = true;
    }
}
export class Server {
    constructor(listener) {
        this.listener = listener;
        this.closing = false;
        this.connections = [];
    }
    close() {
        this.closing = true;
        this.listener.close();
        for (const conn of this.connections) {
            try {
                conn.close();
            }
            catch (e) {
                if (!(e instanceof Deno.errors.BadResource)) {
                    throw e;
                }
            }
        }
    }
    async *iterateHttpRequests(conn) {
        const reader = new BufReader(conn);
        const writer = new BufWriter(conn);
        while (!this.closing) {
            let request;
            try {
                request = await readRequest(conn, reader);
            }
            catch (error) {
                if (error instanceof Deno.errors.InvalidData ||
                    error instanceof Deno.errors.UnexpectedEof) {
                    await writeResponse(writer, {
                        status: 400,
                        body: encode(`${error.message}\r\n\r\n`),
                    });
                }
                break;
            }
            if (request === null) {
                break;
            }
            request.w = writer;
            yield request;
            const responseError = await request.done;
            if (responseError) {
                this.untrackConnection(request.conn);
                return;
            }
            await request.finalize();
        }
        this.untrackConnection(conn);
        try {
            conn.close();
        }
        catch (e) {
        }
    }
    trackConnection(conn) {
        this.connections.push(conn);
    }
    untrackConnection(conn) {
        const index = this.connections.indexOf(conn);
        if (index !== -1) {
            this.connections.splice(index, 1);
        }
    }
    async *acceptConnAndIterateHttpRequests(mux) {
        if (this.closing)
            return;
        let conn;
        try {
            conn = await this.listener.accept();
        }
        catch (error) {
            if (error instanceof Deno.errors.BadResource ||
                error instanceof Deno.errors.InvalidData ||
                error instanceof Deno.errors.UnexpectedEof) {
                return mux.add(this.acceptConnAndIterateHttpRequests(mux));
            }
            throw error;
        }
        this.trackConnection(conn);
        mux.add(this.acceptConnAndIterateHttpRequests(mux));
        yield* this.iterateHttpRequests(conn);
    }
    [Symbol.asyncIterator]() {
        const mux = new MuxAsyncIterator();
        mux.add(this.acceptConnAndIterateHttpRequests(mux));
        return mux.iterate();
    }
}
export function _parseAddrFromStr(addr) {
    let url;
    try {
        const host = addr.startsWith(":") ? `0.0.0.0${addr}` : addr;
        url = new URL(`http://${host}`);
    }
    catch {
        throw new TypeError("Invalid address.");
    }
    if (url.username ||
        url.password ||
        url.pathname != "/" ||
        url.search ||
        url.hash) {
        throw new TypeError("Invalid address.");
    }
    return {
        hostname: url.hostname,
        port: url.port === "" ? 80 : Number(url.port),
    };
}
export function serve(addr) {
    if (typeof addr === "string") {
        addr = _parseAddrFromStr(addr);
    }
    const listener = Deno.listen(addr);
    return new Server(listener);
}
export async function listenAndServe(addr, handler) {
    const server = serve(addr);
    for await (const request of server) {
        handler(request);
    }
}
export function serveTLS(options) {
    const tlsOptions = {
        ...options,
        transport: "tcp",
    };
    const listener = Deno.listenTls(tlsOptions);
    return new Server(listener);
}
export async function listenAndServeTLS(options, handler) {
    const server = serveTLS(options);
    for await (const request of server) {
        handler(request);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM1QyxPQUFPLEVBQVksUUFBUSxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdkUsT0FBTyxFQUNMLFVBQVUsRUFDVixpQkFBaUIsRUFDakIsV0FBVyxFQUNYLFdBQVcsRUFDWCxhQUFhLEdBQ2QsTUFBTSxVQUFVLENBQUM7QUFFbEIsTUFBTSxPQUFPLGFBQWE7SUFBMUI7UUFVRSxTQUFJLEdBQWdDLFFBQVEsRUFBRSxDQUFDO1FBRXZDLG1CQUFjLEdBQThCLFNBQVMsQ0FBQztRQXVCdEQsVUFBSyxHQUF1QixJQUFJLENBQUM7UUFzRGpDLGNBQVMsR0FBRyxLQUFLLENBQUM7SUFXNUIsQ0FBQztJQW5GQyxJQUFJLGFBQWE7UUFHZixJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFO1lBQ3JDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDOUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ04sSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRW5DLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQ3JDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO2lCQUM1QjthQUNGO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO2FBQzVCO1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQyxj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