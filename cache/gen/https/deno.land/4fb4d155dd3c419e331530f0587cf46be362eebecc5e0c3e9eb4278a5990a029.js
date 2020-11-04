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
const SIMPLE_LANGUAGE_REGEXP = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;
function parseLanguage(str, i) {
    const match = SIMPLE_LANGUAGE_REGEXP.exec(str);
    if (!match) {
        return undefined;
    }
    const [, prefix, suffix] = match;
    const full = suffix ? `${prefix}-${suffix}` : prefix;
    let q = 1;
    if (match[3]) {
        const params = match[3].split(";");
        for (const param of params) {
            const [key, value] = param.trim().split("=");
            if (key === "q") {
                q = parseFloat(value);
                break;
            }
        }
    }
    return { prefix, suffix, full, q, i };
}
function parseAcceptLanguage(accept) {
    const accepts = accept.split(",");
    const result = [];
    for (let i = 0; i < accepts.length; i++) {
        const language = parseLanguage(accepts[i].trim(), i);
        if (language) {
            result.push(language);
        }
    }
    return result;
}
function specify(language, spec, i) {
    const p = parseLanguage(language, i);
    if (!p) {
        return undefined;
    }
    let s = 0;
    if (spec.full.toLowerCase() === p.full.toLowerCase()) {
        s |= 4;
    }
    else if (spec.prefix.toLowerCase() === p.prefix.toLowerCase()) {
        s |= 2;
    }
    else if (spec.full.toLowerCase() === p.prefix.toLowerCase()) {
        s |= 1;
    }
    else if (spec.full !== "*") {
        return;
    }
    return { i, o: spec.i, q: spec.q, s };
}
function getLanguagePriority(language, accepted, index) {
    let priority = { i: -1, o: -1, q: 0, s: 0 };
    for (const accepts of accepted) {
        const spec = specify(language, accepts, index);
        if (spec &&
            ((priority.s ?? 0) - (spec.s ?? 0) || priority.q - spec.q ||
                (priority.o ?? 0) - (spec.o ?? 0)) < 0) {
            priority = spec;
        }
    }
    return priority;
}
export function preferredLanguages(accept = "*", provided) {
    const accepts = parseAcceptLanguage(accept);
    if (!provided) {
        return accepts
            .filter(isQuality)
            .sort(compareSpecs)
            .map((spec) => spec.full);
    }
    const priorities = provided
        .map((type, index) => getLanguagePriority(type, accepts, index));
    return priorities
        .filter(isQuality)
        .sort(compareSpecs)
        .map((priority) => provided[priorities.indexOf(priority)]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW5ndWFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRCRztBQUVILE9BQU8sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFlLE1BQU0sYUFBYSxDQUFDO0FBUW5FLE1BQU0sc0JBQXNCLEdBQUcsOENBQThDLENBQUM7QUFFOUUsU0FBUyxhQUFhLENBQ3BCLEdBQVcsRUFDWCxDQUFTO0lBRVQsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQy9DLElBQUksQ0FBQyxLQUFLLEVBQUU7UUFDVixPQUFPLFNBQVMsQ0FBQztLQUNsQjtJQUVELE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDakMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sSUFBSSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBRXJELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ1osTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUMxQixNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDN0MsSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFO2dCQUNmLENBQUMsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3RCLE1BQU07YUFDUDtTQUNGO0tBQ0Y7SUFFRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3hDLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLE1BQWM7SUFDekMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsQyxNQUFNLE1BQU0sR0FBMkIsRUFBRSxDQUFDO0lBRTFDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckQsSUFBSSxRQUFRLEVBQUU7WUFDWixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3ZCO0tBQ0Y7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxPQUFPLENBQ2QsUUFBZ0IsRUFDaEIsSUFBMEIsRUFDMUIsQ0FBUztJQUVULE1BQU0sQ0FBQyxHQUFHLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckMsSUFBSSxDQUFDLENBQUMsRUFBRTtRQUNOLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ1YsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7UUFDcEQsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNSO1NBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUU7UUFDL0QsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNSO1NBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUU7UUFDN0QsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNSO1NBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEdBQUcsRUFBRTtRQUM1QixPQUFPO0tBQ1I7SUFFRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3hDLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUMxQixRQUFnQixFQUNoQixRQUFnQyxFQUNoQyxLQUFhO0lBRWIsSUFBSSxRQUFRLEdBQWdCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUN6RCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTtRQUM5QixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxJQUNFLElBQUk7WUFDSixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztnQkFDckQsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDMUM7WUFDQSxRQUFRLEdBQUcsSUFBSSxDQUFDO1NBQ2pCO0tBQ0Y7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUNoQyxNQUFNLEdBQUcsR0FBRyxFQUNaLFFBQW1CO0lBRW5CLE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRTVDLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDYixPQUFPLE9BQU87YUFDWCxNQUFNLENBQUMsU0FBUyxDQUFDO2FBQ2pCLElBQUksQ0FBQyxZQUFZLENBQUM7YUFDbEIsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDN0I7SUFFRCxNQUFNLFVBQVUsR0FBRyxRQUFRO1NBQ3hCLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVuRSxPQUFPLFVBQVU7U0FDZCxNQUFNLENBQUMsU0FBUyxDQUFDO1NBQ2pCLElBQUksQ0FBQyxZQUFZLENBQUM7U0FDbEIsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0QsQ0FBQyJ9