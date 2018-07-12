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
  const req = this.drive.list(`name = '${this.name}' and '${this.root}' in parents and mimeType = 'application/vnd.google-apps.folder'`);

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

// create or update an object
Table.prototype.put = function (object) {
  const id = object[this.idKey];
  if (!id) {
    throw new Error('No ID provided!');
  }

  return this.open()
    .then(() => {
      // if this.driveIds[id] exists, return it
      if (this.driveIds[id]) {
        return this.driveIds[id];
      }

      // file drive id isn't cached, so query for it
      const req = this.rawQuery(`properties has { ${this.idKey} = '${id}`, 'id');
      return this.drive.request(req)
        .then(files => (files[0] ? files[0].id : undefined));
    })
    .then((driveId) => {
      let req;
      if (driveId) {
        req = this.drive.update(driveId, { properties: object });
      } else {
        req = this.drive.create({ properties: object });
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
      const req = this.rawQuery(`properties has { ${this.idKey} = '${id}' }`, 'properties,id');
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

// TODO: cache ids from query results
Table.prototype.query = function (match) {
  const clause = `properties has { ${Object.keys(match).forEach(key => `${key} = '${match[key]}'`).join(' and ')} }`;
  const req = this.rawQuery(clause);
  return this.drive.request(req)
    .then(files => files.map(f => f.properties));
};

Table.prototype.rawQuery = function (q, fields = 'properties') {
  return this.drive.list(`(${this.id} in parents)${q ? `and (${q})` : ''}`, fields);
};
