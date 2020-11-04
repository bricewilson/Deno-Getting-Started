/*!
 * Adapted directly from http-errors at https://github.com/jshttp/http-errors
 * which is licensed as follows:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Jonathan Ong me@jongleberry.com
 * Copyright (c) 2016 Douglas Christopher Wilson doug@somethingdoug.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import { Status, STATUS_TEXT } from "./deps.ts";
const errorStatusMap = {
    "BadRequest": 400,
    "Unauthorized": 401,
    "PaymentRequired": 402,
    "Forbidden": 403,
    "NotFound": 404,
    "MethodNotAllowed": 405,
    "NotAcceptable": 406,
    "ProxyAuthRequired": 407,
    "RequestTimeout": 408,
    "Conflict": 409,
    "Gone": 410,
    "LengthRequired": 411,
    "PreconditionFailed": 412,
    "RequestEntityTooLarge": 413,
    "RequestURITooLong": 414,
    "UnsupportedMediaType": 415,
    "RequestedRangeNotSatisfiable": 416,
    "ExpectationFailed": 417,
    "Teapot": 418,
    "MisdirectedRequest": 421,
    "UnprocessableEntity": 422,
    "Locked": 423,
    "FailedDependency": 424,
    "UpgradeRequired": 426,
    "PreconditionRequired": 428,
    "TooManyRequests": 429,
    "RequestHeaderFieldsTooLarge": 431,
    "UnavailableForLegalReasons": 451,
    "InternalServerError": 500,
    "NotImplemented": 501,
    "BadGateway": 502,
    "ServiceUnavailable": 503,
    "GatewayTimeout": 504,
    "HTTPVersionNotSupported": 505,
    "VariantAlsoNegotiates": 506,
    "InsufficientStorage": 507,
    "LoopDetected": 508,
    "NotExtended": 510,
    "NetworkAuthenticationRequired": 511,
};
export class HttpError extends Error {
    constructor() {
        super(...arguments);
        this.expose = false;
        this.status = Status.InternalServerError;
    }
}
function createHttpErrorConstructor(status) {
    const name = `${Status[status]}Error`;
    const Ctor = class extends HttpError {
        constructor(message) {
            super();
            this.message = message || STATUS_TEXT.get(status);
            this.status = status;
            this.expose = status >= 400 && status < 500 ? true : false;
            Object.defineProperty(this, "name", {
                configurable: true,
                enumerable: false,
                value: name,
                writable: true,
            });
        }
    };
    return Ctor;
}
export const httpErrors = {};
for (const [key, value] of Object.entries(errorStatusMap)) {
    httpErrors[key] = createHttpErrorConstructor(value);
}
export function createHttpError(status = 500, message) {
    return new httpErrors[Status[status]](message);
}
export function isHttpError(value) {
    return value instanceof HttpError;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cEVycm9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cEVycm9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTBCRztBQUVILE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBR2hELE1BQU0sY0FBYyxHQUFHO0lBQ3JCLFlBQVksRUFBRSxHQUFHO0lBQ2pCLGNBQWMsRUFBRSxHQUFHO0lBQ25CLGlCQUFpQixFQUFFLEdBQUc7SUFDdEIsV0FBVyxFQUFFLEdBQUc7SUFDaEIsVUFBVSxFQUFFLEdBQUc7SUFDZixrQkFBa0IsRUFBRSxHQUFHO0lBQ3ZCLGVBQWUsRUFBRSxHQUFHO0lBQ3BCLG1CQUFtQixFQUFFLEdBQUc7SUFDeEIsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixVQUFVLEVBQUUsR0FBRztJQUNmLE1BQU0sRUFBRSxHQUFHO0lBQ1gsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixvQkFBb0IsRUFBRSxHQUFHO0lBQ3pCLHVCQUF1QixFQUFFLEdBQUc7SUFDNUIsbUJBQW1CLEVBQUUsR0FBRztJQUN4QixzQkFBc0IsRUFBRSxHQUFHO0lBQzNCLDhCQUE4QixFQUFFLEdBQUc7SUFDbkMsbUJBQW1CLEVBQUUsR0FBRztJQUN4QixRQUFRLEVBQUUsR0FBRztJQUNiLG9CQUFvQixFQUFFLEdBQUc7SUFDekIscUJBQXFCLEVBQUUsR0FBRztJQUMxQixRQUFRLEVBQUUsR0FBRztJQUNiLGtCQUFrQixFQUFFLEdBQUc7SUFDdkIsaUJBQWlCLEVBQUUsR0FBRztJQUN0QixzQkFBc0IsRUFBRSxHQUFHO0lBQzNCLGlCQUFpQixFQUFFLEdBQUc7SUFDdEIsNkJBQTZCLEVBQUUsR0FBRztJQUNsQyw0QkFBNEIsRUFBRSxHQUFHO0lBQ2pDLHFCQUFxQixFQUFFLEdBQUc7SUFDMUIsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixZQUFZLEVBQUUsR0FBRztJQUNqQixvQkFBb0IsRUFBRSxHQUFHO0lBQ3pCLGdCQUFnQixFQUFFLEdBQUc7SUFDckIseUJBQXlCLEVBQUUsR0FBRztJQUM5Qix1QkFBdUIsRUFBRSxHQUFHO0lBQzVCLHFCQUFxQixFQUFFLEdBQUc7SUFDMUIsY0FBYyxFQUFFLEdBQUc7SUFDbkIsYUFBYSxFQUFFLEdBQUc7SUFDbEIsK0JBQStCLEVBQUUsR0FBRztDQUNyQyxDQUFDO0FBR0YsTUFBTSxPQUFPLFNBQVUsU0FBUSxLQUFLO0lBQXBDOztRQU1FLFdBQU0sR0FBRyxLQUFLLENBQUM7UUFHZixXQUFNLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDO0lBQ3RDLENBQUM7Q0FBQTtBQUVELFNBQVMsMEJBQTBCLENBQ2pDLE1BQW1CO0lBRW5CLE1BQU0sSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBTSxTQUFRLFNBQVM7UUFDbEMsWUFBWSxPQUFnQjtZQUMxQixLQUFLLEVBQUUsQ0FBQztZQUVSLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBYSxDQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksR0FBRyxJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQzNELE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtnQkFDbEMsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixLQUFLLEVBQUUsSUFBSTtnQkFDWCxRQUFRLEVBQUUsSUFBSTthQUNmLENBQUMsQ0FBQztRQUNMLENBQUM7S0FDRixDQUFDO0lBQ0YsT0FBTyxJQUFTLENBQUM7QUFDbkIsQ0FBQztBQU9ELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FFckIsRUFBUyxDQUFDO0FBRVosS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUU7SUFDekQsVUFBVSxDQUFDLEdBQWtDLENBQUMsR0FBRywwQkFBMEIsQ0FDekUsS0FBSyxDQUNOLENBQUM7Q0FDSDtBQUtELE1BQU0sVUFBVSxlQUFlLENBQzdCLFNBQXNCLEdBQUcsRUFDekIsT0FBZ0I7SUFFaEIsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFnQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDaEYsQ0FBQztBQUdELE1BQU0sVUFBVSxXQUFXLENBQUMsS0FBVTtJQUNwQyxPQUFPLEtBQUssWUFBWSxTQUFTLENBQUM7QUFDcEMsQ0FBQyJ9