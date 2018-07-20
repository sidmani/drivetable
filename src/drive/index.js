const endpoint = 'https://www.googleapis.com/drive/v3/files';

function Drive(token) {
  this.token = token;
  this.batchContext = [];
}

Object.assign(Drive.prototype, require('./request'));

Drive.prototype.batchMap = function (then) {
  return (o, index, arr) => Promise.resolve(o)
    .finally(() => {
      if (index === 0) {
        this.openBatch();
      }
    })
    .then(result => then(result, index))
    .finally(() => {
      if (index === arr.length - 1) {
        this.closeBatch();
      }
    });
};

Drive.prototype.create = function (meta) {
  return this.request({
    endpoint,
    body: JSON.stringify(meta),
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }).then(text => JSON.parse(text).id);
};

Drive.prototype.createFolder = function (name, parent) {
  return this.create({
    name,
    parents: [parent],
    mimeType: 'application/vnd.google-apps.folder',
  });
};

Drive.prototype.get = function (id, fields) {
  return this.request({
    endpoint: `${endpoint}/${id}`,
    query: { fields },
    method: 'GET',
  }).then(text => JSON.parse(text));
};

Drive.prototype.buildQ = function (match) {
  if (!match) { return undefined; }
  return Object.keys(match).map(key => `properties has { key='${key}' and value='${match[key]}' }`).join(' and ');
};

Drive.prototype.list = function (q, fields, spaces = ['drive']) {
  const query = { q, spaces: spaces.join(',') };

  if (fields) {
    query.fields = fields;
  }

  return this.request({
    endpoint,
    query,
    method: 'GET',
  }).then(text => JSON.parse(text).files);
};

Drive.prototype.update = function (id, meta) {
  return this.request({
    endpoint: `${endpoint}/${id}`,
    body: JSON.stringify(meta),
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }).then(() => id);
};

Drive.prototype.delete = function (id) {
  return this.request({
    endpoint: `${endpoint}/${id}`,
    method: 'DELETE',
  }).then(() => id);
};

module.exports = Drive;
