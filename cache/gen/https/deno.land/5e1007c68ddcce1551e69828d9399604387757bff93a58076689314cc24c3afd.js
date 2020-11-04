import { assert } from "./deps.ts";
const encoder = new TextEncoder();
class CloseEvent extends Event {
    constructor(eventInit) {
        super("close", eventInit);
    }
}
export class ServerSentEvent extends Event {
    constructor(type, data, { replacer, space, ...eventInit } = {}) {
        super(type, eventInit);
        this.#type = type;
        try {
            this.#data = typeof data === "string"
                ? data
                : JSON.stringify(data, replacer, space);
        }
        catch (e) {
            assert(e instanceof Error);
            throw new TypeError(`data could not be coerced into a serialized string.\n  ${e.message}`);
        }
        const { id } = eventInit;
        this.#id = id;
    }
    #data;
    #id;
    #type;
    get data() {
        return this.#data;
    }
    get id() {
        return this.#id;
    }
    toString() {
        const data = `data: ${this.#data.split("\n").join("\ndata: ")}\n`;
        return `${this.#type === "__message" ? "" : `event: ${this.#type}\n`}${this.#id ? `id: ${String(this.#id)}\n` : ""}${data}\n`;
    }
}
const response = `HTTP/1.1 200 OK\n`;
const responseHeaders = new Headers([
    ["Connection", "Keep-Alive"],
    ["Content-Type", "text/event-stream"],
    ["Cache-Control", "no-cache"],
    ["Keep-Alive", `timeout=${Number.MAX_SAFE_INTEGER}`],
]);
export class ServerSentEventTarget extends EventTarget {
    constructor(app, serverRequest, { headers } = {}) {
        super();
        this.#closed = false;
        this.#prev = Promise.resolve();
        this.#send = async (payload, prev) => {
            if (this.#closed) {
                return;
            }
            if (this.#ready !== true) {
                await this.#ready;
                this.#ready = true;
            }
            try {
                await prev;
                await this.#writer.write(encoder.encode(payload));
                await this.#writer.flush();
            }
            catch (error) {
                this.dispatchEvent(new CloseEvent({ cancelable: false }));
                const errorEvent = new ErrorEvent("error", { error });
                this.dispatchEvent(errorEvent);
                this.#app.dispatchEvent(errorEvent);
            }
        };
        this.#setup = async (overrideHeaders) => {
            const headers = new Headers(responseHeaders);
            if (overrideHeaders) {
                for (const [key, value] of overrideHeaders) {
                    headers.set(key, value);
                }
            }
            let payload = response;
            for (const [key, value] of headers) {
                payload += `${key}: ${value}\n`;
            }
            payload += `\n`;
            try {
                await this.#writer.write(encoder.encode(payload));
                await this.#writer.flush();
            }
            catch (error) {
                this.dispatchEvent(new CloseEvent({ cancelable: false }));
                const errorEvent = new ErrorEvent("error", { error });
                this.dispatchEvent(errorEvent);
                this.#app.dispatchEvent(errorEvent);
                throw error;
            }
        };
        this.#app = app;
        this.#serverRequest = serverRequest;
        this.#writer = this.#serverRequest.w;
        this.addEventListener("close", () => {
            this.#closed = true;
            try {
                this.#serverRequest.conn.close();
            }
            catch (error) {
                if (!(error instanceof Deno.errors.BadResource)) {
                    const errorEvent = new ErrorEvent("error", { error });
                    this.dispatchEvent(errorEvent);
                    this.#app.dispatchEvent(errorEvent);
                }
            }
        });
        this.#ready = this.#setup(headers);
    }
    #app;
    #closed;
    #prev;
    #ready;
    #serverRequest;
    #writer;
    #send;
    #setup;
    get closed() {
        return this.#closed;
    }
    async close() {
        if (this.#ready !== true) {
            await this.#ready;
        }
        await this.#prev;
        this.dispatchEvent(new CloseEvent({ cancelable: false }));
    }
    dispatchComment(comment) {
        this.#prev = this.#send(`: ${comment.split("\n").join("\n: ")}\n\n`, this.#prev);
        return true;
    }
    dispatchMessage(data) {
        const event = new ServerSentEvent("__message", data);
        return this.dispatchEvent(event);
    }
    dispatchEvent(event) {
        let dispatched = super.dispatchEvent(event);
        if (dispatched && event instanceof ServerSentEvent) {
            this.#prev = this.#send(String(event), this.#prev);
        }
        return dispatched;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyX3NlbnRfZXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXJ2ZXJfc2VudF9ldmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLEVBQUUsTUFBTSxFQUFhLE1BQU0sV0FBVyxDQUFDO0FBRzlDLE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7QUF5QmxDLE1BQU0sVUFBVyxTQUFRLEtBQUs7SUFDNUIsWUFBWSxTQUFvQjtRQUM5QixLQUFLLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzVCLENBQUM7Q0FDRjtBQUlELE1BQU0sT0FBTyxlQUFnQixTQUFRLEtBQUs7SUFLeEMsWUFDRSxJQUFZLEVBRVosSUFBUyxFQUNULEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLFNBQVMsS0FBMEIsRUFBRTtRQUUzRCxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLElBQUk7WUFDRixJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sSUFBSSxLQUFLLFFBQVE7Z0JBQ25DLENBQUMsQ0FBQyxJQUFJO2dCQUNOLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ2xFO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixNQUFNLENBQUMsQ0FBQyxZQUFZLEtBQUssQ0FBQyxDQUFDO1lBQzNCLE1BQU0sSUFBSSxTQUFTLENBQ2pCLDBEQUEwRCxDQUFDLENBQUMsT0FBTyxFQUFFLENBQ3RFLENBQUM7U0FDSDtRQUNELE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxTQUFTLENBQUM7UUFDekIsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQXhCRCxLQUFLLENBQVM7SUFDZCxHQUFHLENBQVU7SUFDYixLQUFLLENB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