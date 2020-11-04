import { NATIVE_OS } from "./_constants.ts";
import { join, normalize } from "./mod.ts";
import { SEP, SEP_PATTERN } from "./separator.ts";
const regExpEscapeChars = ["!", "$", "(", ")", "*", "+", ".", "=", "?", "[", "\\", "^", "{", "|"];
const rangeEscapeChars = ["-", "\\", "]"];
export function globToRegExp(glob, { extended = true, globstar: globstarOption = true, os = NATIVE_OS } = {}) {
    if (glob == "") {
        return /(?!)/;
    }
    const sep = os == "windows" ? "(?:\\\\|/)+" : "/+";
    const sepMaybe = os == "windows" ? "(?:\\\\|/)*" : "/*";
    const seps = os == "windows" ? ["\\", "/"] : ["/"];
    const globstar = os == "windows"
        ? "(?:[^\\\\/]*(?:\\\\|/|$)+)*"
        : "(?:[^/]*(?:/|$)+)*";
    const wildcard = os == "windows" ? "[^\\\\/]*" : "[^/]*";
    const escapePrefix = os == "windows" ? "`" : "\\";
    let newLength = glob.length;
    for (; newLength > 1 && seps.includes(glob[newLength - 1]); newLength--)
        ;
    glob = glob.slice(0, newLength);
    let regExpString = "";
    for (let j = 0; j < glob.length;) {
        let segment = "";
        const groupStack = [];
        let inRange = false;
        let inEscape = false;
        let endsWithSep = false;
        let i = j;
        for (; i < glob.length && !seps.includes(glob[i]); i++) {
            if (inEscape) {
                inEscape = false;
                const escapeChars = inRange ? rangeEscapeChars : regExpEscapeChars;
                segment += escapeChars.includes(glob[i]) ? `\\${glob[i]}` : glob[i];
                continue;
            }
            if (glob[i] == escapePrefix) {
                inEscape = true;
                continue;
            }
            if (glob[i] == "[") {
                if (!inRange) {
                    inRange = true;
                    segment += "[";
                    if (glob[i + 1] == "!") {
                        i++;
                        segment += "^";
                    }
                    else if (glob[i + 1] == "^") {
                        i++;
                        segment += "\\^";
                    }
                    continue;
                }
                else if (glob[i + 1] == ":") {
                    let k = i + 1;
                    let value = "";
                    while (glob[k + 1] != null && glob[k + 1] != ":") {
                        value += glob[k + 1];
                        k++;
                    }
                    if (glob[k + 1] == ":" && glob[k + 2] == "]") {
                        i = k + 2;
                        if (value == "alnum")
                            segment += "\\dA-Za-z";
                        else if (value == "alpha")
                            segment += "A-Za-z";
                        else if (value == "ascii")
                            segment += "\x00-\x7F";
                        else if (value == "blank")
                            segment += "\t ";
                        else if (value == "cntrl")
                            segment += "\x00-\x1F\x7F";
                        else if (value == "digit")
                            segment += "\\d";
                        else if (value == "graph")
                            segment += "\x21-\x7E";
                        else if (value == "lower")
                            segment += "a-z";
                        else if (value == "print")
                            segment += "\x20-\x7E";
                        else if (value == "punct") {
                            segment += "!\"#$%&'()*+,\\-./:;<=>?@[\\\\\\]^_‘{|}~";
                        }
                        else if (value == "space")
                            segment += "\\s\v";
                        else if (value == "upper")
                            segment += "A-Z";
                        else if (value == "word")
                            segment += "\\w";
                        else if (value == "xdigit")
                            segment += "\\dA-Fa-f";
                        continue;
                    }
                }
            }
            if (glob[i] == "]" && inRange) {
                inRange = false;
                segment += "]";
                continue;
            }
            if (inRange) {
                if (glob[i] == "\\") {
                    segment += `\\\\`;
                }
                else {
                    segment += glob[i];
                }
                continue;
            }
            if (glob[i] == ")" && groupStack.length > 0 &&
                groupStack[groupStack.length - 1] != "BRACE") {
                segment += ")";
                const type = groupStack.pop();
                if (type == "!") {
                    segment += wildcard;
                }
                else if (type != "@") {
                    segment += type;
                }
                continue;
            }
            if (glob[i] == "|" && groupStack.length > 0 &&
                groupStack[groupStack.length - 1] != "BRACE") {
                segment += "|";
                continue;
            }
            if (glob[i] == "+" && extended && glob[i + 1] == "(") {
                i++;
                groupStack.push("+");
                segment += "(?:";
                continue;
            }
            if (glob[i] == "@" && extended && glob[i + 1] == "(") {
                i++;
                groupStack.push("@");
                segment += "(?:";
                continue;
            }
            if (glob[i] == "?") {
                if (extended && glob[i + 1] == "(") {
                    i++;
                    groupStack.push("?");
                    segment += "(?:";
                }
                else {
                    segment += ".";
                }
                continue;
            }
            if (glob[i] == "!" && extended && glob[i + 1] == "(") {
                i++;
                groupStack.push("!");
                segment += "(?!";
                continue;
            }
            if (glob[i] == "{") {
                groupStack.push("BRACE");
                segment += "(?:";
                continue;
            }
            if (glob[i] == "}" && groupStack[groupStack.length - 1] == "BRACE") {
                groupStack.pop();
                segment += ")";
                continue;
            }
            if (glob[i] == "," && groupStack[groupStack.length - 1] == "BRACE") {
                segment += "|";
                continue;
            }
            if (glob[i] == "*") {
                if (extended && glob[i + 1] == "(") {
                    i++;
                    groupStack.push("*");
                    segment += "(?:";
                }
                else {
                    const prevChar = glob[i - 1];
                    let numStars = 1;
                    while (glob[i + 1] == "*") {
                        i++;
                        numStars++;
                    }
                    const nextChar = glob[i + 1];
                    if (globstarOption && numStars == 2 &&
                        [...seps, undefined].includes(prevChar) &&
                        [...seps, undefined].includes(nextChar)) {
                        segment += globstar;
                        endsWithSep = true;
                    }
                    else {
                        segment += wildcard;
                    }
                }
                continue;
            }
            segment += regExpEscapeChars.includes(glob[i]) ? `\\${glob[i]}` : glob[i];
        }
        if (groupStack.length > 0 || inRange || inEscape) {
            segment = "";
            for (const c of glob.slice(j, i)) {
                segment += regExpEscapeChars.includes(c) ? `\\${c}` : c;
                endsWithSep = false;
            }
        }
        regExpString += segment;
        if (!endsWithSep) {
            regExpString += i < glob.length ? sep : sepMaybe;
            endsWithSep = true;
        }
        while (seps.includes(glob[i]))
            i++;
        if (!(i > j)) {
            throw new Error("Assertion failure: i > j (potential infinite loop)");
        }
        j = i;
    }
    regExpString = `^${regExpString}$`;
    return new RegExp(regExpString);
}
export function isGlob(str) {
    const chars = { "{": "}", "(": ")", "[": "]" };
    const regex = /\\(.)|(^!|\*|[\].+)]\?|\[[^\\\]]+\]|\{[^\\}]+\}|\(\?[:!=][^\\)]+\)|\([^|]+\|[^\\)]+\))/;
    if (str === "") {
        return false;
    }
    let match;
    while ((match = regex.exec(str))) {
        if (match[2])
            return true;
        let idx = match.index + match[0].length;
        const open = match[1];
        const close = open ? chars[open] : null;
        if (open && close) {
            const n = str.indexOf(close, idx);
            if (n !== -1) {
                idx = n + 1;
            }
        }
        str = str.slice(idx);
    }
    return false;
}
export function normalizeGlob(glob, { globstar = false } = {}) {
    if (glob.match(/\0/g)) {
        throw new Error(`Glob contains invalid characters: "${glob}"`);
    }
    if (!globstar) {
        return normalize(glob);
    }
    const s = SEP_PATTERN.source;
    const badParentPattern = new RegExp(`(?<=(${s}|^)\\*\\*${s})\\.\\.(?=${s}|$)`, "g");
    return normalize(glob.replace(badParentPattern, "\0")).replace(/\0/g, "..");
}
export function joinGlobs(globs, { extended = false, globstar = false } = {}) {
    if (!globstar || globs.length == 0) {
        return join(...globs);
    }
    if (globs.length === 0)
        return ".";
    let joined;
    for (const glob of globs) {
        const path = glob;
        if (path.length > 0) {
            if (!joined)
                joined = path;
            else
                joined += `${SEP}${path}`;
        }
    }
    if (!joined)
        return ".";
    return normalizeGlob(joined, { extended, globstar });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdsb2IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFrQmxELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDbEcsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7QUF3RDFDLE1BQU0sVUFBVSxZQUFZLENBQzFCLElBQVksRUFDWixFQUFFLFFBQVEsR0FBRyxJQUFJLEVBQUUsUUFBUSxFQUFFLGNBQWMsR0FBRyxJQUFJLEVBQUUsRUFBRSxHQUFHLFNBQVMsS0FDMUMsRUFBRTtJQUUxQixJQUFJLElBQUksSUFBSSxFQUFFLEVBQUU7UUFDZCxPQUFPLE1BQU0sQ0FBQztLQUNmO0lBRUQsTUFBTSxHQUFHLEdBQUcsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDbkQsTUFBTSxRQUFRLEdBQUcsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDeEQsTUFBTSxJQUFJLEdBQUcsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFD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