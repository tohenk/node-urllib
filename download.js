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

const UrlFetch = require('./fetch');
const fs = require('fs');
const path = require('path');

/**
 * Save content of an URL as file download.
 *
 * @author Toha <tohenk@yahoo.com>
 */
class UrlDownload extends UrlFetch {

    onstart({code, headers, options}) {
        let outfile;
        if (options.outfile) {
            outfile = options.outfile;
        } else {
            outfile = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'down-')), '~download');
        }
        this._stream = fs.createWriteStream(outfile);
        this._stream
            .on('drain', () => {
                if (typeof options.ondata === 'function') {
                    options.ondata({stream: this._stream});
                }
            });
        if (typeof options.onstart === 'function') {
            options.onstart({code, headers});
        }
    }

    ondata(data) {
        this._stream.write(data);
    }

    onfinish(resolve) {
        this._stream
            .on('finish', () => {
                resolve({stream: this._stream});
            })
            .end();
    }
}

module.exports = UrlDownload;