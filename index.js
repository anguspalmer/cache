const os = require("os");
const { join } = require("path");
const FileStorage = require("./file-storage");
exports.FileStorage = FileStorage;
exports.cache = new FileStorage(join(os.tmpdir(), "fs-cache"));
