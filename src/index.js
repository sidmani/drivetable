// DriveTable - a database built around Google Drive
// Copyright 2018 Sid Mani and released under the MIT license

const Drive = require('./drive');
const Table = require('./table');

function DriveTable(token, root) {
  this.drive = new Drive(token);
  this.root = root;
  this.tables = {};
}

DriveTable.prototype.table = function(name, idKey = 'id') {
  if (this.tables[name]) {
    throw new Error(`Table of name ${name} already exists!`);
  }

  const t = new Table(name, idKey, this.root, this.drive);
  this.tables[name] = t;
  return t;
};

DriveTable.prototype.open = function() {
  return Promise.all(Object.values(this.tables).forEach(t => t.open()));
};

module.exports = DriveTable;
