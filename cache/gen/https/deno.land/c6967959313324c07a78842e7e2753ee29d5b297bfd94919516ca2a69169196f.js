import { assert, compile, pathParse, pathToRegexp, Status, } from "./deps.ts";
import { httpErrors } from "./httpError.ts";
import { compose } from "./middleware.ts";
import { decodeComponent } from "./util.ts";
function toUrl(url, params = {}, options) {
    const tokens = pathParse(url);
    let replace = {};
    if (tokens.some((token) => typeof token === "object")) {
        replace = params;
    }
    else {
        options = params;
    }
    const toPath = compile(url, options);
    let replaced = toPath(replace);
    if (options && options.query) {
        const url = new URL(replaced, "http://oak");
        if (typeof options.query === "string") {
            url.search = options.query;
        }
        else {
            url.search = String(options.query instanceof URLSearchParams
                ? options.query
                : new URLSearchParams(options.query));
        }
        return `${url.pathname}${url.search}${url.hash}`;
    }
    return replaced;
}
class Layer {
    constructor(path, methods, middleware, { name, ...opts } = {}) {
        this.#paramNames = [];
        this.#opts = opts;
        this.name = name;
        this.methods = [...methods];
        if (this.methods.includes("GET")) {
            this.methods.unshift("HEAD");
        }
        this.stack = Array.isArray(middleware) ? middleware : [middleware];
        this.path = path;
        this.#regexp = pathToRegexp(path, this.#paramNames, this.#opts);
    }
    #opts;
    #paramNames;
    #regexp;
    match(path) {
        return this.#regexp.test(path);
    }
    params(captures, existingParams = {}) {
        const params = existingParams;
        for (let i = 0; i < captures.length; i++) {
            if (this.#paramNames[i]) {
                const c = captures[i];
                params[this.#paramNames[i].name] = c ? decodeComponent(c) : c;
            }
        }
        return params;
    }
    captures(path) {
        if (this.#opts.ignoreCaptures) {
            return [];
        }
        return path.match(this.#regexp)?.slice(1) ?? [];
    }
    url(params = {}, options) {
        const url = this.path.replace(/\(\.\*\)/g, "");
        return toUrl(url, params, options);
    }
    param(param, fn) {
        const stack = this.stack;
        const params = this.#paramNames;
        const middleware = function (ctx, next) {
            const p = ctx.params[param];
            assert(p);
            return fn.call(this, p, ctx, next);
        };
        middleware.param = param;
        const names = params.map((p) => p.name);
        const x = names.indexOf(param);
        if (x >= 0) {
            for (let i = 0; i < stack.length; i++) {
                const fn = stack[i];
                if (!fn.param || names.indexOf(fn.param) > x) {
                    stack.splice(i, 0, middleware);
                    break;
                }
            }
        }
        return this;
    }
    setPrefix(prefix) {
        if (this.path) {
            this.path = this.path !== "/" || this.#opts.strict === true
                ? `${prefix}${this.path}`
                : prefix;
            this.#paramNames = [];
            this.#regexp = pathToRegexp(this.path, this.#paramNames, this.#opts);
        }
        return this;
    }
    toJSON() {
        return {
            methods: [...this.methods],
            middleware: [...this.stack],
            paramNames: this.#paramNames.map((key) => key.name),
            path: this.path,
            regexp: this.#regexp,
            options: { ...this.#opts },
        };
    }
}
export class Router {
    constructor(opts = {}) {
        this.#params = {};
        this.#stack = [];
        this.#match = (path, method) => {
            const matches = {
                path: [],
                pathAndMethod: [],
                route: false,
            };
            for (const route of this.#stack) {
                if (route.match(path)) {
                    matches.path.push(route);
                    if (route.methods.length === 0 || route.methods.includes(method)) {
                        matches.pathAndMethod.push(route);
                        if (route.methods.length) {
                            matches.route = true;
                        }
                    }
                }
            }
            return matches;
        };
        this.#register = (path, middleware, methods, options = {}) => {
            if (Array.isArray(path)) {
                for (const p of path) {
                    this.#register(p, middleware, methods, options);
                }
                return;
            }
            const { end, name, sensitive, strict, ignoreCaptures } = options;
            const route = new Layer(path, methods, middleware, {
                end: end === false ? end : true,
                name,
                sensitive: sensitive ?? this.#opts.sensitive ?? false,
                strict: strict ?? this.#opts.strict ?? false,
                ignoreCaptures,
            });
            if (this.#opts.prefix) {
                route.setPrefix(this.#opts.prefix);
            }
            for (const [param, mw] of Object.entries(this.#params)) {
                route.param(param, mw);
            }
            this.#stack.push(route);
        };
        this.#route = (name) => {
            for (const route of this.#stack) {
                if (route.name === name) {
                    return route;
                }
            }
        };
        this.#useVerb = (nameOrPath, pathOrMiddleware, middleware, methods) => {
            let name = undefined;
            let path;
            if (typeof pathOrMiddleware === "string") {
                name = nameOrPath;
                path = pathOrMiddleware;
            }
            else {
                path = nameOrPath;
                middleware.unshift(pathOrMiddleware);
            }
            this.#register(path, middleware, methods, { name });
        };
        this.#opts = opts;
        this.#methods = opts.methods ?? [
            "DELETE",
            "GET",
            "HEAD",
            "OPTIONS",
            "PATCH",
            "POST",
            "PUT",
        ];
    }
    #opts;
    #methods;
    #params;
    #stack;
    #match;
    #register;
    #route;
    #useVerb;
    all(nameOrPath, pathOrMiddleware, ...middleware) {
        this.#useVerb(nameOrPath, pathOrMiddleware, middleware, ["DELETE", "GET", "POST", "PUT"]);
        return this;
    }
    allowedMethods(options = {}) {
        const implemented = this.#methods;
        const allowedMethods = async (context, next) => {
            const ctx = context;
            await next();
            if (!ctx.response.status || ctx.response.status === Status.NotFound) {
                assert(ctx.matched);
                const allowed = new Set();
                for (const route of ctx.matched) {
                    for (const method of route.methods) {
                        allowed.add(method);
                    }
                }
                const allowedStr = [...allowed].join(", ");
                if (!implemented.includes(ctx.request.method)) {
                    if (options.throw) {
                        throw options.notImplemented
                            ? options.notImplemented()
                            : new httpErrors.NotImplemented();
                    }
                    else {
                        ctx.response.status = Status.NotImplemented;
                        ctx.response.headers.set("Allowed", allowedStr);
                    }
                }
                else if (allowed.size) {
                    if (ctx.request.method === "OPTIONS") {
                        ctx.response.status = Status.OK;
                        ctx.response.headers.set("Allowed", allowedStr);
                    }
                    else if (!allowed.has(ctx.request.method)) {
                        if (options.throw) {
                            throw options.methodNotAllowed
                                ? options.methodNotAllowed()
                                : new httpErrors.MethodNotAllowed();
                        }
                        else {
                            ctx.response.status = Status.MethodNotAllowed;
                            ctx.response.headers.set("Allowed", allowedStr);
                        }
                    }
                }
            }
        };
        return allowedMethods;
    }
    delete(nameOrPath, pathOrMiddleware, ...middleware) {
        this.#useVerb(nameOrPath, pathOrMiddleware, middleware, ["DELETE"]);
        return this;
    }
    *entries() {
        for (const route of this.#stack) {
            const value = route.toJSON();
            yield [value, value];
        }
    }
    forEach(callback, thisArg = null) {
        for (const route of this.#stack) {
            const value = route.toJSON();
            callback.call(thisArg, value, value, this);
        }
    }
    get(nameOrPath, pathOrMiddleware, ...middleware) {
        this.#useVerb(nameOrPath, pathOrMiddleware, middleware, ["GET"]);
        return this;
    }
    head(nameOrPath, pathOrMiddleware, ...middleware) {
        this.#useVerb(nameOrPath, pathOrMiddleware, middleware, ["HEAD"]);
        return this;
    }
    *keys() {
        for (const route of this.#stack) {
            yield route.toJSON();
        }
    }
    options(nameOrPath, pathOrMiddleware, ...middleware) {
        this.#useVerb(nameOrPath, pathOrMiddleware, middleware, ["OPTIONS"]);
        return this;
    }
    param(param, middleware) {
        this.#params[param] = middleware;
        for (const route of this.#stack) {
            route.param(param, middleware);
        }
        return this;
    }
    patch(nameOrPath, pathOrMiddleware, ...middleware) {
        this.#useVerb(nameOrPath, pathOrMiddleware, middleware, ["PATCH"]);
        return this;
    }
    post(nameOrPath, pathOrMiddleware, ...middleware) {
        this.#useVerb(nameOrPath, pathOrMiddleware, middleware, ["POST"]);
        return this;
    }
    prefix(prefix) {
        prefix = prefix.replace(/\/$/, "");
        this.#opts.prefix = prefix;
        for (const route of this.#stack) {
            route.setPrefix(prefix);
        }
        return this;
    }
    put(nameOrPath, pathOrMiddleware, ...middleware) {
        this.#useVerb(nameOrPath, pathOrMiddleware, middleware, ["PUT"]);
        return this;
    }
    redirect(source, destination, status = Status.Found) {
        if (source[0] !== "/") {
            const s = this.url(source);
            if (!s) {
                throw new RangeError(`Could not resolve named route: "${source}"`);
            }
            source = s;
        }
        if (destination[0] !== "/") {
            const d = this.url(destination);
            if (!d) {
                throw new RangeError(`Could not resolve named route: "${source}"`);
            }
            destination = d;
        }
        this.all(source, (ctx) => {
            ctx.response.redirect(destination);
            ctx.response.status = status;
        });
        return this;
    }
    routes() {
        const dispatch = (context, next) => {
            const ctx = context;
            const { url: { pathname }, method } = ctx.request;
            const path = this.#opts.routerPath ?? ctx.routerPath ??
                decodeURIComponent(pathname);
            const matches = this.#match(path, method);
            if (ctx.matched) {
                ctx.matched.push(...matches.path);
            }
            else {
                ctx.matched = [...matches.path];
            }
            ctx.router = this;
            if (!matches.route)
                return next();
            const { pathAndMethod: matchedRoutes } = matches;
            const chain = matchedRoutes.reduce((prev, route) => [
                ...prev,
                (ctx, next) => {
                    ctx.captures = route.captures(path);
                    ctx.params = route.params(ctx.captures, ctx.params);
                    ctx.routeName = route.name;
                    return next();
                },
                ...route.stack,
            ], []);
            return compose(chain)(ctx, next);
        };
        dispatch.router = this;
        return dispatch;
    }
    url(name, params, options) {
        const route = this.#route(name);
        if (route) {
            return route.url(params, options);
        }
    }
    use(pathOrMiddleware, ...middleware) {
        let path;
        if (typeof pathOrMiddleware === "string" || Array.isArray(pathOrMiddleware)) {
            path = pathOrMiddleware;
        }
        else {
            middleware.unshift(pathOrMiddleware);
        }
        this.#register(path ?? "(.*)", middleware, [], { end: false, ignoreCaptures: !path });
        return this;
    }
    *values() {
        for (const route of this.#stack) {
            yield route.toJSON();
        }
    }
    *[Symbol.iterator]() {
        for (const route of this.#stack) {
            yield route.toJSON();
        }
    }
    static url(path, params, options) {
        return toUrl(path, params, options);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTZCQSxPQUFPLEVBQ0wsTUFBTSxFQUNOLE9BQU8sRUFHUCxTQUFTLEVBQ1QsWUFBWSxFQUNaLE1BQU0sR0FFUCxNQUFNLFdBQVcsQ0FBQztBQUNuQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUMsT0FBTyxFQUFFLE9BQU8sRUFBYyxNQUFNLGlCQUFpQixDQUFDO0FBRXRELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxXQUFXLENBQUM7QUErSTVDLFNBQVMsS0FBSyxDQUFDLEdBQVcsRUFBRSxTQUFzQixFQUFFLEVBQUUsT0FBb0I7SUFDeEUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLElBQUksT0FBTyxHQUFnQixFQUFFLENBQUM7SUFFOUIsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsRUFBRTtRQUNyRCxPQUFPLEdBQUcsTUFBTSxDQUFDO0tBQ2xCO1NBQU07UUFDTCxPQUFPLEdBQUcsTUFBTSxDQUFDO0tBQ2xCO0lBRUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNyQyxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFL0IsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRTtRQUM1QixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDNUMsSUFBSSxPQUFPLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFO1lBQ3JDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztTQUM1QjthQUFNO1lBQ0ws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