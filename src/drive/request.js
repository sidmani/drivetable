const hm = require('hypermessage');
const qs = require('querystringify');
const { fetch, Headers } = require('fetch-ponyfill')();

// combine requests into a batch request
function batch(reqs) {
  // build the request body from individual requests
  const options = {
    headers: {
      'Content-Type': 'application/http',
      'content-transfer-encoding': 'binary',
    },
    autoContentLength: true,
  };

  return {
    body: hm.buildMultipart(reqs.map(hm.build), 'END_OF_PART', options),
    headers: { 'Content-Type': 'multipart/mixed; boundary=END_OF_PART' },
    method: 'POST',
    endpoint: 'https://www.googleapis.com/batch',
  };
}

function executeRequest(request, token) {
  const url = request.endpoint + qs.stringify(request.query, true);

  return fetch(url, {
    method: request.method,
    headers: new Headers(Object.assign({ Authorization: `Bearer ${token}` }, request.headers)),
    body: request.body,
  }).then((res) => {
    if (res.status >= 300 || res.status < 200) {
      throw new Error(`Request error: ${res.status} ${res.statusText}`);
    }
    return res.text();
  });
}

// execute the batch request
module.exports.closeBatch = function () {
  if (!this.batchContext) {
    throw new Error('Batch not opened!');
  }

  // get batchContext and clear it
  const batchContext = this.batchContext;
  this.batchContext = undefined;

  // if only one request, just send it directly
  if (batchContext.length === 1) {
    return executeRequest(batchContext[0], this.token)
      .then(text => batchContext[0].resolve(text));
  }

  const batchRequest = batch(batchContext.map(o => o.request));
  return executeRequest(batchRequest, this.token)
    .then(text => hm.parseMultipart(text)
      .forEach((r, idx) => {
        const res = hm.parse(r);
        if (res.status >= 300 || res.status < 200) {
          batchContext[idx].reject(new Error(`Request error: ${res.status} ${res.statusText}`));
        } else {
          batchContext[idx].resolve(res.body);
        }
      }));
}

module.exports.batchMap = function (then) {
  return (o, index, arr) => Promise.resolve(o)
    .finally(() => {
      this.batchContext = this.batchContext || [];
    })
    .then(result => then(result, index))
    .finally(() => {
      if (index === arr.length - 1) {
        this.closeBatch();
      }
    });
};

module.exports.request = function (request) {
  // if batchContext exists, intercept request and return a promise
  if (this.batchContext) {
    return new Promise((resolve, reject) => {
      this.batchContext.push({
        request,
        resolve,
        reject,
      });
    });
  }

  // otherwise execute the request
  return executeRequest(request, this.token);
};
