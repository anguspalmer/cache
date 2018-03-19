# cache

Implements a simple file cache

### Usage

Simple

```js
const {cache} = require("cache");

//write <cache-dir>/foo.json
await cache.put("foo", { my: { object: 42 }});

//read <cache-dir>/foo.json
let myObject = await cache.get("foo");
```

Expiry

```js
//read <cache-dir>/foo.json, if its modified-time
//is within the last 15 minutes
let myObject = await cache.get("foo", "15m");
```
