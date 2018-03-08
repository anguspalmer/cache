const path = require("path");
const { dataDir, bindMethods, md5, parseDuration } = require("misc");
const { promisify } = require("sync");
const mkdirp = require("mkdirp");
const fs = require("fs");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const read = promisify(fs.readFile);
const write = promisify(fs.writeFile);
const remove = promisify(fs.unlink);

let cacheDir = path.join(dataDir, "cache");

module.exports = class FileStorage {
  constructor(base, opts = {}) {
    bindMethods(this);
    this.json = opts.json !== false;
    this.gzip = opts.gzip !== false;
    let baseDir =
      typeof base === "string" ? path.join(cacheDir, base) : cacheDir;
    mkdirp.sync(baseDir);
    this.base = baseDir;
  }

  async list(dir) {
    let base = typeof dir === "string" ? path.join(this.base, dir) : this.base;
    let files = await readdir(base);
    return files;
  }

  async remove(id) {
    let filepath = path.join(this.base, id);
    if (this.json) {
      if (!/\.json$/.test(filepath)) {
        filepath += ".json";
      }
    }
    return await remove(filepath);
  }

  async put(id, data) {
    if (this.json) {
      data = JSON.stringify(data, null, 2);
      if (!/\.json$/.test(id)) {
        id += ".json";
      }
    }
    return await this.putRaw(id, data);
  }

  async get(id, expiry) {
    if (this.json && !/\.json$/.test(id)) {
      id += ".json";
    }
    let data = await this.getRaw(id, expiry);
    if (!data) {
      return null;
    }
    if (this.json) {
      data = JSON.parse(data);
    }
    return data;
  }

  async putRaw(id, data) {
    if (!(data instanceof Buffer) && typeof data !== "string") {
      throw "invalid data";
    }
    let filepath = path.join(this.base, id);
    return await write(filepath, data);
  }

  async getRaw(id, expiry) {
    let filepath = path.join(this.base, id);
    let result = await this.has(id, expiry);
    if (!result) {
      if (result === null) {
        //have file, but expired
        //best-effort delete
        remove(filepath).catch(err => {
          if (err) console.log("file-expired", filepath, err);
        });
      }
      return null;
    }
    //load from cache
    return await read(filepath);
  }

  async getStream(id, expiry) {
    let filepath = path.join(this.base, id);
    let result = await this.has(id, expiry);
    if (!result) {
      if (result === null) {
        //have file, but expired
        //best-effort delete
        remove(filepath).catch(err => {
          if (err) console.log("file-expired", filepath, err);
        });
      }
      return null;
    }
    return fs.createReadStream(filepath);
  }

  async has(id, expiry) {
    let filepath = path.join(this.base, id);
    let mtime;
    try {
      let s = await stat(filepath);
      mtime = s.mtime;
    } catch (err) {
      if (err.code === "ENOENT") {
        return false; //doesn't exist;
      }
      throw err;
    }
    //exists! check expiry?
    if (expiry) {
      if (typeof expiry === "string") {
        expiry = parseDuration(expiry);
      }
      let age = +new Date() - mtime;
      if (age > expiry) {
        //expired!
        return null;
      }
    }
    return true;
  }

  async sizeOf(id) {
    let filepath = path.join(this.base, id);
    try {
      let s = await stat(filepath);
      return s.size;
    } catch (_) {}
    return null;
  }

  wrap(scope, key, expiry) {
    let fn = scope[key];
    if (typeof fn !== "function") {
      throw `Expected function`;
    } else if (!/AsyncFunction/.test(fn.constructor)) {
      throw `Expected async function`;
    }
    let n = parseDuration(expiry);
    return async (...args) => {
      let j = fn.name + "-" + md5(JSON.stringify(args));
      let result = await this.get(j, n);
      if (result === null) {
        //not cached, run function
        result = await fn.call(scope, ...args);
        //got result, cache
        if (result !== null) {
          await this.put(j, result);
        }
      }
      return result;
    };
  }
};
