import { BufReader } from "./buf_reader.ts";
import { getFilename } from "./content_disposition.ts";
import { equal, extension } from "./deps.ts";
import { readHeaders, toParamRegExp, unquote } from "./headers.ts";
import { httpErrors } from "./httpError.ts";
import { getRandomFilename, skipLWSPChar, stripEol } from "./util.ts";
const decoder = new TextDecoder();
const encoder = new TextEncoder();
const BOUNDARY_PARAM_REGEX = toParamRegExp("boundary", "i");
const DEFAULT_BUFFER_SIZE = 1048576;
const DEFAULT_MAX_FILE_SIZE = 10485760;
const DEFAULT_MAX_SIZE = 0;
const NAME_PARAM_REGEX = toParamRegExp("name", "i");
function append(a, b) {
    const ab = new Uint8Array(a.length + b.length);
    ab.set(a, 0);
    ab.set(b, a.length);
    return ab;
}
function isEqual(a, b) {
    return equal(skipLWSPChar(a), b);
}
async function readToStartOrEnd(body, start, end) {
    let lineResult;
    while ((lineResult = await body.readLine())) {
        if (isEqual(lineResult.bytes, start)) {
            return true;
        }
        if (isEqual(lineResult.bytes, end)) {
            return false;
        }
    }
    throw new httpErrors.BadRequest("Unable to find multi-part boundary.");
}
async function* parts({ body, final, part, maxFileSize, maxSize, outPath, prefix }) {
    async function getFile(contentType) {
        const ext = extension(contentType);
        if (!ext) {
            throw new httpErrors.BadRequest(`Invalid media type for part: ${ext}`);
        }
        if (!outPath) {
            outPath = await Deno.makeTempDir();
        }
        const filename = `${outPath}/${getRandomFilename(prefix, ext)}`;
        const file = await Deno.open(filename, { write: true, createNew: true });
        return [filename, file];
    }
    while (true) {
        const headers = await readHeaders(body);
        const contentType = headers["content-type"];
        const contentDisposition = headers["content-disposition"];
        if (!contentDisposition) {
            throw new httpErrors.BadRequest("Form data part missing content-disposition header");
        }
        if (!contentDisposition.match(/^form-data;/i)) {
            throw new httpErrors.BadRequest(`Unexpected content-disposition header: "${contentDisposition}"`);
        }
        const matches = NAME_PARAM_REGEX.exec(contentDisposition);
        if (!matches) {
            throw new httpErrors.BadRequest(`Unable to determine name of form body part`);
        }
        let [, name] = matches;
        name = unquote(name);
        if (contentType) {
            const originalName = getFilename(contentDisposition);
            let byteLength = 0;
            let file;
            let filename;
            let buf;
            if (maxSize) {
                buf = new Uint8Array();
            }
            else {
                const result = await getFile(contentType);
                filename = result[0];
                file = result[1];
            }
            while (true) {
                const readResult = await body.readLine(false);
                if (!readResult) {
                    throw new httpErrors.BadRequest("Unexpected EOF reached");
                }
                let { bytes } = readResult;
                const strippedBytes = stripEol(bytes);
                if (isEqual(strippedBytes, part) || isEqual(strippedBytes, final)) {
                    if (file) {
                        file.close();
                    }
                    yield [
                        name,
                        {
                            content: buf,
                            contentType,
                            name,
                            filename,
                            originalName,
                        },
                    ];
                    if (isEqual(strippedBytes, final)) {
                        return;
                    }
                    break;
                }
                byteLength += bytes.byteLength;
                if (byteLength > maxFileSize) {
                    if (file) {
                        file.close();
                    }
                    throw new httpErrors.RequestEntityTooLarge(`File size exceeds limit of ${maxFileSize} bytes.`);
                }
                if (buf) {
                    if (byteLength > maxSize) {
                        const result = await getFile(contentType);
                        filename = result[0];
                        file = result[1];
                        await Deno.writeAll(file, buf);
                        buf = undefined;
                    }
                    else {
                        buf = append(buf, bytes);
                    }
                }
                if (file) {
                    await Deno.writeAll(file, bytes);
                }
            }
        }
        else {
            const lines = [];
            while (true) {
                const readResult = await body.readLine();
                if (!readResult) {
                    throw new httpErrors.BadRequest("Unexpected EOF reached");
                }
                const { bytes } = readResult;
                if (isEqual(bytes, part) || isEqual(bytes, final)) {
                    yield [name, lines.join("\n")];
                    if (isEqual(bytes, final)) {
                        return;
                    }
                    break;
                }
                lines.push(decoder.decode(bytes));
            }
        }
    }
}
export class FormDataReader {
    constructor(contentType, body) {
        this.#reading = false;
        const matches = contentType.match(BOUNDARY_PARAM_REGEX);
        if (!matches) {
            throw new httpErrors.BadRequest(`Content type "${contentType}" does not contain a valid boundary.`);
        }
        let [, boundary] = matches;
        boundary = unquote(boundary);
        this.#boundaryPart = encoder.encode(`--${boundary}`);
        this.#boundaryFinal = encoder.encode(`--${boundary}--`);
        this.#body = body;
    }
    #body;
    #boundaryFinal;
    #boundaryPart;
    #reading;
    async read(options = {}) {
        if (this.#reading) {
            throw new Error("Body is already being read.");
        }
        this.#reading = true;
        const { outPath, maxFileSize = DEFAULT_MAX_FILE_SIZE, maxSize = DEFAULT_MAX_SIZE, bufferSize = DEFAULT_BUFFER_SIZE, } = options;
        const body = new BufReader(this.#body, bufferSize);
        const result = { fields: {} };
        if (!(await readToStartOrEnd(body, this.#boundaryPart, this.#boundaryFinal))) {
            return result;
        }
        try {
            for await (const part of parts({
                body,
                part: this.#boundaryPart,
                final: this.#boundaryFinal,
                maxFileSize,
                maxSize,
                outPath,
            })) {
                const [key, value] = part;
                if (typeof value === "string") {
                    result.fields[key] = value;
                }
                else {
                    if (!result.files) {
                        result.files = [];
                    }
                    result.files.push(value);
                }
            }
        }
        catch (err) {
            if (err instanceof Deno.errors.PermissionDenied) {
                console.error(err.stack ? err.stack : `${err.name}: ${err.message}`);
            }
            else {
                throw err;
            }
        }
        return result;
    }
    async *stream(options = {}) {
        if (this.#reading) {
            throw new Error("Body is already being read.");
        }
        this.#reading = true;
        const { outPath, maxFileSize = DEFAULT_MAX_FILE_SIZE, maxSize = DEFAULT_MAX_SIZE, bufferSize = 32000, } = options;
        const body = new BufReader(this.#body, bufferSize);
        if (!(await readToStartOrEnd(body, this.#boundaryPart, this.#boundaryFinal))) {
            return;
        }
        try {
            for await (const part of parts({
                body,
                part: this.#boundaryPart,
                final: this.#boundaryFinal,
                maxFileSize,
                maxSize,
                outPath,
            })) {
                yield part;
            }
        }
        catch (err) {
            if (err instanceof Deno.errors.PermissionDenied) {
                console.error(err.stack ? err.stack : `${err.name}: ${err.message}`);
            }
            else {
                throw err;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlwYXJ0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibXVsdGlwYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBRSxTQUFTLEVBQWtCLE1BQU0saUJBQWlCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFdEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztBQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO0FBRWxDLE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUM1RCxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQztBQUNwQyxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQztBQUN2QyxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQztBQUMzQixNQUFNLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7QUE0RXBELFNBQVMsTUFBTSxDQUFDLENBQWEsRUFBRSxDQUFhO0lBQzFDLE1BQU0sRUFBRSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFD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