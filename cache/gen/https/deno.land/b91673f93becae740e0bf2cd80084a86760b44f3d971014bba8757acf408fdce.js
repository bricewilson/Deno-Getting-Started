import { RequestBody } from "./body.ts";
import { preferredCharsets } from "./negotiation/charset.ts";
import { preferredEncodings } from "./negotiation/encoding.ts";
import { preferredLanguages } from "./negotiation/language.ts";
import { preferredMediaTypes } from "./negotiation/mediaType.ts";
const decoder = new TextDecoder();
export class Request {
    constructor(serverRequest, proxy = false, secure = false) {
        this.#proxy = proxy;
        this.#secure = secure;
        this.#serverRequest = serverRequest;
        this.#body = new RequestBody(serverRequest);
    }
    #body;
    #proxy;
    #secure;
    #serverRequest;
    #url;
    get hasBody() {
        return this.#body.has();
    }
    get headers() {
        return this.#serverRequest.headers;
    }
    get ip() {
        return this.#proxy
            ? this.ips[0]
            : this.#serverRequest.conn.remoteAddr.hostname;
    }
    get ips() {
        return this.#proxy
            ? (this.#serverRequest.headers.get("x-forwarded-for") ??
                this.#serverRequest.conn.remoteAddr.hostname).split(/\s*,\s*/)
            : [];
    }
    get method() {
        return this.#serverRequest.method;
    }
    get secure() {
        return this.#secure;
    }
    get serverRequest() {
        return this.#serverRequest;
    }
    get url() {
        if (!this.#url) {
            const serverRequest = this.#serverRequest;
            let proto;
            let host;
            if (this.#proxy) {
                proto = serverRequest
                    .headers.get("x-forwarded-proto")?.split(/\s*,\s*/, 1)[0] ??
                    "http";
                host = serverRequest.headers.get("x-forwarded-host") ??
                    serverRequest.headers.get("host") ?? "";
            }
            else {
                proto = this.#secure ? "https" : "http";
                host = serverRequest.headers.get("host") ?? "";
            }
            this.#url = new URL(`${proto}://${host}${serverRequest.url}`);
        }
        return this.#url;
    }
    accepts(...types) {
        const acceptValue = this.#serverRequest.headers.get("Accept");
        if (!acceptValue) {
            return;
        }
        if (types.length) {
            return preferredMediaTypes(acceptValue, types)[0];
        }
        return preferredMediaTypes(acceptValue);
    }
    acceptsCharsets(...charsets) {
        const acceptCharsetValue = this.#serverRequest.headers.get("Accept-Charset");
        if (!acceptCharsetValue) {
            return;
        }
        if (charsets.length) {
            return preferredCharsets(acceptCharsetValue, charsets)[0];
        }
        return preferredCharsets(acceptCharsetValue);
    }
    acceptsEncodings(...encodings) {
        const acceptEncodingValue = this.#serverRequest.headers.get("Accept-Encoding");
        if (!acceptEncodingValue) {
            return;
        }
        if (encodings.length) {
            return preferredEncodings(acceptEncodingValue, encodings)[0];
        }
        return preferredEncodings(acceptEncodingValue);
    }
    acceptsLanguages(...langs) {
        const acceptLanguageValue = this.#serverRequest.headers.get("Accept-Language");
        if (!acceptLanguageValue) {
            return;
        }
        if (langs.length) {
            return preferredLanguages(acceptLanguageValue, langs)[0];
        }
        return preferredLanguages(acceptLanguageValue);
    }
    body(options = {}) {
        return this.#body.get(options);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlcXVlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBWUEsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUV4QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUVqRSxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0FBR2xDLE1BQU0sT0FBTyxPQUFPO0lBNkVsQixZQUFZLGFBQTRCLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxNQUFNLEdBQUcsS0FBSztRQUNyRSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQztRQUNwQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFqRkQsS0FBSyxDQUFjO0lBQ25CLE1BQU0sQ0FBVTtJQUNoQixPQUFPLENBQVU7SUFDakIsY0FBYyxDQUFnQjtJQUM5QixJQUFJLENBQU87SUFHWCxJQUFJLE9BQU87UUFDVCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUdELElBQUksT0FBTztRQUNULE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7SUFDckMsQ0FBQztJQUtELElBQUksRUFBRTtRQUNKLE9BQU8sSUFBSSxDQUFDLE1BQU07WUFDaEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFH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