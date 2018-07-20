function Table(id, idKey, drive) {
  this.id = id;
  this.drive = drive;
  this.idKey = idKey;
  this.driveIds = {};
}

Table.prototype.getDriveId = function (objectId) {
  if (this.driveIds[objectId]) {
    return Promise.resolve(this.driveIds[objectId]);
  }

  return this.rawQuery(this.drive.buildQ({ [this.idKey]: objectId }), 'files/id')
    .then((files) => {
      if (files[0]) {
        this.driveIds[objectId] = files[0].id;
        return files[0].id;
      }
      return undefined;
    });
};

Table.prototype.extractId = function (object) {
  const id = object[this.idKey];
  if (!id) {
    throw new Error('No ID provided!');
  }
  return id;
};

// create or update an object
Table.prototype.put = function (object) {
  return this.batchPut([object])[0];
};

Table.prototype.batchPut = function (objs) {
  return objs
    // map objects => object IDs
    .map(o => this.extractId(o))
    // batch getDriveId request
    .map(this.drive.batchMap(id => this.getDriveId(id)))
    // batch put request
    .map(this.drive.batchMap((driveId, idx) => {
      const object = objs[idx];
      const objectId = object[this.idKey];

      if (driveId) {
        return this.drive.update(driveId, { properties: object });
      }

      return this.drive.create({
        properties: object,
        parents: [this.id],
        name: objectId,
      }).then((i) => {
        this.driveIds[objectId] = i;
        return objectId;
      });
    }));
};

Table.prototype.get = function (id) {
  if (this.driveIds[id]) {
    return this.drive.get(this.driveIds[id], 'properties')
      .then(f => f.properties);
  }

  return this.rawQuery(this.drive.buildQ({ [this.idKey]: id }), 'files(properties,id)')
    .then((files) => {
      if (files[0]) {
        this.driveIds[id] = files[0].id;
        return files[0].properties;
      }
      return undefined;
    });
};

Table.prototype.batchGet = function (ids) {
  return ids.map(this.drive.batchMap(id => this.get(id)));
};

Table.prototype.delete = function (id) {
  return this.batchDelete([id])[0];
};

Table.prototype.batchDelete = function (ids) {
  return ids
    .map(this.drive.batchMap(id => this.getDriveId(id)))
    .map(this.drive.batchMap(dId => this.drive.delete(dId)))
    .map((p, ix) => p.then(() => {
      this.driveIds[ids[ix]] = undefined;
    }));
};

// TODO: cache ids from query results
Table.prototype.query = function (match, fields = 'files(properties,id)') {
  return this.rawQuery(this.drive.buildQ(match), fields)
    .then(files => files.map(f => f.properties));
};

Table.prototype.rawQuery = function (q, fields = 'files(properties,id)') {
  return this.drive.list(`('${this.id}' in parents)${q ? ` and (${q})` : ''}`, fields);
};

module.exports = Table;
