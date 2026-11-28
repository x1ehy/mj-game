"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../world.js");
const C = require("../encounters.js");

function inspection(equipped) {
  const s = W.fresh();
  s.place = "canal"; s.day = 9; s.cleared = { furnace: true, sluice: true };
  s.inventory = { lid: 1, seal: 1 }; s.equipped.weapon = equipped;
  s.waterCase = { openedDay: 3, outcome: "commons" };
  assert.equal(W.act(s, "fight"), true);
  return s;
}
function play(s, ...ids) {
  for (const id of ids) assert.equal(W.fight(s, id), true, id);
}
test("both artifacts win using only visible tells; Thor's first win pays once and spends no time", () => {
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
      assert.deepEqual(s.inventory, { lid: 1, seal: 1, buckle: 1 });
      assert.equal(s.battle.thorReward, true);
      assert.match(W.victoryReport("thor", s.battle.thorReward), /雷纹铁扣/);
      play(s, "leave");
      assert.ok(W.act(s, "fight"));
      s.battle.duel.move = "recover";
      s.battle.armor = 1;
      play(s, "hit");
      assert.equal(s.inventory.buckle, 1);
      assert.equal(s.battle.thorReward, undefined);
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

test("new equipment applies the same bonuses in previews, initiative and resolved damage", () => {
  const s = inspection(null);
  Object.assign(s.inventory, { shoes: 1, jacket: 1, buckle: 1 });
  assert.equal(C.attributes(s, "shoes").speed, 320);
  for (const [id, damage, loss, first] of [
    ["shoes", 2000, 2000, "灭霸"],
    ["jacket", 2000, 1400, "雷神托尔"],
    ["buckle", 2700, 2000, "雷神托尔"],
  ]) {
    play(s, "leave");
    for (const worn of Object.values(s.equipped).filter(Boolean)) assert.ok(W.equip(s, worn));
    assert.equal(W.equip(s, id), true);
    assert.ok(W.act(s, "fight"));
    s.battle.duel.move = "jab";
    assert.equal(W.equip(s, id), false);
    assert.match(C.commands(s.battle, s)[0].desc, new RegExp(String(damage)));
    play(s, "hit");
    assert.equal(s.battle.armor, 16000 - damage);
    assert.equal(s.battle.health, 10000 - loss);
    assert.ok(s.battle.turns[0].text.startsWith(first + "先手"));
  }
});

test("pills spend one turn and persist only if the action executes", () => {
  const s = inspection("seal");
  s.inventory.pill = 1;
  s.battle.duel.move = "recover";
  assert.equal(W.fight(s, "pill"), false);
  play(s, "tide");
  const revived = JSON.parse(JSON.stringify(s));
  s.battle.duel.move = "jab"; s.battle.health = 2000;
  play(s, "pill");
  assert.equal(s.battle.outcome, "defeat");
  assert.equal(s.inventory.pill, 1);
  assert.equal(s.battle.spirit, 1);

  revived.battle.duel.move = "slam";
  const motions = [];
  assert.equal(W.fight(revived, "pill", motions), true);
  assert.equal(revived.inventory.pill, 0);
  assert.equal(revived.battle.spirit, 2);
  assert.equal(revived.battle.round, 3);
  assert.deepEqual(motions.map(step => step.cue), ["pill", "thunder"]);
  assert.equal(C.commands(revived.battle, revived).some(action => action.id === "pill"), false);
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
  s.equipped = "seal";
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
  s.equipped = "seal";
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
  s.equipped.weapon = "lid";
  s.battle = C.start("thor", s);
  s.battle.duel.move = "slam";
  assert.match(C.artifactEffects("lid", s)[2].desc, /9600/);
  play(s, "hit");
  assert.equal(s.battle.health, 24000);
  s.battle.duel.move = "slam"; play(s, "brace");
  s.battle.duel.move = "recover"; play(s, "counter");
  assert.equal(s.battle.outcome, "victory");
});

test("round animation receives actual action order, damage and knockouts without writing to the save", () => {
  const s = inspection("seal");
  s.battle.duel.move = "jab";
  const motions = [];
  const immediate = structuredClone(s);
  assert.equal(W.fight(s, "tide", motions), true);
  play(immediate, "tide");
  assert.deepEqual(s, immediate);
  assert.deepEqual(motions.map(({ side, cue, impact }) => [side, cue, impact]), [
    ["foe", "attack", { stat: "health", value: 8000, amount: 2000 }],
    ["hero", "tide", { stat: "armor", value: 12000, amount: 4000 }],
  ]);
  s.battle.duel.move = "slam";
  s.battle.armor = 2000;
  motions.length = 0;
  assert.equal(W.fight(s, "hit", motions), true);
  assert.equal(s.battle.outcome, "victory");
  assert.deepEqual(motions.map(step => step.side), ["hero"]);
});
