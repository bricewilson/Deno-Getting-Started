const matchCache = {};
const FIELD_CONTENT_REGEXP = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
const KEY_REGEXP = /(?:^|;) *([^=]*)=[^;]*/g;
const SAME_SITE_REGEXP = /^(?:lax|none|strict)$/i;
function getPattern(name) {
    if (name in matchCache) {
        return matchCache[name];
    }
    return matchCache[name] = new RegExp(`(?:^|;) *${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`);
}
function pushCookie(headers, cookie) {
    if (cookie.overwrite) {
        for (let i = headers.length - 1; i >= 0; i--) {
            if (headers[i].indexOf(`${cookie.name}=`) === 0) {
                headers.splice(i, 1);
            }
        }
    }
    headers.push(cookie.toHeader());
}
function validateCookieProperty(key, value) {
    if (value && !FIELD_CONTENT_REGEXP.test(value)) {
        throw new TypeError(`The ${key} of the cookie (${value}) is invalid.`);
    }
}
class Cookie {
    constructor(name, value, attributes) {
        this.httpOnly = true;
        this.overwrite = false;
        this.path = "/";
        this.sameSite = false;
        this.secure = false;
        validateCookieProperty("name", name);
        validateCookieProperty("value", value);
        this.name = name;
        this.value = value ?? "";
        Object.assign(this, attributes);
        if (!this.value) {
            this.expires = new Date(0);
            this.maxAge = undefined;
        }
        validateCookieProperty("path", this.path);
        validateCookieProperty("domain", this.domain);
        if (this.sameSite && typeof this.sameSite === "string" &&
            !SAME_SITE_REGEXP.test(this.sameSite)) {
            throw new TypeError(`The sameSite of the cookie ("${this.sameSite}") is invalid.`);
        }
    }
    toHeader() {
        let header = this.toString();
        if (this.maxAge) {
            this.expires = new Date(Date.now() + (this.maxAge * 1000));
        }
        if (this.path) {
            header += `; path=${this.path}`;
        }
        if (this.expires) {
            header += `; expires=${this.expires.toUTCString()}`;
        }
        if (this.domain) {
            header += `; domain=${this.domain}`;
        }
        if (this.sameSite) {
            header += `; samesite=${this.sameSite === true ? "strict" : this.sameSite.toLowerCase()}`;
        }
        if (this.secure) {
            header += "; secure";
        }
        if (this.httpOnly) {
            header += "; httponly";
        }
        return header;
    }
    toString() {
        return `${this.name}=${this.value}`;
    }
}
export class Cookies {
    constructor(request, response, options = {}) {
        this.#requestKeys = () => {
            if (this.#cookieKeys) {
                return this.#cookieKeys;
            }
            const result = this.#cookieKeys = [];
            const header = this.#request.headers.get("cookie");
            if (!header) {
                return result;
            }
            let matches;
            while ((matches = KEY_REGEXP.exec(header))) {
                const [, key] = matches;
                result.push(key);
            }
            return result;
        };
        const { keys, secure } = options;
        this.#keys = keys;
        this.#request = request;
        this.#response = response;
        this.#secure = secure;
    }
    #cookieKeys;
    #keys;
    #request;
    #response;
    #secure;
    #requestKeys;
    delete(name, options = {}) {
        this.set(name, null, options);
        return true;
    }
    *entries() {
        const keys = this.#requestKeys();
        for (const key of keys) {
            const value = this.get(key);
            if (value) {
                yield [key, value];
            }
        }
    }
    forEach(callback, thisArg = null) {
        const keys = this.#requestKeys();
        for (const key of keys) {
            const value = this.get(key);
            if (value) {
                callback.call(thisArg, key, value, this);
            }
        }
    }
    get(name, options = {}) {
        const signed = options.signed ?? !!this.#keys;
        const nameSig = `${name}.sig`;
        const header = this.#request.headers.get("cookie");
        if (!header) {
            return;
        }
        const match = header.match(getPattern(name));
        if (!match) {
            return;
        }
        const [, value] = match;
        if (!signed) {
            return value;
        }
        const digest = this.get(nameSig, { signed: false });
        if (!digest) {
            return;
        }
        const data = `${name}=${value}`;
        if (!this.#keys) {
            throw new TypeError("keys required for signed cookies");
        }
        const index = this.#keys.indexOf(data, digest);
        if (index < 0) {
            this.delete(nameSig, { path: "/", signed: false });
        }
        else {
            if (index) {
                this.set(nameSig, this.#keys.sign(data), { signed: false });
            }
            return value;
        }
    }
    *keys() {
        const keys = this.#requestKeys();
        for (const key of keys) {
            const value = this.get(key);
            if (value) {
                yield key;
            }
        }
    }
    set(name, value, options = {}) {
        const request = this.#request;
        const response = this.#response;
        let headers = response.headers.get("Set-Cookie") ?? [];
        if (typeof headers === "string") {
            headers = [headers];
        }
        const secure = this.#secure !== undefined ? this.#secure : request.secure;
        const signed = options.signed ?? !!this.#keys;
        if (!secure && options.secure) {
            throw new TypeError("Cannot send secure cookie over unencrypted connection.");
        }
        const cookie = new Cookie(name, value, options);
        cookie.secure = options.secure ?? secure;
        pushCookie(headers, cookie);
        if (signed) {
            if (!this.#keys) {
                throw new TypeError(".keys required for signed cookies.");
            }
            cookie.value = this.#keys.sign(cookie.toString());
            cookie.name += ".sig";
            pushCookie(headers, cookie);
        }
        for (const header of headers) {
            response.headers.append("Set-Cookie", header);
        }
        return this;
    }
    *values() {
        const keys = this.#requestKeys();
        for (const key of keys) {
            const value = this.get(key);
            if (value) {
                yield value;
            }
        }
    }
    *[Symbol.iterator]() {
        const keys = this.#requestKeys();
        for (const key of keys) {
            const value = this.get(key);
            if (value) {
                yield [key, value];
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29va2llcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvb2tpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0NBLE1BQU0sVUFBVSxHQUEyQixFQUFFLENBQUM7QUFHOUMsTUFBTSxvQkFBb0IsR0FBRyx1Q0FBdUMsQ0FBQztBQUNyRSxNQUFNLFVBQVUsR0FBRyx5QkFBeUIsQ0FBQztBQUM3QyxNQUFNLGdCQUFnQixHQUFHLHdCQUF3QixDQUFDO0FBRWxELFNBQVMsVUFBVSxDQUFDLElBQVk7SUFDOUIsSUFBSSxJQUFJLElBQUksVUFBVSxFQUFFO1FBQ3RCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3pCO0lBRUQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQ2xDLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUN2RSxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLE9BQWlCLEVBQUUsTUFBYztJQUNuRCxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUU7UUFDcEIsS0FBSyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzVDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDL0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDdEI7U0FDRjtLQUNGO0lBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUNsQyxDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FDN0IsR0FBVyxFQUNYLEtBQWdDO0lBRWhDLElBQUksS0FBSyxJQUFJLENB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