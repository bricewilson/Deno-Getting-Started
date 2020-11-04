function lexer(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
        const char = str[i];
        if (char === "*" || char === "+" || char === "?") {
            tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
            continue;
        }
        if (char === "\\") {
            tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
            continue;
        }
        if (char === "{") {
            tokens.push({ type: "OPEN", index: i, value: str[i++] });
            continue;
        }
        if (char === "}") {
            tokens.push({ type: "CLOSE", index: i, value: str[i++] });
            continue;
        }
        if (char === ":") {
            let name = "";
            let j = i + 1;
            while (j < str.length) {
                const code = str.charCodeAt(j);
                if ((code >= 48 && code <= 57) ||
                    (code >= 65 && code <= 90) ||
                    (code >= 97 && code <= 122) ||
                    code === 95) {
                    name += str[j++];
                    continue;
                }
                break;
            }
            if (!name)
                throw new TypeError(`Missing parameter name at ${i}`);
            tokens.push({ type: "NAME", index: i, value: name });
            i = j;
            continue;
        }
        if (char === "(") {
            let count = 1;
            let pattern = "";
            let j = i + 1;
            if (str[j] === "?") {
                throw new TypeError(`Pattern cannot start with "?" at ${j}`);
            }
            while (j < str.length) {
                if (str[j] === "\\") {
                    pattern += str[j++] + str[j++];
                    continue;
                }
                if (str[j] === ")") {
                    count--;
                    if (count === 0) {
                        j++;
                        break;
                    }
                }
                else if (str[j] === "(") {
                    count++;
                    if (str[j + 1] !== "?") {
                        throw new TypeError(`Capturing groups are not allowed at ${j}`);
                    }
                }
                pattern += str[j++];
            }
            if (count)
                throw new TypeError(`Unbalanced pattern at ${i}`);
            if (!pattern)
                throw new TypeError(`Missing pattern at ${i}`);
            tokens.push({ type: "PATTERN", index: i, value: pattern });
            i = j;
            continue;
        }
        tokens.push({ type: "CHAR", index: i, value: str[i++] });
    }
    tokens.push({ type: "END", index: i, value: "" });
    return tokens;
}
export function parse(str, options = {}) {
    const tokens = lexer(str);
    const { prefixes = "./" } = options;
    const defaultPattern = `[^${escapeString(options.delimiter || "/#?")}]+?`;
    const result = [];
    let key = 0;
    let i = 0;
    let path = "";
    const tryConsume = (type) => {
        if (i < tokens.length && tokens[i].type === type)
            return tokens[i++].value;
    };
    const mustConsume = (type) => {
        const value = tryConsume(type);
        if (value !== undefined)
            return value;
        const { type: nextType, index } = tokens[i];
        throw new TypeError(`Unexpected ${nextType} at ${index}, expected ${type}`);
    };
    const consumeText = () => {
        let result = "";
        let value;
        while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
            result += value;
        }
        return result;
    };
    while (i < tokens.length) {
        const char = tryConsume("CHAR");
        const name = tryConsume("NAME");
        const pattern = tryConsume("PATTERN");
        if (name || pattern) {
            let prefix = char || "";
            if (prefixes.indexOf(prefix) === -1) {
                path += prefix;
                prefix = "";
            }
            if (path) {
                result.push(path);
                path = "";
            }
            result.push({
                name: name || key++,
                prefix,
                suffix: "",
                pattern: pattern || defaultPattern,
                modifier: tryConsume("MODIFIER") || ""
            });
            continue;
        }
        const value = char || tryConsume("ESCAPED_CHAR");
        if (value) {
            path += value;
            continue;
        }
        if (path) {
            result.push(path);
            path = "";
        }
        const open = tryConsume("OPEN");
        if (open) {
            const prefix = consumeText();
            const name = tryConsume("NAME") || "";
            const pattern = tryConsume("PATTERN") || "";
            const suffix = consumeText();
            mustConsume("CLOSE");
            result.push({
                name: name || (pattern ? key++ : ""),
                pattern: name && !pattern ? defaultPattern : pattern,
                prefix,
                suffix,
                modifier: tryConsume("MODIFIER") || ""
            });
            continue;
        }
        mustConsume("END");
    }
    return result;
}
export function compile(str, options) {
    return tokensToFunction(parse(str, options), options);
}
export function tokensToFunction(tokens, options = {}) {
    const reFlags = flags(options);
    const { encode = (x) => x, validate = true } = options;
    const matches = tokens.map(token => {
        if (typeof token === "object") {
            return new RegExp(`^(?:${token.pattern})$`, reFlags);
        }
    });
    return (data) => {
        let path = "";
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (typeof token === "string") {
                path += token;
                continue;
            }
            const value = data ? data[token.name] : undefined;
            const optional = token.modifier === "?" || token.modifier === "*";
            const repeat = token.modifier === "*" || token.modifier === "+";
            if (Array.isArray(value)) {
                if (!repeat) {
                    throw new TypeError(`Expected "${token.name}" to not repeat, but got an array`);
                }
                if (value.length === 0) {
                    if (optional)
                        continue;
                    throw new TypeError(`Expected "${token.name}" to not be empty`);
                }
                for (let j = 0; j < value.length; j++) {
                    const segment = encode(value[j], token);
                    if (validate && !matches[i].test(segment)) {
                        throw new TypeError(`Expected all "${token.name}" to match "${token.pattern}", but got "${segment}"`);
                    }
                    path += token.prefix + segment + token.suffix;
                }
                continue;
            }
            if (typeof value === "string" || typeof value === "number") {
                const segment = encode(String(value), token);
                if (validate && !matches[i].test(segment)) {
                    throw new TypeError(`Expected "${token.name}" to match "${token.pattern}", but got "${segment}"`);
                }
                path += token.prefix + segment + token.suffix;
                continue;
            }
            if (optional)
                continue;
            const typeOfMessage = repeat ? "an array" : "a string";
            throw new TypeError(`Expected "${token.name}" to be ${typeOfMessage}`);
        }
        return path;
    };
}
export function match(str, options) {
    const keys = [];
    const re = pathToRegexp(str, keys, options);
    return regexpToFunction(re, keys, options);
}
export function regexpToFunction(re, keys, options = {}) {
    const { decode = (x) => x } = options;
    return function (pathname) {
        const m = re.exec(pathname);
        if (!m)
            return false;
        const { 0: path, index } = m;
        const params = Object.create(null);
        for (let i = 1; i < m.length; i++) {
            if (m[i] === undefined)
                continue;
            const key = keys[i - 1];
            if (key.modifier === "*" || key.modifier === "+") {
                params[key.name] = m[i].split(key.prefix + key.suffix).map(value => {
                    return decode(value, key);
                });
            }
            else {
                params[key.name] = decode(m[i], key);
            }
        }
        return { path, index, params };
    };
}
function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
    return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path, keys) {
    if (!keys)
        return path;
    const groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
    let index = 0;
    let execResult = groupsRegex.exec(path.source);
    while (execResult) {
        keys.push({
            name: execResult[1] || index++,
            prefix: "",
            suffix: "",
            modifier: "",
            pattern: ""
        });
        execResult = groupsRegex.exec(path.source);
    }
    return path;
}
function arrayToRegexp(paths, keys, options) {
    const parts = paths.map(path => pathToRegexp(path, keys, options).source);
    return new RegExp(`(?:${parts.join("|")})`, flags(options));
}
function stringToRegexp(path, keys, options) {
    return tokensToRegexp(parse(path, options), keys, options);
}
export function tokensToRegexp(tokens, keys, options = {}) {
    const { strict = false, start = true, end = true, encode = (x) => x } = options;
    const endsWith = `[${escapeString(options.endsWith || "")}]|$`;
    const delimiter = `[${escapeString(options.delimiter || "/#?")}]`;
    let route = start ? "^" : "";
    for (const token of tokens) {
        if (typeof token === "string") {
            route += escapeString(encode(token));
        }
        else {
            const prefix = escapeString(encode(token.prefix));
            const suffix = escapeString(encode(token.suffix));
            if (token.pattern) {
                if (keys)
                    keys.push(token);
                if (prefix || suffix) {
                    if (token.modifier === "+" || token.modifier === "*") {
                        const mod = token.modifier === "*" ? "?" : "";
                        route += `(?:${prefix}((?:${token.pattern})(?:${suffix}${prefix}(?:${token.pattern}))*)${suffix})${mod}`;
                    }
                    else {
                        route += `(?:${prefix}(${token.pattern})${suffix})${token.modifier}`;
                    }
                }
                else {
                    route += `(${token.pattern})${token.modifier}`;
                }
            }
            else {
                route += `(?:${prefix}${suffix})${token.modifier}`;
            }
        }
    }
    if (end) {
        if (!strict)
            route += `${delimiter}?`;
        route += !options.endsWith ? "$" : `(?=${endsWith})`;
    }
    else {
        const endToken = tokens[tokens.length - 1];
        const isEndDelimited = typeof endToken === "string"
            ? delimiter.indexOf(endToken[endToken.length - 1]) > -1
            :
                endToken === undefined;
        if (!strict) {
            route += `(?:${delimiter}(?=${endsWith}))?`;
        }
        if (!isEndDelimited) {
            route += `(?=${delimiter}|${endsWith})`;
        }
    }
    return new RegExp(route, flags(options));
}
export function pathToRegexp(path, keys, options) {
    if (path instanceof RegExp)
        return regexpToRegexp(path, keys);
    if (Array.isArray(path))
        return arrayToRegexp(path, keys, options);
    return stringToRegexp(path, keys, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFvQkEsU0FBUyxLQUFLLENBQUMsR0FBVztJQUN4QixNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUM7SUFDOUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRVYsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRTtRQUNyQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEIsSUFBSSxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtZQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0QsU0FBUztTQUNWO1FBRUQsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1lBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25FLFNBQVM7U0FDVjtRQUVELElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtZQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekQsU0FBUztTQUNWO1FBRUQsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO1lBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUss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