/*!
 * Adapted directly from media-typer at https://github.com/jshttp/media-typer/
 * which is licensed as follows:
 *
 * media-typer
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */
const SUBTYPE_NAME_REGEXP = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/;
const TYPE_NAME_REGEXP = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/;
const TYPE_REGEXP = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;
class MediaType {
    constructor(type, subtype, suffix) {
        this.type = type;
        this.subtype = subtype;
        this.suffix = suffix;
    }
}
export function format(obj) {
    const { subtype, suffix, type } = obj;
    if (!TYPE_NAME_REGEXP.test(type)) {
        throw new TypeError("Invalid type.");
    }
    if (!SUBTYPE_NAME_REGEXP.test(subtype)) {
        throw new TypeError("Invalid subtype.");
    }
    let str = `${type}/${subtype}`;
    if (suffix) {
        if (!TYPE_NAME_REGEXP.test(suffix)) {
            throw new TypeError("Invalid suffix.");
        }
        str += `+${suffix}`;
    }
    return str;
}
export function parse(str) {
    const match = TYPE_REGEXP.exec(str.toLowerCase());
    if (!match) {
        throw new TypeError("Invalid media type.");
    }
    let [, type, subtype] = match;
    let suffix;
    const idx = subtype.lastIndexOf("+");
    if (idx !== -1) {
        suffix = subtype.substr(idx + 1);
        subtype = subtype.substr(0, idx);
    }
    return new MediaType(type, subtype, suffix);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkaWFUeXBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1lZGlhVHlwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7R0FPRztBQUVILE1BQU0sbUJBQW1CLEdBQUcseUNBQXlDLENBQUM7QUFDdEUsTUFBTSxnQkFBZ0IsR0FBRyx3Q0FBd0MsQ0FBQztBQUNsRSxNQUFNLFdBQVcsR0FDZix3RkFBd0YsQ0FBQztBQUUzRixNQUFNLFNBQVM7SUFDYixZQUVTLElBQVksRUFFWixPQUFlLEVBRWYsTUFBZTtRQUpmLFNBQUksR0FBSixJQUFJLENBQVE7UUFFWixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBRWYsV0FBTSxHQUFOLE1BQU0sQ0FBUztJQUNyQixDQUFDO0NBQ0w7QUFTRCxNQUFNLFVBQVUsTUFBTSxDQUFDLEdBQWM7SUFDbkMsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDO0lBRXRDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDaEMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztLQUN0QztJQUNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDdEMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0tBQ3pDO0lBRUQsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksT0FBTyxFQUFFLENBQUM7SUFFL0IsSUFBSSxNQUFNLEVBQUU7UUFDVixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2xDLE1BQU0sSUFBSSxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztTQUN4QztRQUVELEdBQUcsSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDO0tBQ3JCO0lBRUQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBV0QsTUFBTSxVQUFVLEtBQUssQ0FBQyxHQUFXO0lBQy9CLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFFbEQsSUFBSSxDQUFDLEtBQUssRUFBRTtRQUNWLE1BQU0sSUFBSSxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztLQUM1QztJQUVELElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUM7SUFDOUIsSUFBSSxNQUEwQixDQUFDO0lBRS9CLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDZCxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDakMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ2xDO0lBRUQsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzlDLENBQUMifQ==