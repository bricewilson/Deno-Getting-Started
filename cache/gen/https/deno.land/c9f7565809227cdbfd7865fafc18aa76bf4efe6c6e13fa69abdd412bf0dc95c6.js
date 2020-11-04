import { decode, encode } from "../encoding/utf8.ts";
import { hasOwnProperty } from "../_util/has_own_property.ts";
import { BufReader, BufWriter } from "../io/bufio.ts";
import { readLong, readShort, sliceLongToBytes } from "../io/ioutil.ts";
import { Sha1 } from "../hash/sha1.ts";
import { writeResponse } from "../http/_io.ts";
import { TextProtoReader } from "../textproto/mod.ts";
import { deferred } from "../async/deferred.ts";
import { assert } from "../_util/assert.ts";
import { concat } from "../bytes/mod.ts";
export var OpCode;
(function (OpCode) {
    OpCode[OpCode["Continue"] = 0] = "Continue";
    OpCode[OpCode["TextFrame"] = 1] = "TextFrame";
    OpCode[OpCode["BinaryFrame"] = 2] = "BinaryFrame";
    OpCode[OpCode["Close"] = 8] = "Close";
    OpCode[OpCode["Ping"] = 9] = "Ping";
    OpCode[OpCode["Pong"] = 10] = "Pong";
})(OpCode || (OpCode = {}));
export function isWebSocketCloseEvent(a) {
    return hasOwnProperty(a, "code");
}
export function isWebSocketPingEvent(a) {
    return Array.isArray(a) && a[0] === "ping" && a[1] instanceof Uint8Array;
}
export function isWebSocketPongEvent(a) {
    return Array.isArray(a) && a[0] === "pong" && a[1] instanceof Uint8Array;
}
export function unmask(payload, mask) {
    if (mask) {
        for (let i = 0, len = payload.length; i < len; i++) {
            payload[i] ^= mask[i & 3];
        }
    }
}
export async function writeFrame(frame, writer) {
    const payloadLength = frame.payload.byteLength;
    let header;
    const hasMask = frame.mask ? 0x80 : 0;
    if (frame.mask && frame.mask.byteLength !== 4) {
        throw new Error("invalid mask. mask must be 4 bytes: length=" + frame.mask.byteLength);
    }
    if (payloadLength < 126) {
        header = new Uint8Array([0x80 | frame.opcode, hasMask | payloadLength]);
    }
    else if (payloadLength < 0xffff) {
        header = new Uint8Array([
            0x80 | frame.opcode,
            hasMask | 0b01111110,
            payloadLength >>> 8,
            payloadLength & 0x00ff,
        ]);
    }
    else {
        header = new Uint8Array([
            0x80 | frame.opcode,
            hasMask | 0b01111111,
            ...sliceLongToBytes(payloadLength),
        ]);
    }
    if (frame.mask) {
        header = concat(header, frame.mask);
    }
    unmask(frame.payload, frame.mask);
    header = concat(header, frame.payload);
    const w = BufWriter.create(writer);
    await w.write(header);
    await w.flush();
}
export async function readFrame(buf) {
    let b = await buf.readByte();
    assert(b !== null);
    let isLastFrame = false;
    switch (b >>> 4) {
        case 0b1000:
            isLastFrame = true;
            break;
        case 0b0000:
            isLastFrame = false;
            break;
        default:
            throw new Error("invalid signature");
    }
    const opcode = b & 0x0f;
    b = await buf.readByte();
    assert(b !== null);
    const hasMask = b >>> 7;
    let payloadLength = b & 0b01111111;
    if (payloadLength === 126) {
        const l = await readShort(buf);
        assert(l !== null);
        payloadLength = l;
    }
    else if (payloadLength === 127) {
        const l = await readLong(buf);
        assert(l !== null);
        payloadLength = Number(l);
    }
    let mask;
    if (hasMask) {
        mask = new Uint8Array(4);
        assert((await buf.readFull(mask)) !== null);
    }
    const payload = new Uint8Array(payloadLength);
    assert((await buf.readFull(payload)) !== null);
    return {
        isLastFrame,
        opcode,
        mask,
        payload,
    };
}
class WebSocketImpl {
    constructor({ conn, bufReader, bufWriter, mask, }) {
        this.sendQueue = [];
        this._isClosed = false;
        this.conn = conn;
        this.mask = mask;
        this.bufReader = bufReader || new BufReader(conn);
        this.bufWriter = bufWriter || new BufWriter(conn);
    }
    async *[Symbol.asyncIterator]() {
        let frames = [];
        let payloadsLength = 0;
        while (!this._isClosed) {
            let frame;
            try {
                frame = await readFrame(this.bufReader);
            }
            catch (e) {
                this.ensureSocketClosed();
                break;
            }
            unmask(frame.payload, frame.mask);
            switch (frame.opcode) {
                case OpCode.TextFrame:
                case OpCode.BinaryFrame:
                case OpCode.Continue:
                    frames.push(frame);
                    payloadsLength += frame.payload.length;
                    if (frame.isLastFrame) {
                        const concat = new Uint8Array(payloadsLength);
                        let offs = 0;
                        for (const frame of frames) {
                            concat.set(frame.payload, offs);
                            offs += frame.payload.length;
                        }
                        if (frames[0].opcode === OpCode.TextFrame) {
                            yield decode(concat);
                        }
                        else {
                            yield concat;
                        }
                        frames = [];
                        payloadsLength = 0;
                    }
                    break;
                case OpCode.Close: {
                    const code = (frame.payload[0] << 8) | frame.payload[1];
                    const reason = decode(frame.payload.subarray(2, frame.payload.length));
                    await this.close(code, reason);
                    yield { code, reason };
                    return;
                }
                case OpCode.Ping:
                    await this.enqueue({
                        opcode: OpCode.Pong,
                        payload: frame.payload,
                        isLastFrame: true,
                    });
                    yield ["ping", frame.payload];
                    break;
                case OpCode.Pong:
                    yield ["pong", frame.payload];
                    break;
                default:
            }
        }
    }
    dequeue() {
        const [entry] = this.sendQueue;
        if (!entry)
            return;
        if (this._isClosed)
            return;
        const { d, frame } = entry;
        writeFrame(frame, this.bufWriter)
            .then(() => d.resolve())
            .catch((e) => d.reject(e))
            .finally(() => {
            this.sendQueue.shift();
            this.dequeue();
        });
    }
    enqueue(frame) {
        if (this._isClosed) {
            throw new Deno.errors.ConnectionReset("Socket has already been closed");
        }
        const d = deferred();
        this.sendQueue.push({ d, frame });
        if (this.sendQueue.length === 1) {
            this.dequeue();
        }
        return d;
    }
    send(data) {
        const opcode = typeof data === "string"
            ? OpCode.TextFrame
            : OpCode.BinaryFrame;
        const payload = typeof data === "string" ? encode(data) : data;
        const isLastFrame = true;
        const frame = {
            isLastFrame,
            opcode,
            payload,
            mask: this.mask,
        };
        return this.enqueue(frame);
    }
    ping(data = "") {
        const payload = typeof data === "string" ? encode(data) : data;
        const frame = {
            isLastFrame: true,
            opcode: OpCode.Ping,
            mask: this.mask,
            payload,
        };
        return this.enqueue(frame);
    }
    get isClosed() {
        return this._isClosed;
    }
    async close(code = 1000, reason) {
        try {
            const header = [code >>> 8, code & 0x00ff];
            let payload;
            if (reason) {
                const reasonBytes = encode(reason);
                payload = new Uint8Array(2 + reasonBytes.byteLength);
                payload.set(header);
                payload.set(reasonBytes, 2);
            }
            else {
                payload = new Uint8Array(header);
            }
            await this.enqueue({
                isLastFrame: true,
                opcode: OpCode.Close,
                mask: this.mask,
                payload,
            });
        }
        catch (e) {
            throw e;
        }
        finally {
            this.ensureSocketClosed();
        }
    }
    closeForce() {
        this.ensureSocketClosed();
    }
    ensureSocketClosed() {
        if (this.isClosed)
            return;
        try {
            this.conn.close();
        }
        catch (e) {
            console.error(e);
        }
        finally {
            this._isClosed = true;
            const rest = this.sendQueue;
            this.sendQueue = [];
            rest.forEach((e) => e.d.reject(new Deno.errors.ConnectionReset("Socket has already been closed")));
        }
    }
}
export function acceptable(req) {
    const upgrade = req.headers.get("upgrade");
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
        return false;
    }
    const secKey = req.headers.get("sec-websocket-key");
    return (req.headers.has("sec-websocket-key") &&
        typeof secKey === "string" &&
        secKey.length > 0);
}
const kGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
export function createSecAccept(nonce) {
    const sha1 = new Sha1();
    sha1.update(nonce + kGUID);
    const bytes = sha1.digest();
    return btoa(String.fromCharCode(...bytes));
}
export async function acceptWebSocket(req) {
    const { conn, headers, bufReader, bufWriter } = req;
    if (acceptable(req)) {
        const sock = new WebSocketImpl({ conn, bufReader, bufWriter });
        const secKey = headers.get("sec-websocket-key");
        if (typeof secKey !== "string") {
            throw new Error("sec-websocket-key is not provided");
        }
        const secAccept = createSecAccept(secKey);
        await writeResponse(bufWriter, {
            status: 101,
            headers: new Headers({
                Upgrade: "websocket",
                Connection: "Upgrade",
                "Sec-WebSocket-Accept": secAccept,
            }),
        });
        return sock;
    }
    throw new Error("request is not acceptable");
}
const kSecChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-.~_";
export function createSecKey() {
    let key = "";
    for (let i = 0; i < 16; i++) {
        const j = Math.floor(Math.random() * kSecChars.length);
        key += kSecChars[j];
    }
    return btoa(key);
}
export async function handshake(url, headers, bufReader, bufWriter) {
    const { hostname, pathname, search } = url;
    const key = createSecKey();
    if (!headers.has("host")) {
        headers.set("host", hostname);
    }
    headers.set("upgrade", "websocket");
    headers.set("connection", "upgrade");
    headers.set("sec-websocket-key", key);
    headers.set("sec-websocket-version", "13");
    let headerStr = `GET ${pathname}${search} HTTP/1.1\r\n`;
    for (const [key, value] of headers) {
        headerStr += `${key}: ${value}\r\n`;
    }
    headerStr += "\r\n";
    await bufWriter.write(encode(headerStr));
    await bufWriter.flush();
    const tpReader = new TextProtoReader(bufReader);
    const statusLine = await tpReader.readLine();
    if (statusLine === null) {
        throw new Deno.errors.UnexpectedEof();
    }
    const m = statusLine.match(/^(?<version>\S+) (?<statusCode>\S+) /);
    if (!m) {
        throw new Error("ws: invalid status line: " + statusLine);
    }
    assert(m.groups);
    const { version, statusCode } = m.groups;
    if (version !== "HTTP/1.1" || statusCode !== "101") {
        throw new Error(`ws: server didn't accept handshake: ` +
            `version=${version}, statusCode=${statusCode}`);
    }
    const responseHeaders = await tpReader.readMIMEHeader();
    if (responseHeaders === null) {
        throw new Deno.errors.UnexpectedEof();
    }
    const expectedSecAccept = createSecAccept(key);
    const secAccept = responseHeaders.get("sec-websocket-accept");
    if (secAccept !== expectedSecAccept) {
        throw new Error(`ws: unexpected sec-websocket-accept header: ` +
            `expected=${expectedSecAccept}, actual=${secAccept}`);
    }
}
export function createWebSocket(params) {
    return new WebSocketImpl(params);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQVksUUFBUSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUV6QyxNQUFNLENBQU4sSUFBWSxNQU9YO0FBUEQsV0FBWSxNQUFNO0lBQ2hCLDJDQUFjLENBQUE7SUFDZCw2Q0FBZSxDQUFBO0lBQ2YsaURBQWlCLENBQUE7SUFDakIscUNBQVcsQ0FBQTtJQUNYLG1DQUFVLENBQUE7SUFDVixvQ0FBVSxDQUFBO0FBQ1osQ0FBQyxFQVBXLE1BQU0sS0FBTixNQUFNLFFBT2pCO0FBY0QsTUFBTSxVQUFVLHFCQUFxQixDQUNuQyxDQUFpQjtJQUVqQixPQUFPLGNBQWMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUlELE1BQU0sVUFBVSxvQkFBb0IsQ0FDbEMsQ0FBaUI7SUFFakIsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FB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