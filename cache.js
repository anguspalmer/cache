//singleton default file storage
const FileStorage = require("./file-storage");
let cache = new FileStorage("default");
module.exports = cache;

//TODO
// class FileCache extends FileStore

if (require.main === module) {
  console.log("TEST CACHE");
  (async function test() {
    await cache.put("foo", { foo: 42 });
    let r = await cache.get("foo");
    console.log(r);
    let r2 = await cache.get("foo2");
    console.log(r2);
    let r3 = await cache.get("foo", "1h");
    console.log(r3);
  })();
}
