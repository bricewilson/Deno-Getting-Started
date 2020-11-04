import { Context } from "./context.ts";
import { serve as defaultServe, serveTLS as defaultServeTls, STATUS_TEXT, } from "./deps.ts";
import { KeyStack } from "./keyStack.ts";
import { compose } from "./middleware.ts";
function isOptionsTls(options) {
    return options.secure === true;
}
const ADDR_REGEXP = /^\[?([^\]]*)\]?:([0-9]{1,5})$/;
export class ApplicationErrorEvent extends ErrorEvent {
    constructor(eventInitDict) {
        super("error", eventInitDict);
        this.context = eventInitDict.context;
    }
}
export class ApplicationListenEvent extends Event {
    constructor(eventInitDict) {
        super("listen", eventInitDict);
        this.hostname = eventInitDict.hostname;
        this.port = eventInitDict.port;
        this.secure = eventInitDict.secure;
    }
}
export class Application extends EventTarget {
    constructor(options = {}) {
        super();
        this.#middleware = [];
        this.#getComposed = () => {
            if (!this.#composedMiddleware) {
                this.#composedMiddleware = compose(this.#middleware);
            }
            return this.#composedMiddleware;
        };
        this.#handleError = (context, error) => {
            if (!(error instanceof Error)) {
                error = new Error(`non-error thrown: ${JSON.stringify(error)}`);
            }
            const { message } = error;
            this.dispatchEvent(new ApplicationErrorEvent({ context, message, error }));
            if (!context.response.writable) {
                return;
            }
            for (const key of context.response.headers.keys()) {
                context.response.headers.delete(key);
            }
            if (error.headers && error.headers instanceof Headers) {
                for (const [key, value] of error.headers) {
                    context.response.headers.set(key, value);
                }
            }
            context.response.type = "text";
            const status = context.response.status =
                error instanceof Deno.errors.NotFound
                    ? 404
                    : error.status && typeof error.status === "number"
                        ? error.status
                        : 500;
            context.response.body = error.expose
                ? error.message
                : STATUS_TEXT.get(status);
        };
        this.#handleRequest = async (request, secure, state) => {
            const context = new Context(this, request, secure);
            let resolve;
            const handlingPromise = new Promise((res) => resolve = res);
            state.handling.add(handlingPromise);
            if (!state.closing && !state.closed) {
                try {
                    await this.#getComposed()(context);
                }
                catch (err) {
                    this.#handleError(context, err);
                }
            }
            if (context.respond === false) {
                context.response.destroy();
                resolve();
                state.handling.delete(handlingPromise);
                return;
            }
            try {
                await request.respond(await context.response.toServerResponse());
                if (state.closing) {
                    state.server.close();
                    state.closed = true;
                }
            }
            catch (err) {
                this.#handleError(context, err);
            }
            finally {
                context.response.destroy();
                resolve();
                state.handling.delete(handlingPromise);
            }
        };
        this.handle = async (request, secure = false) => {
            if (!this.#middleware.length) {
                throw new TypeError("There is no middleware to process requests.");
            }
            const context = new Context(this, request, secure);
            try {
                await this.#getComposed()(context);
            }
            catch (err) {
                this.#handleError(context, err);
            }
            if (context.respond === false) {
                context.response.destroy();
                return;
            }
            try {
                const response = await context.response.toServerResponse();
                context.response.destroy();
                return response;
            }
            catch (err) {
                this.#handleError(context, err);
                throw err;
            }
        };
        const { state, keys, proxy, serve = defaultServe, serveTls = defaultServeTls, } = options;
        this.proxy = proxy ?? false;
        this.keys = keys;
        this.state = state ?? {};
        this.#serve = serve;
        this.#serveTls = serveTls;
    }
    #composedMiddleware;
    #keys;
    #middleware;
    #serve;
    #serveTls;
    get keys() {
        return this.#keys;
    }
    set keys(keys) {
        if (!keys) {
            this.#keys = undefined;
            return;
        }
        else if (Array.isArray(keys)) {
            this.#keys = new KeyStack(keys);
        }
        else {
            this.#keys = keys;
        }
    }
    #getComposed;
    #handleError;
    #handleRequest;
    addEventListener(type, listener, options) {
        super.addEventListener(type, listener, options);
    }
    async listen(options) {
        if (!this.#middleware.length) {
            throw new TypeError("There is no middleware to process requests.");
        }
        if (typeof options === "string") {
            const match = ADDR_REGEXP.exec(options);
            if (!match) {
                throw TypeError(`Invalid address passed: "${options}"`);
            }
            const [, hostname, portStr] = match;
            options = { hostname, port: parseInt(portStr, 10) };
        }
        const server = isOptionsTls(options)
            ? this.#serveTls(options)
            : this.#serve(options);
        const { signal } = options;
        const state = {
            closed: false,
            closing: false,
            handling: new Set(),
            server,
        };
        if (signal) {
            signal.addEventListener("abort", () => {
                if (!state.handling.size) {
                    server.close();
                    state.closed = true;
                }
                state.closing = true;
            });
        }
        const { hostname, port, secure = false } = options;
        this.dispatchEvent(new ApplicationListenEvent({ hostname, port, secure }));
        try {
            for await (const request of server) {
                this.#handleRequest(request, secure, state);
            }
            await Promise.all(state.handling);
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Application Error";
            this.dispatchEvent(new ApplicationErrorEvent({ message, error }));
        }
    }
    use(...middleware) {
        this.#middleware.push(...middleware);
        this.#composedMiddleware = undefined;
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbGljYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcHBsaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3ZDLE9BQU8sRUFDTCxLQUFLLElBQUksWUFBWSxFQUNyQixRQUFRLElBQUksZUFBZSxFQUUzQixXQUFXLEdBQ1osTUFBTSxXQUFXLENBQUM7QUFDbkIsT0FBTyxFQUFPLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM5QyxPQUFPLEVBQUUsT0FBTyxFQUFjLE1BQU0saUJBQWlCLENBQUM7QUEyQnRELFNBQVMsWUFBWSxDQUFDLE9BQXNCO0lBQzFDLE9BQU8sT0FBTyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUM7QUFDakMsQ0FBQztBQXVFRCxNQUFNLFdBQVcsR0FBRywrQkFBK0IsQ0FBQztBQUVwRCxNQUFNLE9BQU8scUJBQXVDLFNBQVEsVUFBVTtJQUdwRSxZQUFZLGFBQTJDO1FBQ3JELEtBQUssQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDOUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO0lBQ3ZDLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxLQUFLO0lBSy9DLFlBQVksYUFBeUM7UUFDbkQsS0FBSyxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsUUFBUSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUM7UUFDdkMsSUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztJQUNyQyxDQUFDO0NBQ0Y7QUFTRCxNQUFNLE9BQU8sV0FDWCxTQUFRLFdBQVc7SUF5Q25CLFlBQVksVUFBa0MsRUFBRTtRQUM5QyxLQUFLLEVBQUUsQ0FBQztRQXZD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