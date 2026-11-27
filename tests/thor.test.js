"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../world.js");
const C = require("../encounters.js");

function inspection(equipped) {
  const s = W.fresh();
  s.place = "canal"; s.day = 9; s.cleared = { furnace: true, sluice: true };
  s.inventory = { lid: 1, seal: 1 }; s.equipped = equipped;
  s.waterCase = { openedDay: 3, outcome: "commons" };
  assert.equal(W.act(s, "fight"), true);
  return s;
}
function play(s, ...ids) {
  for (const id of ids) assert.equal(W.fight(s, id), true, id);
}
test("only a settled hearing brings Thor; both artifacts win at starting cultivation with no repeat loot", () => {
  const s = inspection("seal");
  play(s, "tide");
  assert.equal(C.intent(s.battle).title, "贴地横锤");
  play(s, "hit", "hit", "tide", "hit"); assert.equal(s.battle.outcome, "victory");
  play(s, "leave"); assert.ok(W.equip(s, "lid")); assert.ok(W.act(s, "fight"));
  play(s, "brace"); assert.equal(C.intent(s.battle).title, "扶正验收牌");
  const resumed = JSON.parse(JSON.stringify(s));
  play(resumed, "counter", "hit", "brace", "counter");
  assert.equal(resumed.battle.outcome, "victory"); assert.equal(resumed.battle.health, 5);
  assert.equal(resumed.day, 9); assert.deepEqual(resumed.inventory, { lid: 1, seal: 1 });
  play(resumed, "leave"); resumed.waterCase.outcome = null;
  assert.equal(W.act(resumed, "fight"), false);
});
test("snap is free at zero spirit, cooldown survives reload and sweep cannot be interrupted with tide", () => {
  const s = inspection("seal");
  s.battle.spirit = 0;
  play(s, "snap"); assert.equal(s.battle.spirit, 0);
  const resumed = structuredClone(s);
  assert.equal(C.intent(resumed.battle).title, "贴地横锤");
  assert.equal(W.fight(resumed,"snap"),false);
  play(resumed, "hit"); assert.equal(resumed.battle.health, 3);
  assert.equal(W.fight(resumed,"snap"),false);
  play(resumed, "hit", "snap"); assert.equal(resumed.battle.round,5);
  const fresh = inspection("seal"); play(fresh, "tide", "tide");
  assert.equal(fresh.battle.health,3); assert.equal(fresh.battle.spirit,0);
});
test("the counter window expires after one turn and missed braces give no counter", () => {
  const s = inspection("lid"); play(s, "brace", "brace");
  assert.equal(W.fight(s, "counter"),false);
  play(s, "hit","snap","brace");
  assert.equal(s.battle.shield,false);
  assert.equal(s.battle.counterReady,false);
});
test("a pre-update furnace battle resumes without cooldown fields", () => {
  const s = W.fresh(); s.place="academy"; assert.ok(W.act(s, "fight"));
  for (const key of ["snapReadyAt", "sweepNext", "counterReady"]) delete s.battle[key];
  play(s, "snap", "hit", "hit", "snap"); assert.equal(s.battle.health,5);
});
