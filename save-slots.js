"use strict";

const SaveSlots = (() => {
  // Slot one uses the original key. Older saves stay in place, even if a tab
  // closes during startup or the browser has no room for a second copy.
  const keys = {
    1: "mj-game.qingwa.v1",
    2: "mj-game.qingwa.slot.2",
    3: "mj-game.qingwa.slot.3",
  };
  const ids = Object.keys(keys).map(Number);
  const lastKey = "mj-game.qingwa.last-slot";

  function create(getStorage) {
    const temporary = new Map();
    let last = null;

    function read(id) {
      if (temporary.has(id)) return { raw: temporary.get(id), persistent: false };
      try { return { raw: getStorage().getItem(keys[id]), persistent: true }; }
      catch { return { raw: null, persistent: false }; }
    }

    function write(id, raw) {
      if (!temporary.has(id)) {
        try { getStorage().setItem(keys[id], raw); return true; }
        catch { /* Keep this slot in memory for the remainder of the session. */ }
      }
      temporary.set(id, raw);
      return false;
    }

    function clear(id) {
      if (!temporary.delete(id)) getStorage().removeItem(keys[id]);
    }

    function lastPlayed() {
      if (last) return last;
      try {
        const id = Number(getStorage().getItem(lastKey));
        return ids.includes(id) ? id : null;
      } catch { return null; }
    }

    function choose(id) {
      last = id;
      try { getStorage().setItem(lastKey, String(id)); }
      catch { /* The current tab can remember its selection. */ }
    }

    return { read, write, clear, lastPlayed, choose };
  }

  return { ids, key: id => keys[id], create };
})();

if (typeof module !== "undefined" && module.exports) module.exports = SaveSlots;
