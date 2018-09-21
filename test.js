const expect = require("chai").expect;
const { cache } = require(".");

describe("#cache", () => {
  describe("#simple", () => {
    before(async () => {
      await cache.clear();
    });
    it("list 1", async () => {
      let ids = await cache.list();
      expect(ids).to.deep.equal([]);
    });
    it("get 1", async () => {
      let r = await cache.get("foo");
      expect(r).to.be.null;
    });
    it("put 1", async () => {
      await cache.put("foo", { foo: 42 });
    });
    it("list 2", async () => {
      let ids = await cache.list();
      expect(ids).to.deep.equal(["foo"]);
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

  const sub = cache.sub("sub-cache");
  describe("#sub-cache", () => {
    before(async () => {
      await sub.clear();
    });
    it("list 1", async () => {
      let ids = await sub.list();
      expect(ids).to.deep.equal([]);
    });
    it("get 1", async () => {
      let r = await sub.get("foo");
      expect(r).to.be.null;
    });
    it("put 1", async () => {
      await sub.put("foo", { foo: 42 });
    });
    it("list 2", async () => {
      let ids = await sub.list();
      expect(ids).to.deep.equal(["foo"]);
    });
    it("get 2", async () => {
      let r = await sub.get("foo");
      expect(r).to.deep.equal({ foo: 42 });
    });
    it("get 3", async () => {
      let r = await sub.get("foo2");
      expect(r).to.be.null;
    });
  });
});
