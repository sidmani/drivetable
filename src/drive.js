const { fetch, Headers } = require('fetch-ponyfill')();
const qs = require('querystringify');

const endpoint = 'https://www.googleapis.com/drive/v3/files';

function Drive(token) {
  this.token = token;
}

Drive.prototype.request = function (req) {
  const url = `${req.endpoint}?${qs.stringify(req.query)}`;

  return fetch(url, {
    method: req.method,
    headers: new Headers(Object.assign({ Authorization: `Bearer ${this.token}` }, req.headers)),
    body: req.body,
  }).then(req.handler);
};

Drive.prototype.batch = function (reqs) {

};

Drive.prototype.createFolder = function (name, parent) {
  return {
    endpoint,
    body: JSON.stringify({
      mimeType: 'application/vnd.google-apps.folder',
      name,
      parent: [parent],
    }),
    method: 'POST',
    handler: res => res.json().then(json => json.id),
  };
};

Drive.prototype.create = function (meta) {
  return {
    endpoint,
    body: JSON.stringify(meta),
    method: 'POST',
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

Drive.prototype.list = function (q, fields, spaces = ['appDataFolder']) {
  return {
    endpoint,
    query: { spaces: spaces.join(','), q, fields },
    method: 'GET',
    handler: res => res.json().then(json => json.files),
  };
};

Drive.prototype.update = function (id, meta) {
  return {
    endpoint: `${endpoint}/${id}`,
    body: JSON.stringify(meta),
    method: 'PATCH',
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
