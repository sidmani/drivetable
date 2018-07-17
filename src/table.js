function Table(name, idKey, root, drive) {
  this.name = name;
  this.drive = drive;
  this.root = root;
  this.idKey = idKey;
  this.driveIds = {};
}

Table.prototype.open = function () {
  if (this.id) return Promise.resolve(this.id);
  // check if folder by name exists as subdirectory of root
  const req = this.drive.list(`name = '${this.name}' and mimeType = 'application/vnd.google-apps.folder' and '${this.root}' in parents`, 'files/id');
  return this.drive.request(req)
    .then((res) => {
      // if no such folder exists, create it
      if (res.length === 0) {
        const r = this.drive.createFolder(this.name, this.root);
        return this.drive.request(r);
      }

      // return the id if it exists
      return res[0].id;
    })
    .then((id) => {
      // store the ID
      this.id = id;
      return id;
    });
};

Table.prototype.getDriveId = function (objectId) {
  if (this.driveIds[objectId]) {
    return Promise.resolve(this.driveIds[objectId]);
  }

  const req = this.rawQuery(`properties has { key='${this.idKey}' and value='${objectId}' }`, 'files/id');
  return this.drive.request(req)
    .then((files) => {
      if (files[0]) {
        this.driveIds[objectId] = files[0].id;
        return files[0].id;
      }
      return undefined;
    });
};

// create or update an object
Table.prototype.put = function (object) {
  const id = object[this.idKey];
  if (!id) {
    throw new Error('No ID provided!');
  }

  return this.open()
    .then(() => this.getDriveId(id))
    .then((driveId) => {
      let req;
      if (driveId) {
        req = this.drive.update(driveId, { properties: object });
      } else {
        req = this.drive.create({
          properties: object,
          parents: [this.id],
          name: id,
        });
      }
      return this.drive.request(req);
    })
    .then((driveId) => {
      this.driveIds[id] = driveId;
    });
};

Table.prototype.get = function (id) {
  return this.open()
    .then(() => {
      // if the driveId is cached, get the file directly
      if (this.driveIds[id]) {
        const req = this.drive.get(this.driveIds[id], 'properties');
        return this.drive.request(req);
      }

      // otherwise, query for it and cache the id
      const req = this.rawQuery(`properties has { key='${this.idKey}' and value='${id}' }`, 'files(properties,id)');
      return this.drive.request(req)
        .then(files => files[0]);
    })
    .then((file) => {
      if (file) {
        this.driveIds[id] = file.id;
        return file.properties;
      }
      return undefined;
    });
};

Table.prototype.delete = function (id) {
  return this.open()
    .then(() => this.getDriveId(id))
    .then(driveId => this.drive.request(this.drive.delete(driveId)))
    .then(() => {
      this.driveIds[id] = undefined;
    });
};

Table.prototype.batchPut = function(objects) {

};

// TODO: cache ids from query results
Table.prototype.query = function (match) {
  const clause = `properties ${Object.keys(match).forEach(key => `has { key='${key}' and value='${match[key]}' }`).join(' and ')} }`;
  const req = this.rawQuery(clause);
  return this.drive.request(req)
    .then(files => files.map(f => f.properties));
};

Table.prototype.rawQuery = function (q, fields = 'files(properties,id)') {
  return this.drive.list(`('${this.id}' in parents)${q ? ` and (${q})` : ''}`, fields);
};

module.exports = Table;
