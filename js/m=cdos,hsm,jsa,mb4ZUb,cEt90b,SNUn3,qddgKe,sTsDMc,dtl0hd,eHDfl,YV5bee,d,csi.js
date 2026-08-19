this._hd = this._hd || {};

(function (_) {
    var window = this;

    try {
        // --- BASE ERROR HANDLING & FORMATTING ---

        /**
         * Базовый класс ошибки с поддержкой стека вызовов и причины (cause).
         */
        _.CustomError = function (message, cause) {
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, _.CustomError);
            } else {
                let stack = Error().stack;
                if (stack) {
                    this.stack = stack;
                }
            }
            if (message) {
                this.message = String(message);
            }
            if (cause !== undefined) {
                this.cause = cause;
            }
        };

        /**
         * Ошибка с подстановкой строк через %s
         */
        _.FormatError = function (pattern, args) {
            var parts = pattern.split("%s");
            var result = "";
            var length = parts.length - 1;
            for (let i = 0; i < length; i++) {
                result += parts[i] + (i < args.length ? args[i] : "%s");
            }
            _.CustomError.call(this, result + parts[length]);
        };

        const throwGenericError = function (param) {
            throw Error("t");
        };

        const arrayToStringWithPrefix = function (prefix, byteArray) {
            var str = String.fromCharCode.apply(null, byteArray);
            return prefix == null ? str : prefix + str;
        };

        // --- UTF-8 ENCODING / DECODING ---

        /**
         * Кодирование строки в UTF-8 Uint8Array
         */
        _.encodeUtf8 = function (str, throwOnInvalid = false) {
            if (hasNativeTextEncoder) {
                if (throwOnInvalid && (hasIsWellFormed ? !str.isWellFormed() : /(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(str))) {
                    throw Error("u");
                }
                str = (nativeEncoder || (nativeEncoder = new TextEncoder())).encode(str);
            } else {
                let offset = 0;
                let buffer = new Uint8Array(3 * str.length);
                for (let i = 0; i < str.length; i++) {
                    var code = str.charCodeAt(i);
                    if (code < 128) {
                        buffer[offset++] = code;
                    } else if (code < 2048) {
                        buffer[offset++] = (code >> 6) | 192;
                    } else {
                        if (code >= 55296 && code <= 57343) {
                            if (code <= 56319 && i < str.length) {
                                let nextCode = str.charCodeAt(++i);
                                if (nextCode >= 56320 && nextCode <= 57343) {
                                    code = (code - 55296) * 1024 + nextCode - 56320 + 65536;
                                    buffer[offset++] = (code >> 18) | 240;
                                    buffer[offset++] = ((code >> 12) & 63) | 128;
                                    buffer[offset++] = ((code >> 6) & 63) | 128;
                                    buffer[offset++] = (code & 63) | 128;
                                    continue;
                                } else {
                                    i--;
                                }
                            }
                            if (throwOnInvalid) throw Error("u");
                            code = 65533; // Replacement character
                        }
                        buffer[offset++] = (code >> 12) | 224;
                        buffer[offset++] = ((code >> 6) & 63) | 128;
                    }
                    buffer[offset++] = (code & 63) | 128;
                }
                str = offset === buffer.length ? buffer : buffer.subarray(0, offset);
            }
            return str;
        };

        _.asyncThrow = function (err) {
            _.global.setTimeout(() => {
                throw err;
            }, 0);
        };

        // --- STRING HELPERS ---

        _.startsWith = function (str, prefix) {
            return str.lastIndexOf(prefix, 0) === 0;
        };

        _.endsWith = function (str, suffix) {
            var diff = str.length - suffix.length;
            return diff >= 0 && str.indexOf(suffix, diff) === diff;
        };

        _.equalsIgnoreCase = function (a, b) {
            return a.toLowerCase() === b.toLowerCase();
        };

        _.isEmptyOrWhitespace = function (str) {
            return /^[\s\xa0]*$/.test(str);
        };

        _.contains = function (str, sub) {
            return str.indexOf(sub) !== -1;
        };

        /**
         * Сравнение версий (например, "1.2.3" vs "1.2.4")
         */
        _.compareVersions = function (v1, v2) {
            var res = 0;
            var a1 = String(v1).trim().split(".");
            var a2 = String(v2).trim().split(".");
            var maxLen = Math.max(a1.length, a2.length);

            for (let i = 0; res == 0 && i < maxLen; i++) {
                var p1 = a1[i] || "";
                var p2 = a2[i] || "";
                do {
                    var m1 = /(\d*)(\D*)(.*)/.exec(p1) || ["", "", "", ""];
                    var m2 = /(\d*)(\D*)(.*)/.exec(p2) || ["", "", "", ""];
                    if (m1[0].length == 0 && m2[0].length == 0) break;
                    
                    res = compareNumbers(m1[1].length == 0 ? 0 : parseInt(m1[1], 10), m2[1].length == 0 ? 0 : parseInt(m2[1], 10)) ||
                          compareNumbers(m1[2].length == 0, m2[2].length == 0) ||
                          compareNumbers(m1[2], m2[2]);
                    p1 = m1[3];
                    p2 = m2[3];
                } while (res == 0);
            }
            return res;
        };

        const compareNumbers = function (a, b) {
            return a < b ? -1 : a > b ? 1 : 0;
        };

        // --- BROWSER / ENVIRONMENT DETECTION ---

        _.getUserAgent = function () {
            var nav = _.global.navigator;
            return nav && (nav = nav.userAgent) ? nav : "";
        };

        _.isAndroid = function () {
            return _.contains(_.getUserAgent(), "Android");
        };

        _.isiOS = function () {
            var ua = _.getUserAgent();
            return _.contains(ua, "iPhone") || _.contains(ua, "iPad") || _.contains(ua, "iPod");
        };

        _.isMac = function () {
            return _.contains(_.getUserAgent(), "Macintosh");
        };

        _.isWindows = function () {
            return _.contains(_.getUserAgent(), "Windows");
        };

        // --- ARRAY HELPERS ---

        _.findLast = function (arr, predicate, context) {
            var idx = _.findLastIndex(arr, predicate, context);
            return idx < 0 ? null : typeof arr === "string" ? arr.charAt(idx) : arr[idx];
        };

        _.findLastIndex = function (arr, predicate, context) {
            var len = arr.length;
            var elements = typeof arr === "string" ? arr.split("") : arr;
            for (let i = len - 1; i >= 0; i--) {
                if (i in elements && predicate.call(context, elements[i], i, arr)) return i;
            }
            return -1;
        };

        _.removeElement = function (arr, item) {
            var idx = arr.indexOf(item);
            if (idx >= 0) {
                Array.prototype.splice.call(arr, idx, 1);
                return true;
            }
            return false;
        };

        _.flatten = function (arr) {
            var result = [];
            for (let i = 0; i < arguments.length; i++) {
                let arg = arguments[i];
                if (Array.isArray(arg)) {
                    for (let j = 0; j < arg.length; j += 8192) {
                        var chunk = Array.prototype.slice.call(arg, j, j + 8192);
                        chunk = _.flatten.apply(null, chunk);
                        for (let k = 0; k < chunk.length; k++) result.push(chunk[k]);
                    }
                } else {
                    result.push(arg);
                }
            }
            return result;
        };

        // --- BASE64 & BINARY ---

        _.base64Encode = function (input, webSafe = 0) {
            return _.global.btoa(input);
        };

        _.base64Decode = function (input, webSafe) {
            if (!webSafe) return _.global.atob(input);
            var str = "";
            decodeBase64Stream(input, function (byte) {
                str += String.fromCharCode(byte);
            });
            return str;
        };

        // --- OBJECT UTILS & DOM SAFE VALUES ---

        _.mapValues = function (obj, fn, context) {
            var result = {};
            for (let key in obj) {
                result[key] = fn.call(context, obj[key], key, obj);
            }
            return result;
        };

        _.filterObject = function (obj, fn) {
            var result = {};
            for (let key in obj) {
                if (fn.call(undefined, obj[key], key, obj)) {
                    result[key] = obj[key];
                }
            }
            return result;
        };

        _.setScriptSrc = function (element, safeUrl) {
            element.src = _.getTrustedUrlString(safeUrl).toString();
        };

        _.setAnchorHref = function (element, safeUrl) {
            var url = _.unwrapUrl(safeUrl);
            if (url !== undefined) {
                element.href = url;
            }
        };

        _.openWindow = function (win, url, name, features) {
            var unwrappedUrl = _.unwrapUrl(url);
            return unwrappedUrl !== undefined ? win.open(unwrappedUrl, name, features) : null;
        };

    } catch (e) {
        // Ошибки инициализации
    }
})(this._hd);
