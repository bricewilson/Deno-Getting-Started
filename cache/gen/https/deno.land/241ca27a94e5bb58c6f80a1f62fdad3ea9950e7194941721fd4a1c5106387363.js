/*!
 * Adapted from koa-send at https://github.com/koajs/send and which is licensed
 * with the MIT license.
 */
import { createHttpError } from "./httpError.ts";
import { basename, extname, parse } from "./deps.ts";
import { decodeComponent, resolvePath } from "./util.ts";
function isHidden(path) {
    const pathArr = path.split("/");
    for (const segment of pathArr) {
        if (segment[0] === "." && segment !== "." && segment !== "..") {
            return true;
        }
        return false;
    }
}
async function exists(path) {
    try {
        return (await Deno.stat(path)).isFile;
    }
    catch {
        return false;
    }
}
export async function send({ request, response }, path, options = { root: "" }) {
    const { brotli = true, extensions, format = true, gzip = true, hidden = false, immutable = false, index, maxage = 0, root, } = options;
    const trailingSlash = path[path.length - 1] === "/";
    path = decodeComponent(path.substr(parse(path).root.length));
    if (index && trailingSlash) {
        path += index;
    }
    if (!hidden && isHidden(path)) {
        throw createHttpError(403);
    }
    path = resolvePath(root, path);
    let encodingExt = "";
    if (brotli &&
        request.acceptsEncodings("br", "identity") === "br" &&
        (await exists(`${path}.br`))) {
        path = `${path}.br`;
        response.headers.set("Content-Encoding", "br");
        response.headers.delete("Content-Length");
        encodingExt = ".br";
    }
    else if (gzip &&
        request.acceptsEncodings("gzip", "identity") === "gzip" &&
        (await exists(`${path}.gz`))) {
        path = `${path}.gz`;
        response.headers.set("Content-Encoding", "gzip");
        response.headers.delete("Content-Length");
        encodingExt = ".gz";
    }
    if (extensions && !/\.[^/]*$/.exec(path)) {
        for (let ext of extensions) {
            if (!/^\./.exec(ext)) {
                ext = `.${ext}`;
            }
            if (await exists(`${path}${ext}`)) {
                path += ext;
                break;
            }
        }
    }
    let stats;
    try {
        stats = await Deno.stat(path);
        if (stats.isDirectory) {
            if (format && index) {
                path += `/${index}`;
                stats = await Deno.stat(path);
            }
            else {
                return;
            }
        }
    }
    catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            throw createHttpError(404, err.message);
        }
        throw createHttpError(500, err.message);
    }
    response.headers.set("Content-Length", String(stats.size));
    if (!response.headers.has("Last-Modified") && stats.mtime) {
        response.headers.set("Last-Modified", stats.mtime.toUTCString());
    }
    if (!response.headers.has("Cache-Control")) {
        const directives = [`max-age=${(maxage / 1000) | 0}`];
        if (immutable) {
            directives.push("immutable");
        }
        response.headers.set("Cache-Control", directives.join(","));
    }
    if (!response.type) {
        response.type = encodingExt !== ""
            ? extname(basename(path, encodingExt))
            : extname(path);
    }
    const file = await Deno.open(path, { read: true });
    response.addResource(file.rid);
    response.body = file;
    return path;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBR0gsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBTyxNQUFNLFdBQVcsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQXlDekQsU0FBUyxRQUFRLENBQUMsSUFBWTtJQUM1QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hDLEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxFQUFFO1FBQzdCLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxPQUFPLEtBQUssR0FBRyxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7WUFDN0QsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLE1BQU0sQ0FBQyxJQUFZO0lBQ2hDLElBQUk7UUFDRixPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0tBQ3ZDO0lBQUMsTUFBTTtRQUNOLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBTUQsTUFBTSxDQUFDLEtBQUssVUFBVSxJQUFJLENBRXhCLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBZ0IsRUFDbkMsSUFBWSxFQUNaLFVBQXVCLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtJQUVuQyxNQUFNLEVBQ0osTUFBTSxHQUFHLElBQUksRUFDYixVQUFVLEVBQ1YsTUFBTSxHQUFHLElBQUksRUFDYixJQUFJLEdBQUcsSUFBSSxFQUNYLE1BQU0sR0FBRyxLQUFLLEVBQ2Qs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