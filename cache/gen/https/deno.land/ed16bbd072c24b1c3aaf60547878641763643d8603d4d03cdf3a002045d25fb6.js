import { contentType, Status } from "./deps.ts";
import { encodeUrl, isHtml, isRedirectStatus } from "./util.ts";
export const REDIRECT_BACK = Symbol("redirect backwards");
const BODY_TYPES = ["string", "number", "bigint", "boolean", "symbol"];
const encoder = new TextEncoder();
function isReader(value) {
    return value && typeof value === "object" && "read" in value &&
        typeof value.read === "function";
}
async function convertBody(body, type) {
    let result;
    if (BODY_TYPES.includes(typeof body)) {
        const bodyText = String(body);
        result = encoder.encode(bodyText);
        type = type ?? (isHtml(bodyText) ? "html" : "text/plain");
    }
    else if (body instanceof Uint8Array || isReader(body)) {
        result = body;
    }
    else if (body && typeof body === "object") {
        result = encoder.encode(JSON.stringify(body));
        type = type ?? "json";
    }
    else if (typeof body === "function") {
        const result = body.call(null);
        return convertBody(await result, type);
    }
    else if (body) {
        throw new TypeError("Response body was set but could not convert.");
    }
    return [result, type];
}
export class Response {
    constructor(request) {
        this.#headers = new Headers();
        this.#resources = [];
        this.#writable = true;
        this.#getBody = async () => {
            const [body, type] = await convertBody(this.body, this.type);
            this.type = type;
            return body;
        };
        this.#setContentType = () => {
            if (this.type) {
                const contentTypeString = contentType(this.type);
                if (contentTypeString && !this.headers.has("Content-Type")) {
                    this.headers.append("Content-Type", contentTypeString);
                }
            }
        };
        this.#request = request;
    }
    #body;
    #headers;
    #request;
    #resources;
    #serverResponse;
    #status;
    #type;
    #writable;
    #getBody;
    #setContentType;
    get body() {
        return this.#body;
    }
    set body(value) {
        if (!this.#writable) {
            throw new Error("The response is not writable.");
        }
        this.#body = value;
    }
    get headers() {
        return this.#headers;
    }
    set headers(value) {
        if (!this.#writable) {
            throw new Error("The response is not writable.");
        }
        this.#headers = value;
    }
    get status() {
        if (this.#status) {
            return this.#status;
        }
        const typeofbody = typeof this.body;
        return this.body &&
            (BODY_TYPES.includes(typeofbody) || typeofbody === "object")
            ? Status.OK
            : Status.NotFound;
    }
    set status(value) {
        if (!this.#writable) {
            throw new Error("The response is not writable.");
        }
        this.#status = value;
    }
    get type() {
        return this.#type;
    }
    set type(value) {
        if (!this.#writable) {
            throw new Error("The response is not writable.");
        }
        this.#type = value;
    }
    get writable() {
        return this.#writable;
    }
    addResource(rid) {
        this.#resources.push(rid);
    }
    destroy() {
        this.#writable = false;
        this.#body = undefined;
        this.#serverResponse = undefined;
        for (const rid of this.#resources) {
            Deno.close(rid);
        }
    }
    redirect(url, alt = "/") {
        if (url === REDIRECT_BACK) {
            url = this.#request.headers.get("Referrer") ?? String(alt);
        }
        else if (typeof url === "object") {
            url = String(url);
        }
        this.headers.set("Location", encodeUrl(url));
        if (!this.status || !isRedirectStatus(this.status)) {
            this.status = Status.Found;
        }
        if (this.#request.accepts("html")) {
            url = encodeURI(url);
            this.type = "text/html; charset=utf-8";
            this.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return;
        }
        this.type = "text/plain; charset=utf-8";
        this.body = `Redirecting to ${url}.`;
    }
    async toServerResponse() {
        if (this.#serverResponse) {
            return this.#serverResponse;
        }
        const body = await this.#getBody();
        this.#setContentType();
        const { headers } = this;
        if (!(body ||
            headers.has("Content-Type") ||
            headers.has("Content-Length"))) {
            headers.append("Content-Length", "0");
        }
        this.#writable = false;
        return this.#serverResponse = {
            status: this.#status ?? (body ? Status.OK : Status.NotFound),
            body,
            headers,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzcG9uc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXNwb25zZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUdoRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQStCaEUsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBRTFELE1BQU0sVUFBVSxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBRXZFLE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7QUFJbEMsU0FBUyxRQUFRLENBQUMsS0FBVTtJQUMxQixPQUFPLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksTUFBTSxJQUFJLEtBQUs7UUFDMUQsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQztBQUNyQyxDQUFDO0FBRUQsS0FBSyxVQUFVLFdBQVcsQ0FDeEIsSUFBeUIsRUFDekIsSUFBYTtJQUViLElBQUksTUFBNEMsQ0FBQztJQUNqRCxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxJQUFJLENBQUMsRUFBRTtRQUNwQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztLQUMzRDtTQUFNLElBQUksSUFBSSxZQUFZLFVBQVUsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdkQsTUFBTSxHQUFHLElBQUksQ0FBQztLQUNmO1NBQU0sSUFBSSxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO1FBQzNDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QyxJQUFJLEdBQUcsSUFBSSxJQUFJLE1BQU0sQ0FBQztLQUN2QjtTQUFNLElBQUksT0FBTyxJQUFJLEtBQUssVUFBVSxFQUFFO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsT0FBTyxXQUFXLENBQUMsTUFBTSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDeEM7U0FBTSxJQUFJLElBQUksRUFBRTtRQUNmLE1BQU0sSUFBSSxTQUFTLENBQUMsOENBQThDLENBQUMsQ0FBQztLQUNyRTtJQUNELE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQUlELE1BQU0sT0FBTyxRQUFRO0lBdUduQixZQUFZLE9BQWdCO1FBckc1QixhQUFRLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUV6QixlQUFVLEdBQWEsRUFBRSxDQUFDO1FBSTFCLGNBQVMsR0FBRyxJQUFJLENBQUM7UUFFakIsYUFBUSxHQUFHLEtBQUssSUFBbUQsRUFBRTtZQUNuRSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO1FBRUYsb0JBQWUsR0FBRyxHQUFTLEVBQUU7WUFDM0IsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO2dCQUNiLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakQsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFO29CQUMxRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztpQkFDeEQ7YUFDRjtRQUNILENBQUMsQ0FBQztRQWlGQSxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztJQUMxQixDQUFDO0lBeEdELEtBQUssQ0FBdUI7SUFDNUIsUUFBUSxDQUFpQjtJQUN6QixRQUFRLENBQVU7SUFDbEIsVUFBVSxDQUFnQjtJQUMxQixlQUFlLENBQWtCO0lBQ2pDLE9BQU8sQ0FBVTtJQUNqQixLQUFLLENBQVU7SUFDZixTQUFTLENBQVE7SUFFakIsUUFBUSxDQUlOO0lBRUYsZUFBZSxDQU9iO0lBS0YsSUFBSSxJQUFJO1FBQ04sT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3BCLENBQUM7SUFLRCxJQUFJLElBQUksQ0FBQyxLQUEwQjtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDbEQ7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0lBR0QsSUFBSSxPQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3ZCLENBQUM7SUFHRCxJQUFJLE9BQU8sQ0FBQyxLQUFjO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztTQUNsRDtRQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ3hCLENBQUM7SUFPRCxJQUFJLE1BQU07UUFDUixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1NBQ3JCO1FBQ0QsTUFBTSxVQUFVLEdBQUcsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLElBQUk7WUFDWixDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksVUFBVSxLQUFLLFFBQVEsQ0FBQztZQUM5RCxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDWCxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBT0QsSUFBSSxNQUFNLENBQUMsS0FBYTtRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDbEQ7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztJQUN2QixDQUFDO0lBSUQsSUFBSSxJQUFJO1FBQ04sT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3BCLENBQUM7SUFHRCxJQUFJLElBQUksQ0FBQyxLQUF5QjtRQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDbEQ7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0lBSUQsSUFBSSxRQUFRO1FBQ1YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFRRCxXQUFXLENBQUMsR0FBVztRQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBR0QsT0FBTztRQUNMLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO1FBQ2pDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2pCO0lBQ0gsQ0FBQztJQW9CRCxRQUFRLENBQ04sR0FBd0MsRUFDeEMsTUFBb0IsR0FBRztRQUV2QixJQUFJLEdBQUcsS0FBSyxhQUFhLEVBQUU7WUFDekIsR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDNUQ7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUNsQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ25CO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2xELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztTQUM1QjtRQUVELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyQixJQUFJLENBQUMsSUFBSSxHQUFHLDBCQUEwQixDQUFDO1lBQ3ZDLElBQUksQ0FBQyxJQUFJLEdBQUcsMkJBQTJCLEdBQUcsS0FBSyxHQUFHLE9BQU8sQ0FBQztZQUMxRCxPQUFPO1NBQ1I7UUFDRCxJQUFJLENBQUMsSUFBSSxHQUFHLDJCQUEyQixDQUFDO1FBQ3hDLElBQUksQ0FBQyxJQUFJLEdBQUcsa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0lBQ3ZDLENBQUM7SUFNRCxLQUFLLENBQUMsZ0JBQWdCO1FBQ3BCLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUN4QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7U0FDN0I7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUduQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFdkIsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQztRQUl6QixJQUNFLENBQUMsQ0FDQyxJQUFJO1lBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUM7WUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUM5QixFQUNEO1lBQ0EsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUN2QztRQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGVBQWUsR0FBRztZQUM1QixNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztZQUM1RCxJQUFJO1lBQ0osT0FBTztTQUNSLENBQUM7SUFDSixDQUFDO0NBQ0YifQ==