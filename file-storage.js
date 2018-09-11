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

module.exports = class FileStorage {
  constructor(base, opts = {}) {
    bindMethods(this);
    this.json = opts.json !== false;
    //TODO this.gzip = opts.gzip !== false;
    let baseDir = dataDir;
    if (typeof base === "string") {
      if (base.startsWith("/")) {
        baseDir = base;
      } else {
        baseDir = path.join(dataDir, base);
      }
    }
    mkdirp.sync(baseDir);
    this.base = baseDir;
  }

  async list() {
    return await readdir(this.base);
  }

  async remove(id) {
    return await remove(this.join(id));
  }

  async clear() {
    for (let id of await this.list()) {
      await this.remove(id);
    }
  }

  async put(id, data, raw = false) {
    if (!raw && this.json) {
      data = JSON.stringify(data, null, 2);
    }
    if (!(data instanceof Buffer) && typeof data !== "string") {
      throw "invalid data";
    }
    let filepath = this.join(id);
    return await write(filepath, data);
  }

  async get(id, expiry, raw = false) {
    let filepath = this.join(id);
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
    let data = await read(filepath);
    if (!data) {
      return null;
    }
    if (!raw && this.json) {
      data = JSON.parse(data);
    }
    return data;
  }

  async putRaw(id, data) {
    return await this.put(id, data, true);
  }

  async getRaw(id, expiry) {
    return await this.get(id, expiry, true);
  }

  async getStream(id, expiry) {
    let filepath = this.join(id);
    let result = await this.has(id, expiry);
    if (!result) {
      if (result === null) {
        //have file, but expired
        //best-effort delete
        remove(filepath).catch(err => {
          if (err)
            console.log("<<WARN>> file expire remove failed", filepath, err);
        });
      }
      return null;
    }
    return fs.createReadStream(filepath);
  }

  async mtime(id) {
    let filepath = this.join(id);
    try {
      let s = await stat(filepath);
      return s.mtime;
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
    return null;
  }

  async has(id, expiry) {
    let mtime = await this.mtime(id);
    if (mtime === null) {
      return false; //doesn't exist;
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
    try {
      let s = await stat(this.join(id));
      return s.size;
    } catch (_) {}
    return null;
  }

  join(id) {
    if (this.json && !/\.json$/.test(id)) {
      id += ".json";
    }
    return path.join(this.base, id);
  }

  wrap(scope, key, expiry) {
    let fn = scope[key];
    if (typeof fn !== "function") {
      throw `Expected function`;
    } else if (!/AsyncFunction/.test(fn.constructor)) {
      throw `Expected async function`;
    }
    let n = parseDuration(expiry);
    let newFn = async (...args) => {
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
    scope[key] = newFn;
    return newFn;
  }
};
