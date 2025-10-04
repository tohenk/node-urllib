/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2025 Toha <tohenk@yahoo.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Fetch URL content for file download or webhook callback.
 *
 * @author Toha <tohenk@yahoo.com>
 */
class UrlFetch {

    /**
     * Do fetch.
     *
     * @param {string} url Url to fetch
     * @param {object} options The options
     * @param {string} options.method The request method, default to GET
     * @param {object} options.headers The request headers
     * @param {Buffer} options.data The request body
     * @param {string} options.dataType The request body mime type, default to application/octet-stream
     * @returns {Promise<any>}
     */
    fetch(url, options) {
        options = options || {};
        return new Promise((resolve, reject) => {
            let done = false;
            const data = options.data;
            const method = options.method || 'GET';
            const params = {
                method,
                headers: {
                    'user-agent': `Node ${process.version}`,
                    'accept': '*/*',
                    ...(options.headers || {})
                }
            }
            if (data instanceof Buffer) {
                params.headers['content-type'] = options.dataType ?? 'application/octet-stream';
                params.headers['content-length'] = data.byteLength;
            }
            const f = () => {
                /** @type {import('http')} */
                let http;
                /** @type {Error} */
                let err;
                /** @type {number} */
                let code;
                /** @type {string} */
                let status;
                /** @type {object} */
                let rheaders;
                const parsedUrl = new URL(url);
                if ('https:' === parsedUrl.protocol) {
                    http = require('https');
                } else {
                    http = require('http');
                }
                params.headers.origin = parsedUrl.origin;
                params.headers.referer = parsedUrl.origin;
                const cookie = this.readCookie(parsedUrl);
                if (cookie) {
                    params.headers.cookie = cookie;
                } else {
                    delete params.headers.cookie;
                }
                const req = http.request(url, params, res => {
                    rheaders = res.headers;
                    code = res.statusCode;
                    status = res.statusMessage;
                    res.on('data', chunk => {
                        if (typeof chunk === 'string') {
                            chunk = Buffer.from(chunk);
                        }
                        this.ondata(chunk);
                    });
                    res.on('end', () => {
                        if (code === 301 || code === 302) {
                            if (rheaders.location) {
                                url = rheaders.location;
                            } else {
                                reject('No redirection to follow!');
                            }
                        } else {
                            if (rheaders['refresh']) {
                                const location = this.constructor.getFilenameOrUrl(rheaders['refresh']);
                                if (location) {
                                    if (location.match(/^http(s)?:\/\//)) {
                                        url = location;
                                    } else {
                                        url = parsedUrl.origin + location;
                                    }
                                } else {
                                    reject('Got refresh without URL!');
                                }
                            } else {
                                done = true;
                            }
                        }
                    });
                    this.onstart({code, status, headers: rheaders, options});
                });
                req.on('error', e => {
                    err = e;
                });
                req.on('close', () => {
                    if (err) {
                        return reject(err);
                    }
                    if (done) {
                        if (rheaders['set-cookie']) {
                            this.writeCookie(parsedUrl, rheaders['set-cookie']);
                        }
                        this.onfinish(resolve);
                    } else {
                        f();
                    }
                });
                if (data instanceof Buffer) {
                    req.write(data);
                }
                req.end();
            }
            f();
        });
    }

    /**
     * Request start handler.
     *
     * @param {object} param0 Response data
     * @param {number} param0.code Response code
     * @param {string} param0.status Response status
     * @param {object} param0.headers Response headers
     * @param {object} param0.options Request options
     */
    onstart({code, status, headers, options}) {
        delete this._buffer;
        this._code = code;
        this._status = status;
        this._headers = headers;
    }

    /**
     * Request data handler.
     *
     * @param {Buffer} data Buffer chunk
     */
    ondata(data) {
        if (this._buffer) {
            this._buffer = Buffer.concat([this._buffer, data]);
        } else {
            this._buffer = data;
        }
    }

    /**
     * Reqeust finish handler.
     *
     * @param {Function} resolve Resolve function
     */
    onfinish(resolve) {
        let res;
        if (this._code >= 200 && this._code < 400 && this._buffer) {
            res = this._buffer.toString();
        }
        resolve(res);
    }

    /**
     * Read cookie from storage.
     *
     * @param {URL} url The url
     * @returns {string}
     */
    readCookie(url) {
        if (!this.cookies) {
            this.cookies = {};
        }
        if (this.cookies[url.hostname]) {
            const cookies = {};
            for (const cookiePath of Object.keys(this.cookies[url.hostname])) {
                if (url.pathname.startsWith(cookiePath)) {
                    Object.assign(cookies, this.cookies[url.hostname][cookiePath]);
                }
            }
            if (Object.keys(cookies).length) {
                const cookie = [];
                for (const k of Object.keys(cookies)) {
                    cookie.push(`${k}=${cookies[k]}`);
                }
                return cookie.join('; ');
            }
        }
    }

    /**
     * Write cookie to storage.
     *
     * @param {URL} url The url
     * @param {string[]} cookies Cookie values
     */
    writeCookie(url, cookies) {
        const items = {};
        for (const cookie of cookies) {
            let cookiePath;
            const cookieNames = {};
            for (const a of cookie.split(';').map(a => a.trim())) {
                const [k, v] = a.split('=');
                switch (k) {
                    case 'path':
                        cookiePath = v;
                        break;
                    case 'domain':
                        break;
                    default:
                        cookieNames[k] = v;
                }
            }
            if (cookiePath && Object.keys(cookieNames).length) {
                if (!items[cookiePath]) {
                    items[cookiePath] = {};
                }
                Object.assign(items[cookiePath], cookieNames);
            }
        }
        if (Object.keys(items).length) {
            /**
             * {
             *   '/': {Cookie1: 'Value1', Cookie2: 'Value2'
             * }
             */
            if (!this.cookies) {
                this.cookies = {};
            }
            if (!this.cookies[url.hostname]) {
                this.cookies[url.hostname] = {};
            }
            for (const cookiePath of Object.keys(items)) {
                if (!this.cookies[url.hostname][cookiePath]) {
                    this.cookies[url.hostname][cookiePath] = {};
                }
                Object.assign(this.cookies[url.hostname][cookiePath], items[cookiePath]);
            }
        }
    }

    /**
     * Get filename or url from header string.
     *
     * @param {string} s Header string
     * @returns {string|undefined}
     */
    static getFilenameOrUrl(s) {
        let res;
        const matches = s.match(/(filename|url)=(.*)/);
        if (matches && matches[2]) {
            res = matches[2];
            for (const q of ['"', '\'']) {
                if (res.substr(0, 1) === q && res.substr(-1) === q) {
                    res = res.substr(1, res.length - 2);
                }
            }
        }
        return res;
    }
}

module.exports = UrlFetch;