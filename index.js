const FileStorage = require("./file-storage");
exports.FileStorage = FileStorage;
exports.cache = new FileStorage("default");
