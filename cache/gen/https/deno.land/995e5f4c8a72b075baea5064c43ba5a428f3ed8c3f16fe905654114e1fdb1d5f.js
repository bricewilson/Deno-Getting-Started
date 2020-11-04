/*!
 * Adapted directly from type-is at https://github.com/jshttp/type-is/
 * which is licensed as follows:
 *
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */
import { lookup } from "./deps.ts";
import { format, parse } from "./mediaTyper.ts";
function mimeMatch(expected, actual) {
    if (expected === undefined) {
        return false;
    }
    const actualParts = actual.split("/");
    const expectedParts = expected.split("/");
    if (actualParts.length !== 2 || expectedParts.length !== 2) {
        return false;
    }
    const [actualType, actualSubtype] = actualParts;
    const [expectedType, expectedSubtype] = expectedParts;
    if (expectedType !== "*" && expectedType !== actualType) {
        return false;
    }
    if (expectedSubtype.substr(0, 2) === "*+") {
        return (expectedSubtype.length <= actualSubtype.length + 1 &&
            expectedSubtype.substr(1) ===
                actualSubtype.substr(1 - expectedSubtype.length));
    }
    if (expectedSubtype !== "*" && expectedSubtype !== actualSubtype) {
        return false;
    }
    return true;
}
function normalize(type) {
    if (type === "urlencoded") {
        return "application/x-www-form-urlencoded";
    }
    else if (type === "multipart") {
        return "multipart/*";
    }
    else if (type[0] === "+") {
        return `*/*${type}`;
    }
    return type.includes("/") ? type : lookup(type);
}
function normalizeType(value) {
    try {
        const val = value.split(";");
        const type = parse(val[0]);
        return format(type);
    }
    catch {
        return;
    }
}
export function isMediaType(value, types) {
    const val = normalizeType(value);
    if (!val) {
        return false;
    }
    if (!types.length) {
        return val;
    }
    for (const type of types) {
        if (mimeMatch(normalize(type), val)) {
            return type[0] === "+" || type.includes("*") ? val : type;
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNNZWRpYVR5cGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpc01lZGlhVHlwZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztHQU9HO0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRWhELFNBQVMsU0FBUyxDQUFDLFFBQTRCLEVBQUUsTUFBYztJQUM3RCxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUU7UUFDMUIsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUUxQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFELE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFRCxNQUFNLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxHQUFHLFdBQVcsQ0FBQztJQUNoRCxNQUFNLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxHQUFHLGFBQWEsQ0FBQztJQUV0RCxJQUFJLFlBQVksS0FBSyxHQUFHLElBQUksWUFBWSxLQUFLLFVBQVUsRUFBRTtRQUN2RCxPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQsSUFBSSxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDekMsT0FBTyxDQUNMLGVBQWUsQ0FBQyxNQUFNLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ2xELGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQ25ELENBQUM7S0FDSDtJQUVELElBQUksZUFBZSxLQUFLLEdBQUcsSUFBSSxlQUFlLEtBQUssYUFBYSxFQUFFO1FBQ2hFLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxJQUFZO0lBQzdCLElBQUksSUFBSSxLQUFLLFlBQVksRUFBRTtRQUN6QixPQUFPLG1DQUFtQyxDQUFDO0tBQzVDO1NBQU0sSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFO1FBQy9CLE9BQU8sYUFBYSxDQUFDO0tBQ3RCO1NBQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFO1FBQzFCLE9BQU8sTUFBTSxJQUFJLEVBQUUsQ0FBQztLQUNyQjtJQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQWE7SUFDbEMsSUFBSTtRQUNGLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0IsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3JCO0lBQUMsTUFBTTtRQUNOLE9BQU87S0FDUjtBQUNILENBQUM7QUFLRCxNQUFNLFVBQVUsV0FBVyxDQUFDLEtBQWEsRUFBRSxLQUFlO0lBQ3hELE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUVqQyxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ1IsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUVELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO1FBQ2pCLE9BQU8sR0FBRyxDQUFDO0tBQ1o7SUFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtRQUN4QixJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUU7WUFDbkMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1NBQzNEO0tBQ0Y7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUMifQ==