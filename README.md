# A Universal URL Library

## Perform webhook call

```js
const UrlFetch = require('@ntlab/urllib/fetch');

const payload = {message: 'This is the payload'};
const params = {
    method: 'POST',
    data: Buffer.from(JSON.stringify(payload)),
    dataType: 'application/json',
    headers: {
        authorization: 'Bearer MYTOKEN'
    }
}
const callback = new UrlFetch();
callback.fetch('https://example.com/mywebhook', params)
    .then(res => {
        if (res) {
            console.log(res);
        }
    })
    .catch(err => console.error(err));
```

## Download a file

```js
const UrlDownload = require('@ntlab/urllib/download');

let totalSize;
const downloader = new UrlDownload();
downloader.fetch('https://example.com/myfile.dat',
    {
        outfile: '/path/to/myfile.dat',
        onstart: async data => {
            if (data.headers) {
                totalSize = parseInt(data.headers['content-length']);
            }
        },
        ondata: async data => {
            if (data.stream && totalSize > 0) {
                const bytesDone = data.stream.bytesWritten;
                console.log(`Downloaded ${Math.round(bytesDone / totalSize * 100)}%...`);
            }
        }
    })
    .then(data => {
        // data is the downloaded content stream
    })
    .catch(err => console.error(err));
```