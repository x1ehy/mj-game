"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const World = require("../world.js");
const Combat = require("../encounters.js");
const Water = require("../water-case.js");

test("exploration rewards depend on day and local progress and cannot be claimed again after a reload", () => {
  const s = World.fresh();
  assert.equal(World.act(s, "ferryBasket"), false);
  assert.ok(World.travel(s, "town"));
  assert.ok(World.orders(s).some(o => o.id === "bridgeTea" && o.kind === "discovery"));
  assert.ok(World.act(s, "bridgeTea"));
  assert.equal(s.day, 2);
  assert.equal(s.stones, 5);
  assert.equal(s.inventory.pill, 1);
  const saved = World.upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(World.act(saved, "bridgeTea"), false);
  const nextDay = World.fresh();
  World.act(nextDay, "wait");
  World.travel(nextDay, "town");
  assert.equal(World.act(nextDay, "bridgeTea"), false);
  assert.ok(World.act(nextDay, "wait"));
  assert.ok(World.act(nextDay, "bridgeTea"));

  assert.ok(World.travel(s, "academy"));
  assert.equal(World.act(s, "furnaceLedger"), false);
  assert.ok(World.act(s, "fight"));
  for (const move of ["snap", "hit", "hit", "hit", "hit", "hit", "leave"]) assert.ok(World.fight(s, move));
  assert.ok(World.act(s, "furnaceLedger"));
  assert.ok(World.equip(s, "tallyBand"));
  assert.equal(Combat.attributes(s).maxHealth, 10_900);
  assert.equal(Combat.attributes(s).defense, 1300);

  assert.ok(World.act(saved, "broker"));
  assert.ok(World.act(saved, "favor"));
  assert.ok(World.travel(saved, "village"));
  assert.ok(World.act(saved, "ferryBasket"));
  assert.ok(World.equip(saved, "reedBell"));
  assert.equal(Combat.attributes(saved).speed, 260);
});

test("each water verdict gets a distinct discovery and one set of cultivation rewards", () => {
  const names = new Set();
  for (const outcome of Object.keys(Water.endings)) {
    const s = World.fresh();
    s.place = "canal";
    assert.equal(World.act(s, "canalFind"), false);
    s.waterCase = { openedDay: 2, outcome };
    s.day = 7;
    s.cleared.sluice = true;
    names.add(World.orders(s).find(o => o.id === "canalFind").name);
    assert.ok(World.act(s, "canalFind"));
    assert.equal(s.xp, 3);
    assert.equal(s.inventory.herb, 2);
    assert.equal(s.day, 7);
    assert.equal(World.act(s, "canalFind"), false);
  }
  assert.equal(names.size, 4);
});

test("v4 middle realm saves retain gear, quest tracking, and an ongoing fight before advancing", () => {
  const old = World.fresh();
  old.realm = "middle";
  old.place = "canal";
  old.inventory = { seal: 1, herb: 2 };
  old.xp = 11;
  old.trackedQuest = "sluice";
  assert.ok(World.equip(old, "seal"));
  assert.ok(World.act(old, "spar"));
  old.battle.health -= 1000;
  old.version = 4;
  old.trained = true;
  delete old.realm;
  delete old.discoveries;
  delete old.hideTips;
  const battle = structuredClone(old.battle);
  const s = World.upgradeSave(old);
  assert.deepEqual(s.battle, battle);
  assert.equal(s.equipped.weapon, "seal");
  assert.equal(s.trackedQuest, "sluice");
  assert.equal(s.realm, "middle");
  assert.equal(World.act(s, "advance"), false);
  assert.ok(World.fight(s, "leave"));
  assert.equal(World.act(s, "advance"), false);
  assert.ok(World.act(s, "train"));
  assert.equal(World.act(s, "advance"), false);
  assert.ok(World.act(s, "gather"));
  const day = s.day;
  assert.ok(World.act(s, "advance"));
  assert.equal(s.realm, "late");
  assert.equal(s.day, day);
  assert.equal(s.xp, 1);
  assert.equal(s.inventory.herb, 0);
  assert.equal(World.breakthrough(s), undefined);
  assert.ok(World.act(s, "spar"));
  assert.equal(s.battle.maxHealth, 32_000);
  assert.equal(s.battle.maxSpirit, 4);
});
