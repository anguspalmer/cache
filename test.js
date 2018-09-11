const expect = require("chai").expect;
const { FileStorage } = require(".");

describe("#cache", () => {
  const cache = new FileStorage("cache-test");

  describe("#simple", () => {
    before(async () => {
      await cache.clear();
    });

    it("get 1", async () => {
      let r = await cache.get("foo");
      expect(r).to.be.null;
    });

    it("put 1", async () => {
      await cache.put("foo", { foo: 42 });
    });

    it("get 2", async () => {
      let r = await cache.get("foo");
      expect(r).to.deep.equal({ foo: 42 });
    });

    it("get 3", async () => {
      let r = await cache.get("foo2");
      expect(r).to.be.null;
    });
  });
});
