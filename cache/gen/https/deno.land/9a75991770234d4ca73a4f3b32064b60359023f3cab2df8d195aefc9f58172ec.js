/*!
 * Adapted directly from negotiator at https://github.com/jshttp/negotiator/
 * which is licensed as follows:
 *
 * (The MIT License)
 *
 * Copyright (c) 2012-2014 Federico Romero
 * Copyright (c) 2012-2014 Isaac Z. Schlueter
 * Copyright (c) 2014-2015 Douglas Christopher Wilson
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
import { compareSpecs, isQuality } from "./common.ts";
const SIMPLE_CHARSET_REGEXP = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
function parseCharset(str, i) {
    const match = SIMPLE_CHARSET_REGEXP.exec(str);
    if (!match) {
        return;
    }
    const [, charset] = match;
    let q = 1;
    if (match[2]) {
        const params = match[2].split(";");
        for (const param of params) {
            const [key, value] = param.trim().split("=");
            if (key === "q") {
                q = parseFloat(value);
                break;
            }
        }
    }
    return { charset, q, i };
}
function parseAcceptCharset(accept) {
    const accepts = accept.split(",");
    const result = [];
    for (let i = 0; i < accepts.length; i++) {
        const charset = parseCharset(accepts[i].trim(), i);
        if (charset) {
            result.push(charset);
        }
    }
    return result;
}
function specify(charset, spec, i) {
    let s = 0;
    if (spec.charset.toLowerCase() === charset.toLocaleLowerCase()) {
        s |= 1;
    }
    else if (spec.charset !== "*") {
        return;
    }
    return { i, o: spec.i, q: spec.q, s };
}
function getCharsetPriority(charset, accepted, index) {
    let priority = { i: -1, o: -1, q: 0, s: 0 };
    for (const accepts of accepted) {
        const spec = specify(charset, accepts, index);
        if (spec &&
            ((priority.s ?? 0) - (spec.s ?? 0) || priority.q - spec.q ||
                (priority.o ?? 0) - (spec.o ?? 0)) < 0) {
            priority = spec;
        }
    }
    return priority;
}
export function preferredCharsets(accept = "*", provided) {
    const accepts = parseAcceptCharset(accept);
    if (!provided) {
        return accepts
            .filter(isQuality)
            .sort(compareSpecs)
            .map((spec) => spec.charset);
    }
    const priorities = provided
        .map((type, index) => getCharsetPriority(type, accepts, index));
    return priorities
        .filter(isQuality)
        .sort(compareSpecs)
        .map((priority) => provided[priorities.indexOf(priority)]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcnNldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNoYXJzZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0E0Qkc7QUFFSCxPQUFPLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBZSxNQUFNLGFBQWEsQ0FBQztBQU1uRSxNQUFNLHFCQUFxQixHQUFHLDZCQUE2QixDQUFDO0FBRTVELFNBQVMsWUFBWSxDQUFDLEdBQVcsRUFBRSxDQUFTO0lBQzFDLE1BQU0sS0FBSyxHQUFHLHFCQUFxQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM5QyxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ1YsT0FBTztLQUNSO0lBRUQsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO0lBQzFCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ1osTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUMxQixNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDN0MsSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFO2dCQUNmLENBQUMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3RCLE1BQU07YUFDUDtTQUNGO0tBQ0Y7SUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUMzQixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxNQUFjO0lBQ3hDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFD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