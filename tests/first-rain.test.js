"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../world.js");
const Rain = require("../first-rain.js");

function settled(outcome) {
  const s = W.fresh();
  Object.assign(s, { day: 10, deed: "taken", lesson: outcome === "warranty" });
  s.introduced = s.lesson;
  s.waterCase = { openedDay: 5, outcome };
  s.cleared.sluice = true;
  s.inventory.seal = 1;
  return s;
}
function act(s, id) { assert.equal(W.act(s, id), true, id); }
function go(s, to) { assert.equal(W.travel(s, to), true, to); }

test("the rain waits for a settled hearing and an intentional visit, including in existing saves", () => {
  const s = W.fresh();
  assert.equal(Rain.notice(s), null);
  assert.equal(W.act(s, "readRain"), false);
  s.waterCase = { openedDay: 1, outcome: null };
  s.cleared.sluice = true;
  for (let i = 0; i < 4; i++) act(s, "wait");
  assert.equal(W.act(s, "readRain"), false);
  act(s, "wait");
  assert.equal(s.waterCase.outcome, "metered");
  const old = structuredClone(s);
  assert.deepEqual(W.upgradeSave(s), old);
  go(s, "academy");
  assert.equal(W.act(s, "readRain"), false);
  go(s, "village");
  act(s, "readRain");
  assert.equal(W.act(s, "readRain"), false);
  assert.equal(W.locationOf("stark", s.day, s), "village");
  assert.equal(Rain.valid({ ...s, firstRain: "unknown" }), false);
  assert.equal(Rain.valid({ ...s, waterCase: null }), false);
});

for (const [outcome, rope] of Object.entries({
  commons: "牛绳", franchise: "票亭", warranty: "保修", metered: "售票凳",
})) {
  test(outcome + " supplies both rescues and preserves the original ruling and ties", () => {
    for (const gate of [true, false]) {
      let s = settled(outcome);
      act(s, "readRain");
      const pupil = s.lesson;
      assert.equal(s.journal[0].text.includes("上回教你"), pupil);
      act(s, "talkStark");
      assert.match(s.journal[0].text, /上游/);
      act(s, gate ? "chooseLock" : "chooseSeed");
      assert.equal(W.act(s, gate ? "chooseSeed" : "chooseLock"), false);
      if (gate) {
        assert.equal(W.act(s, "rigGate"), false);
        go(s, "canal");
      }
      assert.match(W.describe(s, s.place), new RegExp(rope));
      act(s, gate ? "rigGate" : "lashSeeds");
      assert.equal(W.act(s, gate ? "rigGate" : "lashSeeds"), false);
      s = W.upgradeSave(JSON.parse(JSON.stringify(s)));
      go(s, "academy");
      act(s, "wait");
      assert.equal(Rain.valid(s), true);
      go(s, gate ? "village" : "town");
      const finish = gate ? "signalGate" : "drySeeds";
      act(s, finish);
      assert.equal(W.act(s, finish), false);
      assert.equal(s.waterCase.outcome, outcome);
      assert.equal(s.deed, "taken");
      assert.equal(s.lesson, pupil);
      assert.equal(W.relation(s, "stark").includes("授业"), pupil);
      assert.match(W.relation(s, "stark"), gate ? /旁闸/ : /谷种/);
      go(s, "canal");
      act(s, "fight");
      assert.equal(s.battle.id, "thor");
      assert.equal(W.travel(s, "village"), false);
      assert.equal(W.fight(s, "leave"), true);
      const day = s.day;
      go(s, "village");
      assert.equal(s.day - day, gate ? 0 : 1);
      if (!gate) {
        const stones = s.stones;
        act(s, "dryGrain");
        assert.equal(s.stones - stones, 2);
        assert.equal(s.day - day, 2);
      } else assert.equal(W.act(s, "dryGrain"), false);
      const back = s.day;
      go(s, "canal");
      assert.equal(s.day - back, 1);
    }
  });
}
