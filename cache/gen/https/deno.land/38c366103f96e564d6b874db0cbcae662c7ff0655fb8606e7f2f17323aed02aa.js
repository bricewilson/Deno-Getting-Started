/*!
 * Ported from: https://github.com/jshttp/mime-types and licensed as:
 *
 * (The MIT License)
 *
 * Copyright (c) 2014 Jonathan Ong <me@jongleberry.com>
 * Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>
 * Copyright (c) 2020 the Deno authors
 * Copyright (c) 2020 the oak authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { db } from "./db.ts";
import { extname } from "./deps.ts";
const EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
const TEXT_TYPE_REGEXP = /^text\//i;
export const extensions = new Map();
export const types = new Map();
function populateMaps(extensions, types) {
    const preference = ["nginx", "apache", undefined, "iana"];
    for (const type of Object.keys(db)) {
        const mime = db[type];
        const exts = mime.extensions;
        if (!exts || !exts.length) {
            continue;
        }
        extensions.set(type, exts);
        for (const ext of exts) {
            const current = types.get(ext);
            if (current) {
                const from = preference.indexOf(db[current].source);
                const to = preference.indexOf(mime.source);
                if (current !== "application/octet-stream" &&
                    (from > to ||
                        (from === to && current.substr(0, 12) === "application/"))) {
                    continue;
                }
            }
            types.set(ext, type);
        }
    }
}
populateMaps(extensions, types);
export function charset(type) {
    const m = EXTRACT_TYPE_REGEXP.exec(type);
    if (!m) {
        return;
    }
    const [match] = m;
    const mime = db[match.toLowerCase()];
    if (mime && mime.charset) {
        return mime.charset;
    }
    if (TEXT_TYPE_REGEXP.test(match)) {
        return "UTF-8";
    }
}
export function lookup(path) {
    const extension = extname("x." + path)
        .toLowerCase()
        .substr(1);
    return types.get(extension);
}
export function contentType(str) {
    let mime = str.includes("/") ? str : lookup(str);
    if (!mime) {
        return;
    }
    if (!mime.includes("charset")) {
        const cs = charset(mime);
        if (cs) {
            mime += `; charset=${cs.toLowerCase()}`;
        }
    }
    return mime;
}
export function extension(type) {
    const match = EXTRACT_TYPE_REGEXP.exec(type);
    if (!match) {
        return;
    }
    const exts = extensions.get(match[1].toLowerCase());
    if (!exts || !exts.length) {
        return;
    }
    return exts[0];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBNEJHO0FBRUgsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM3QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRXBDLE1BQU0sbUJBQW1CLEdBQUcseUJBQXlCLENBQUM7QUFDdEQsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUM7QUFHcEMsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO0FBR3RELE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztBQUcvQyxTQUFTLFlBQVksQ0FDbkIsVUFBaUMsRUFDakMsS0FBMEI7SUFFMUIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUUxRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDbEMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFFN0IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDekIsU0FBUztTQUNWO1FBRUQsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFM0IsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDdEIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQixJQUFJLE9BQU8sRUFBRTtnQkFDWCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMs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