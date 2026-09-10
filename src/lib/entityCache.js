// Transparent stale-while-revalidate cache for base44 entity reads.
// Benefits every page without code changes: revisiting a module within
// the TTL returns cached data instantly; any mutation invalidates the
// affected entity so the next read fetches fresh data.

const TTL = 10000; // 10 seconds
const cache = new Map(); // `${name}:${op}:${argsKey}` -> { data, ts }
const inflight = new Map(); // dedupe concurrent identical reads

const argsKey = (args) => {
  try { return JSON.stringify(args); } catch { return String(args); }
};

const readMethods = ["list", "filter"];
const writeMethods = ["create", "update", "delete", "bulkCreate", "bulkUpdate", "updateMany", "deleteMany"];

function invalidate(name) {
  for (const k of cache.keys()) {
    if (k.startsWith(`${name}:`)) cache.delete(k);
  }
}

function wrapEntity(name, entity) {
  const wrapped = {};
  for (const m of readMethods) {
    if (typeof entity[m] !== "function") continue;
    const orig = entity[m].bind(entity);
    wrapped[m] = async function (...args) {
      const key = `${name}:${m}:${argsKey(args)}`;
      const hit = cache.get(key);
      if (hit && Date.now() - hit.ts < TTL) {
        return Array.isArray(hit.data) ? hit.data.slice() : hit.data;
      }
      const existing = inflight.get(key);
      if (existing) return existing;
      const p = orig(...args)
        .then((data) => { cache.set(key, { data, ts: Date.now() }); inflight.delete(key); return data; })
        .catch((err) => { inflight.delete(key); throw err; });
      inflight.set(key, p);
      return p;
    };
  }
  for (const m of writeMethods) {
    if (typeof entity[m] !== "function") continue;
    const orig = entity[m].bind(entity);
    wrapped[m] = async function (...args) {
      const res = await orig(...args);
      invalidate(name);
      return res;
    };
  }
  // Pass through other props (get, subscribe, importEntities, ...)
  return new Proxy(wrapped, {
    get(target, prop) {
      if (prop in target) return target[prop];
      const val = entity[prop];
      return typeof val === "function" ? val.bind(entity) : val;
    },
  });
}

export function augmentClient(client) {
  const real = client.entities;
  const wrappedEntities = new Map();
  client.entities = new Proxy(real, {
    get(target, name) {
      const entity = Reflect.get(target, name);
      if (!entity || typeof entity !== "object" || typeof entity.list !== "function") {
        return entity;
      }
      if (!wrappedEntities.has(name)) {
        wrappedEntities.set(name, wrapEntity(name, entity));
      }
      return wrappedEntities.get(name);
    },
  });
  return client;
}