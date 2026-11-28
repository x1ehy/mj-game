"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const SaveSlots = require("../save-slots.js");
const World = require("../world.js");

function browserStorage(entries = []) {
  const records = new Map(entries);
  return {
    getItem: key => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
    removeItem: key => records.delete(key),
  };
}

test("the first slot uses the legacy key and clearing a slot preserves other tabs' saves", () => {
  const storage = browserStorage([["mj-game.qingwa.v1", "old progress"]]);
  const firstTab = SaveSlots.create(() => storage);
  const secondTab = SaveSlots.create(() => storage);
  assert.equal(firstTab.read(1).raw, "old progress");
  assert.equal(firstTab.read(2).raw, null);
  firstTab.choose(1);
  secondTab.choose(2);
  assert.equal(firstTab.lastPlayed(), 1);
  assert.equal(secondTab.lastPlayed(), 2);
  assert.equal(SaveSlots.create(() => storage).lastPlayed(), 2);
  secondTab.write(2, "second playthrough");
  firstTab.clear(1);
  assert.equal(storage.getItem("mj-game.qingwa.v1"), null);
  assert.equal(secondTab.read(2).raw, "second playthrough");
});

test("local storage failures keep distinct temporary slots until the tab closes", () => {
  const fail = () => { throw new Error("storage unavailable"); };
  const tab = SaveSlots.create(fail);
  assert.deepEqual(tab.read(1), { raw: null, persistent: false });
  assert.equal(tab.write(1, "first"), false);
  assert.equal(tab.write(2, "second"), false);
  tab.choose(2);
  assert.equal(tab.lastPlayed(), 2);
  assert.deepEqual(tab.read(1), { raw: "first", persistent: false });
  tab.clear(1);
  assert.equal(tab.read(1).raw, null);
  assert.equal(tab.read(2).raw, "second");
  assert.equal(SaveSlots.create(fail).read(2).raw, null);
});

test("reading a legacy mid-battle save goes back to its location and refunds recorded doses", () => {
  const s = World.fresh();
  World.travel(s, "canal");
  s.inventory.seal = 1;
  s.inventory.pill = 2;
  World.equip(s, "seal");
  World.act(s, "spar");
  s.battle.duel.move = "recover";
  assert.ok(World.fight(s, "tide"));
  s.battle.duel.move = "recover";
  assert.ok(World.fight(s, "pill"));
  assert.equal(s.inventory.pill, 1);
  const result = World.resumeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(result.battle, null);
  assert.equal(result.day, 2);
  assert.equal(result.place, "canal");
  assert.equal(result.inventory.pill, 2);
  assert.equal(result.equipped.weapon, "seal");
  assert.equal(World.resumeSave(result).inventory.pill, 2);
});

test("settled fights retain the result and rewards on load", () => {
  const s = World.fresh();
  World.travel(s, "canal");
  World.act(s, "spar");
  s.battle.armor = 1;
  s.battle.duel.move = "recover";
  assert.ok(World.fight(s, "hit"));
  const result = World.resumeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(result.battle.outcome, "victory");
  assert.equal(result.inventory.buckle, 1);
  assert.equal(World.fight(result, "hit"), false);
});
