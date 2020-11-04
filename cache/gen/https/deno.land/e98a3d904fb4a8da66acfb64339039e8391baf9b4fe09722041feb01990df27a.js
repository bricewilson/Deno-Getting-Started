import { assert } from "./deps.ts";
import { httpErrors } from "./httpError.ts";
import { isMediaType } from "./isMediaType.ts";
import { FormDataReader } from "./multipart.ts";
const defaultBodyContentTypes = {
    json: ["json", "application/*+json", "application/csp-report"],
    form: ["urlencoded"],
    formData: ["multipart"],
    text: ["text"],
};
const decoder = new TextDecoder();
export class RequestBody {
    constructor(request) {
        this.#valuePromise = () => {
            return this.#readAllBody ?? (this.#readAllBody = Deno.readAll(this.#body));
        };
        const { body, headers } = request;
        this.#body = body;
        this.#headers = headers;
    }
    #body;
    #formDataReader;
    #has;
    #headers;
    #readAllBody;
    #type;
    #valuePromise;
    get({ type, contentTypes }) {
        if (type === "reader" && this.#type && this.#type !== "reader") {
            throw new TypeError("Body already consumed and cannot be returned as a reader.");
        }
        if (type === "form-data" && this.#type && this.#type !== "form-data") {
            throw new TypeError("Body already consumed and cannot be returned as form data.");
        }
        if (this.#type === "reader" && type !== "reader") {
            throw new TypeError("Body already consumed as a reader and can only be returned as a reader.");
        }
        if (this.#type === "form-data" && type !== "form-data") {
            throw new TypeError("Body already consumed as form data and can only be returned as form data.");
        }
        if (type && contentTypes) {
            throw new TypeError(`"type" and "contentTypes" cannot be specified at the same time`);
        }
        if (type === "reader") {
            this.#type = "reader";
            return { type, value: this.#body };
        }
        if (!this.has()) {
            this.#type = "undefined";
        }
        else if (!this.#type) {
            const encoding = this.#headers.get("content-encoding") ?? "identity";
            if (encoding !== "identity") {
                throw new httpErrors.UnsupportedMediaType(`Unsupported content-encoding: ${encoding}`);
            }
        }
        if (this.#type === "undefined") {
            if (type) {
                throw new TypeError(`Body is undefined and cannot be returned as "${type}".`);
            }
            return { type: "undefined", value: undefined };
        }
        if (!type) {
            const contentType = this.#headers.get("content-type");
            assert(contentType);
            contentTypes = contentTypes ?? {};
            const contentTypesJson = [
                ...defaultBodyContentTypes.json,
                ...(contentTypes.json ?? []),
            ];
            const contentTypesForm = [
                ...defaultBodyContentTypes.form,
                ...(contentTypes.form ?? []),
            ];
            const contentTypesFormData = [
                ...defaultBodyContentTypes.formData,
                ...(contentTypes.formData ?? []),
            ];
            const contentTypesText = [
                ...defaultBodyContentTypes.text,
                ...(contentTypes.text ?? []),
            ];
            if (contentTypes.raw && isMediaType(contentType, contentTypes.raw)) {
                type = "raw";
            }
            else if (isMediaType(contentType, contentTypesJson)) {
                type = "json";
            }
            else if (isMediaType(contentType, contentTypesForm)) {
                type = "form";
            }
            else if (isMediaType(contentType, contentTypesFormData)) {
                type = "form-data";
            }
            else if (isMediaType(contentType, contentTypesText)) {
                type = "text";
            }
            else {
                type = "raw";
            }
        }
        assert(type);
        let value;
        switch (type) {
            case "form":
                this.#type = "raw";
                value = async () => new URLSearchParams(decoder.decode(await this.#valuePromise()).replace(/\+/g, " "));
                break;
            case "form-data":
                this.#type = "form-data";
                value = () => {
                    const contentType = this.#headers.get("content-type");
                    assert(contentType);
                    return this.#formDataReader ??
                        (this.#formDataReader = new FormDataReader(contentType, this.#body));
                };
                break;
            case "json":
                this.#type = "raw";
                value = async () => JSON.parse(decoder.decode(await this.#valuePromise()));
                break;
            case "raw":
                this.#type = "raw";
                value = () => this.#valuePromise();
                break;
            case "text":
                this.#type = "raw";
                value = async () => decoder.decode(await this.#valuePromise());
                break;
            default:
                throw new TypeError(`Invalid body type: "${type}"`);
        }
        return {
            type,
            get value() {
                return value();
            },
        };
    }
    has() {
        return this.#has !== undefined
            ? this.#has
            : (this.#has = this.#headers.get("transfer-encoding") !== null ||
                !!parseInt(this.#headers.get("content-length") ?? "", 10));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9keS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJvZHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQStEaEQsTUFBTSx1QkFBdUIsR0FBRztJQUM5QixJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsd0JBQXdCLENBQUM7SUFDOUQsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDO0lBQ3BCLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUN2QixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7Q0FDZixDQUFDO0FBRUYsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztBQUVsQyxNQUFNLE9BQU8sV0FBVztJQVl0QixZQUFZLE9BQXNCO1FBSmxDLGtCQUFhLEdBQUcsR0FBRyxFQUFFO1lBQ25CLE9BQU8sSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3RSxDQUFDLENBQUM7UUFHQSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUNsQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztJQUMxQixDQUFDO0lBZkQsS0FBSyxDQUFjO0lBQ25CLGVBQWUsQ0FBa0I7SUFDakMsSUFBSSxDQUFXO0lBQ2YsUUFBUSxDQUFVO0lBQ2xCLFlBQVksQ0FBdUI7SUFDbkMsS0FBSyxDQUFnRDtJ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