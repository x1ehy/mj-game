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
test("both artifacts win using only visible tells; inspection and practice give no loot or time", () => {
  for (const equipped of ["lid", "seal"]) {
    for (const seed of [1, 7, 42, 808, 67304]) {
      const s = inspection(equipped);
      s.battle.duel = { move: "jab", seed };
      while (!s.battle.outcome && s.battle.round < 20) {
        const choices = C.forecast(s.battle, s).warning ? ["brace", "tide", "snap", "hit"] : ["counter", "hit"];
        const moves = C.commands(s.battle, s);
        play(s, choices.find(id => moves.some(move => move.id === id && !move.disabled)));
      }
      assert.equal(s.battle.outcome, "victory");
      assert.equal(s.day, 9);
      assert.deepEqual(s.inventory, { lid: 1, seal: 1 });
      play(s, "leave");
      assert.ok(W.act(s, "fight"));
    }
  }
  const fresh = W.fresh();
  assert.equal(W.act(fresh, "spar"), false);
  W.travel(fresh, "canal");
  const before = structuredClone(fresh);
  assert.ok(W.act(fresh, "spar"));
  play(fresh, "leave");
  assert.equal(fresh.day, before.day);
  assert.deepEqual(fresh.cleared, before.cleared);
  assert.equal(fresh.waterCase, null);
  assert.ok(W.act(fresh, "fight")); assert.equal(fresh.battle.id, "sluice");
});

test("ordinary plans share a public forecast and commands; charge occupies a turn and commits the next", () => {
  const s = inspection("seal");
  const ordinary = ["jab", "sweep", "recover", "gather"].map(move => {
    s.battle.duel = { move, seed: 9 };
    return [C.forecast(s.battle, s), C.commands(s.battle, s)];
  });
  for (const view of ordinary) assert.deepEqual(view, ordinary[0]);
  play(s, "hit");
  assert.equal(s.battle.health, 10000);
  assert.match(s.battle.turns[0].text, /举锤聚雷/);
  assert.equal(s.battle.duel.move, "slam");
  assert.equal(C.forecast(s.battle, s).warning, true);
  const resumed = JSON.parse(JSON.stringify(s));
  play(s, "tide"); play(resumed, "tide");
  assert.deepEqual(resumed, s);
  assert.equal(s.battle.health, 10000);
  assert.equal(s.battle.armor, 10000);
  assert.equal(s.battle.spirit, 1);
});

test("speed breaks priority ties; a faster knockout cancels the other move and its resource cost", () => {
  const s = inspection("seal");
  s.battle.duel.move = "jab";
  s.battle.health = 2000;
  play(s, "tide");
  assert.equal(s.battle.outcome, "defeat");
  assert.match(s.battle.turns[0].text, /托尔先手.*防御抵去 1200/);
  assert.equal(s.battle.spirit, 2);
  assert.equal(s.battle.armor, 16000);
  s.trained = true;
  play(s, "retry");
  s.battle.duel.move = "jab";
  play(s, "hit");
  assert.equal(s.battle.health, 23200);
  assert.equal(s.battle.armor, 11000);
  assert.match(s.battle.turns[0].text, /灭霸先手.*抢步出拳.*短柄试探/);
  s.battle.duel.move = "jab"; s.battle.armor = 5000;
  play(s, "hit"); assert.equal(s.battle.health, 23200);
  assert.equal(s.battle.outcome, "victory");
});

test("priority, cooldowns, physical counters and the single-use guard resolve at execution time", () => {
  const s = inspection("seal");
  s.battle.spirit = 0;
  s.battle.duel.move = "slam";
  play(s, "snap"); assert.equal(s.battle.health, 10000);
  assert.match(s.battle.turns[0].text, /灭霸先手.*优先度.*打断/);
  const snapshot = JSON.stringify(s);
  assert.equal(W.fight(s, "snap"), false);
  assert.equal(W.fight(s, "tide"), false);
  assert.equal(JSON.stringify(s), snapshot);
  s.battle.duel.move = "sweep";
  play(s, "stance");
  assert.equal(s.battle.health, 8000); assert.equal(s.battle.armor, 14000);
  assert.equal(W.fight(s, "snap"), false);
  s.battle.duel.move = "recover"; play(s, "hit");
  assert.equal(s.battle.armor, 10000);
  s.battle.duel.move = "sweep"; play(s, "snap");
  assert.equal(s.battle.health, 4000);
  const lid = inspection("lid"); lid.battle.duel.move = "slam";
  play(lid, "brace"); assert.ok(lid.battle.counterReady);
  assert.ok(lid.battle.shield);
  lid.battle.duel.move = "jab";
  play(lid, "hit");
  assert.equal(lid.battle.shield, false);
  assert.equal(lid.battle.health, 10000);
  assert.equal(W.fight(lid, "counter"), false);
  lid.battle.duel.move = "slam"; play(lid, "brace");
  lid.battle.duel.move = "recover"; play(lid, "counter");
  assert.equal(lid.battle.armor, 8000);
});

test("old saves scale once and finish the already telegraphed inspection", () => {
  const s = inspection("seal");
  delete s.battle.duel;
  s.version = 2;
  Object.assign(s.battle, { round: 2, maxHealth: 5, health: 3, armor: 4, sweepNext: true });
  W.upgradeSave(s); W.upgradeSave(s);
  assert.equal(s.battle.maxHealth, 10000);
  assert.equal(s.battle.health, 6000); assert.equal(s.battle.armor, 8000);
  assert.equal(C.forecast(s.battle, s).title, "贴地横锤");
  play(s, "tide");
  assert.equal(s.battle.health, 2000); assert.equal(s.battle.armor, 4000);
});
test("a pre-update furnace battle resumes without cooldown fields", () => {
  const s = W.fresh(); s.place="academy"; assert.ok(W.act(s, "fight"));
  for (const key of ["snapReadyAt", "sweepNext", "counterReady"]) delete s.battle[key];
  play(s, "snap", "hit", "hit", "snap"); assert.equal(s.battle.health,10000);
});

test("a wounded middle-realm duel keeps its health ratio, enemy plan and cooldown after upgrade", () => {
  const s = inspection("seal");
  s.version = 2;
  s.trained = true;
  Object.assign(s.battle, { health: 98, maxHealth: 140, armor: 123, maxSpirit: 3, spirit: 1, round: 3, snapReadyAt: 4 });
  const plan = structuredClone(s.battle.duel);
  W.upgradeSave(s);
  assert.equal(s.battle.health, 16800);
  assert.equal(s.battle.armor, 12300);
  assert.equal(s.battle.spirit, 1);
  assert.deepEqual(s.battle.duel, plan);
  assert.equal(W.fight(s, "snap"), false);
  const saved = structuredClone(s); W.upgradeSave(s); assert.deepEqual(s, saved);
});

test("artifacts scale with the wearer's realm in preview and in combat", () => {
  const s = inspection("seal");
  s.trained = true;
  s.battle = C.start("thor", s);
  s.battle.duel.move = "slam";
  assert.match(C.artifactEffects("seal", s)[0].desc, /4000/);
  play(s, "tide");
  assert.equal(s.battle.armor, 7000);
  s.equipped = "lid";
  s.battle = C.start("thor", s);
  s.battle.duel.move = "slam";
  assert.match(C.artifactEffects("lid", s)[2].desc, /9600/);
  play(s, "hit");
  assert.equal(s.battle.health, 24000);
  s.battle.duel.move = "slam"; play(s, "brace");
  s.battle.duel.move = "recover"; play(s, "counter");
  assert.equal(s.battle.outcome, "victory");
});
