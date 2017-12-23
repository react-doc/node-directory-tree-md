'use strict';

const FS = require('fs');
const PATH = require('path');
const constants = {
  DIRECTORY: 'directory',
  FILE: 'file'
}

function safeReadDirSync(path) {
  let dirData = {};
  try {
    dirData = FS.readdirSync(path);
  } catch (ex) {
    if (ex.code == "EACCES")
      //User does not have permissions, ignore directory
      return null;
    else throw ex;
  }
  return dirData;
}

function strToObj(str) {
  const arr = str.split('\n').filter((item) => !!item);
  const json = {};
  for (let i = 0; i < arr.length; i += 1) {
    const item = arr[i].split(":");
    const key = item[0] ? String.prototype.trim.call(item[0]) : item[0]
    const value = item[1] ? String.prototype.trim.call(item[1]) : item[1]
    json[key] = value;
  }
  return json;
}

function directoryTree(path, options, onEachFile) {
  const name = PATH.basename(path);
  const item = { path, name };
  let stats;

  try { stats = FS.statSync(path); }
  catch (e) { return null; }

  // Skip if it matches the exclude regex
  if (options && options.exclude && options.exclude.test(path))
    return null;

  if (stats.isFile()) {

    const ext = PATH.extname(path).toLowerCase();

    // Skip if it does not match the extension regex
    if (options && options.extensions && !options.extensions.test(ext))
      return null;

    if (options && options.mdconf) {
      const contentStr = FS.readFileSync(path).toString();
      if (contentStr) {
        const contentMatch = contentStr.match(/^<!--(\s?[^>]*)-->/);
        item.relative = item.path.replace(process.cwd(), '');
        item.mdconf = contentMatch ? strToObj(contentMatch[1]) : {};
        item.isEmpty = contentMatch ? !String.prototype.trim.call(contentStr.replace(contentMatch[0], '')) : true;
      }
    }

    item.size = stats.size;  // File size in bytes
    item.extension = ext;
    item.type = constants.FILE;
    if (onEachFile) {
      onEachFile(item, PATH);
    }
  }
  else if (stats.isDirectory()) {
    let dirData = safeReadDirSync(path);
    if (dirData === null) return null;

    item.children = dirData
      .map(child => directoryTree(PATH.join(path, child), options, onEachFile))
      .filter(e => !!e);
    item.size = item.children.reduce((prev, cur) => prev + cur.size, 0);
    item.type = constants.DIRECTORY;
  } else {
    return null; // Or set item.size = 0 for devices, FIFO and sockets ?
  }
  return item;
}

module.exports = directoryTree;
