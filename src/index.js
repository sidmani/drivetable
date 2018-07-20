// DriveTable - a database built around Google Drive
// Copyright 2018 Sid Mani and released under the MIT license

const Drive = require('./drive');
const Table = require('./table');

function DriveTable(token, root) {
  this.drive = new Drive(token);
  this.root = root;
  this.tables = {};
}

DriveTable.prototype.table = function (name, idKey = 'id') {
  if (this.tables[name]) {
    throw new Error(`Table of name ${name} already exists!`);
  }

  return this.drive.list(`name='${name}' and mimeType='application/vnd.google-apps.folder' and '${this.root}' in parents`, 'files/id').then((res) => {
    // if no such folder exists, create it
    if (res.length === 0) {
      return this.drive.createFolder(name, this.root);
    }

    // return the id if it exists
    return res[0].id;
  }).then((id) => {
    const t = new Table(id, idKey, this.drive);
    this.tables[name] = t;
    return t;
  });
};

module.exports = DriveTable;
