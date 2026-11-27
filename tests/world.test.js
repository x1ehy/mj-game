"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../world.js");
const C = require("../encounters.js");

function act(s, ...actions) {
  for (const id of actions) assert.equal(W.act(s, id), true, id);
}
function travel(s, place) { assert.equal(W.travel(s, place), true, place); }
function fight(s, ...actions) {
  for (const id of actions) assert.equal(W.fight(s, id), true, id);
}

test("two distinct documents restore title and open an introduction and a lesson", () => {
  const s = W.fresh();
  act(s, "witness"); travel(s, "academy");
  assert.equal(W.act(s, "file"), false);
  act(s, "archive", "file"); assert.equal(s.deed, "owned");
  travel(s, "town"); act(s, "introduce"); act(s, "wait", "lesson");
  assert.equal(s.xp, 2); assert.equal(W.act(s, "lesson"), false);
  travel(s, "village"); assert.equal(s.day, 5); assert.equal(s.deed, "owned");
  act(s, "harvest"); assert.equal(s.stones, 6);
});

test("broker accepts cash or a favor, both change future income", () => {
  for (const payment of ["pay", "favor"]) {
    const s = W.fresh();
    travel(s, "town"); act(s, "broker", payment);
    assert.equal(s.deed, "leased"); assert.equal(s.debt, payment === "favor");
    assert.equal(s.stones, payment === "pay" ? 0 : 3);
    assert.equal(W.act(s, payment), false);
    if (s.debt) {
      travel(s, "canal"); act(s, "gather"); travel(s, "town");
      assert.equal(W.act(s, "repay"), false); act(s, "wait", "repay");
      assert.equal(s.inventory.herb, 0); assert.equal(s.debt, false);
    }
    travel(s, "village"); const before = s.stones;
    act(s, "harvest"); assert.equal(s.stones, before + 2);
  }
});

test("an unattended transfer fires once; both late petition and village lease work", () => {
  const s = W.fresh(); act(s, "witness"); travel(s, "canal");
  act(s, "gather", "train", "wait"); assert.equal(s.day, 5); assert.equal(s.deed, "taken");
  const lease = structuredClone(s); travel(lease, "town"); act(lease, "sell");
  travel(lease, "village"); act(lease, "rent"); assert.equal(lease.deed, "leased");
  travel(s, "academy"); act(s, "archive", "file"); assert.equal(s.stones, 1);
  assert.equal(s.deed, "owned"); assert.equal(s.journal.filter(l => l.text.startsWith("第五天交割")).length, 1);
});

test("equipment changes combat; restored fight pays its unique reward once", () => {
  const s = W.fresh(); travel(s, "canal"); act(s, "fight");
  assert.equal(W.travel(s, "town"), false);
  fight(s, "hit", "snap", "hit", "hit", "snap", "hit", "hit");
  assert.equal(s.battle.outcome, "victory"); assert.equal(s.inventory.seal, 1); assert.equal(s.deed, "pending");
  assert.equal(W.fight(s, "hit"), false); assert.equal(W.equip(s, "seal"), false);
  fight(s, "leave"); assert.equal(W.act(s, "fight"), false); assert.equal(W.equip(s, "seal"), true);
  travel(s, "academy"); act(s, "fight"); fight(s, "tide");
  const resumed = JSON.parse(JSON.stringify(s));
  assert.equal(resumed.battle.armor, 4); assert.equal(resumed.battle.health, 5);
  fight(resumed, "hit", "hit", "tide"); assert.equal(resumed.inventory.lid, 1);
  assert.equal(resumed.battle.outcome, "victory");
  fight(resumed, "leave"); travel(resumed, "village"); act(resumed, "witness");
  travel(resumed, "academy"); act(resumed, "archive", "file"); travel(resumed, "village");
  const before = resumed.stones; act(resumed, "harvest"); assert.equal(resumed.stones, before + 4);
});

test("furnace defeat, retry, familiar winning sequence, passive shield, retreat", () => {
  const s = W.fresh(); travel(s, "academy"); act(s, "fight");
  fight(s, "hit", "hit", "hit", "hit"); assert.equal(s.battle.outcome, "defeat");
  fight(s, "retry"); assert.equal(s.battle.round, 1); assert.equal(s.battle.health, 5);
  fight(s, "snap", "hit", "hit", "hit", "hit", "hit"); assert.equal(s.inventory.lid, 1);
  fight(s, "leave"); assert.equal(W.equip(s, "lid"), true); travel(s, "canal"); act(s, "fight");
  fight(s, "hit", "hit"); assert.equal(s.battle.health, 4); assert.equal(s.battle.shield, false);
  fight(s, "leave"); act(s, "fight"); assert.equal(s.battle.shield, true);
});

test("training and gathering reach the next realm and change effective attack strength", () => {
  const s = W.fresh(); act(s, "train", "train"); assert.equal(W.act(s, "advance"), false);
  travel(s, "canal"); act(s, "gather", "advance", "fight");
  assert.equal(s.day, 5); assert.equal(s.deed, "taken"); assert.equal(s.inventory.herb, 0);
  assert.equal(s.battle.health, 7); assert.equal(s.battle.spirit, 3);
  assert.equal(C.intent(s.battle).exposed, true); fight(s, "hit"); assert.equal(s.battle.armor, 4);
});
