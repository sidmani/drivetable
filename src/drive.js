const { fetch, Headers } = require('fetch-ponyfill')();
const qs = require('querystringify');

const endpoint = 'https://www.googleapis.com/drive/v3/files';

function Drive(token) {
  this.token = token;
}

Drive.prototype.request = function (req) {
  let url = req.endpoint;
  if (req.query) {
    url += `?${qs.stringify(req.query)}`;
  }

  return fetch(url, {
    method: req.method,
    headers: new Headers(Object.assign({ Authorization: `Bearer ${this.token}` }, req.headers)),
    body: req.body,
  }).then((res) => {
    if (res.status !== 200) {
      throw new Error(`Request error: ${res.status} ${res.statusText}`);
    }
    return res;
  }).then(req.handler);
};

Drive.prototype.batch = function (reqs) {

};

Drive.prototype.createFolder = function (name, parent) {
  return {
    endpoint,
    body: JSON.stringify({
      name,
      parents: [parent],
      mimeType: 'application/vnd.google-apps.folder',
    }),
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    handler: res => res.json().then(json => json.id),
  };
};

Drive.prototype.create = function (meta) {
  return {
    endpoint,
    body: JSON.stringify(meta),
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    handler: res => res.json().then(json => json.id),
  };
};

Drive.prototype.get = function (id, fields) {
  return {
    endpoint: `${endpoint}/${id}`,
    query: { fields },
    method: 'GET',
    handler: res => res.json(),
  };
};

Drive.prototype.list = function (q, fields, spaces = ['drive']) {
  const query = { q, spaces: spaces.join(',') };

  if (fields) {
    query.fields = fields;
  }

  return {
    endpoint,
    query,
    method: 'GET',
    handler: res => res.json().then(json => json.files),
  };
};

Drive.prototype.update = function (id, meta) {
  return {
    endpoint: `${endpoint}/${id}`,
    body: JSON.stringify(meta),
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    handler: () => id,
  };
};

Drive.prototype.delete = function (id) {
  return {
    endpoint: `${endpoint}/${id}`,
    method: 'DELETE',
  };
};

module.exports = Drive;
