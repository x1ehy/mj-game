"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../world.js");
const Water = require("../water-case.js");

function act(s, ...ids) {
  for (const id of ids) assert.equal(W.act(s, id), true, id);
}
function go(s, place) { assert.equal(W.travel(s, place), true, place); }
function breakMeter(s) {
  act(s, "fight");
  for (const id of ["hit", "snap", "hit", "hit", "snap", "hit", "hit", "leave"]) {
    assert.equal(W.fight(s, id), true, id);
  }
  assert.equal(s.waterCase.openedDay, s.day);
}
function fifthDay(history) {
  const s = W.fresh();
  if (history === "debt") {
    go(s, "town"); act(s, "broker", "favor", "wait", "wait");
  } else if (history === "pupil") {
    act(s, "witness"); go(s, "academy"); act(s, "archive", "file");
    go(s, "town"); act(s, "introduce", "wait", "lesson");
  } else act(s, "wait", "wait", "wait");
  go(s, "canal"); breakMeter(s);
  assert.equal(s.day, 5);
  return s;
}
function available(s, id) { return W.orders(s).some(a => a.id === id && !a.disabled); }

test("three histories reach the same hearing on the same date with different offers", () => {
  for (const history of ["stranger", "debt", "pupil"]) {
    const s = fifthDay(history);
    assert.equal(Water.notice(s).status, "明日开听");
    assert.equal(available(s, "takeMeasure"), false);
    go(s, "village");
    assert.equal(s.day, 6);
    assert.deepEqual(Water.statements(s, "village").map(([id]) => id), ["elder", "rocket", "stark"]);
    assert.equal(available(s, "takeMeasure"), true);
    assert.equal(available(s, "signFranchise"), history === "debt");
    assert.equal(available(s, "inspectGear"), history === "pupil");
    assert.equal(available(s, "signWarranty"), false);
    assert.equal(available(s, "signCommons"), false);
  }
});

test("public survey can be completed without a previous relationship; it changes the canal harvest", () => {
  const s = fifthDay("stranger");
  go(s, "village"); act(s, "takeMeasure");
  assert.equal(W.act(s, "takeMeasure"), false);
  assert.equal(W.act(s, "gaugeFlow"), false);
  go(s, "canal"); assert.equal(W.locationOf("stark", s.day, s), "canal");
  act(s, "gaugeFlow"); assert.equal(s.inventory.measure, undefined);
  const resumed = JSON.parse(JSON.stringify(s));
  assert.equal(Water.valid(resumed), true);
  go(resumed, "village"); act(resumed, "signCommons");
  assert.equal(resumed.deed, "taken");
  assert.equal(resumed.waterCase.outcome, "commons"); assert.equal(W.act(resumed, "signCommons"), false);
  go(resumed, "canal"); act(resumed, "gather", "wait");
  assert.equal(resumed.inventory.herb, 2); assert.equal(resumed.waterCase.outcome, "commons");
});

test("Rocket's guarantee cancels the existing debt, preserves the owner's share and waives only the water fee", () => {
  const s = fifthDay("debt"); go(s, "village"); act(s, "signFranchise");
  assert.equal(s.debt, false); assert.match(W.relation(s,"rocket"), /保人/);
  assert.equal(s.deed, "leased");
  const before = s.stones;
  act(s, "harvest"); assert.equal(s.stones, before + 3);
  act(s, "wait", "wait", "wait"); assert.equal(s.waterCase.outcome, "franchise");
  assert.equal(W.act(s, "signFranchise"), false);
});

test("repaying the old debt first withdraws the private offer", () => {
  const s = W.fresh(); go(s, "town"); act(s, "broker", "favor"); go(s, "canal"); act(s, "gather");
  breakMeter(s); go(s, "village"); assert.equal(available(s, "signFranchise"), true);
  act(s, "repay"); assert.equal(W.act(s, "signFranchise"), false);
});

test("a pupil can collect a transferable diagnosis, settle on the last day, then practice at the canal", () => {
  const s = fifthDay("pupil"); go(s, "village"); go(s, "canal"); act(s, "inspectGear");
  assert.equal(s.inventory.diagnosis, 1); assert.equal(W.act(s, "signWarranty"), false);
  act(s, "wait"); go(s, "village"); assert.equal(s.day, s.waterCase.openedDay + 4);
  act(s, "signWarranty"); go(s, "canal");
  const xp = s.xp; act(s, "flowPractice");
  assert.equal(s.xp, xp + 2); assert.equal(s.inventory.herb, 1);
  assert.equal(s.waterCase.outcome, "warranty");
});

test("training away from the hearing settles the water contract once, without changing the original lease or debt", () => {
  const s = fifthDay("debt"); go(s, "academy"); act(s, "train", "train", "train", "train", "wait");
  assert.equal(s.waterCase.outcome, "metered"); assert.equal(s.debt, true);
  assert.equal(s.journal.filter(e => e.text.startsWith("水案落印")).length, 1);
  assert.equal(s.journal.find(e => e.text.startsWith("水案落印")).day, 10);
  assert.equal(W.locationOf("stark", s.day, s), W.locationOf("stark", s.day));
  go(s, "village"); const before = s.stones; act(s, "harvest");
  assert.equal(s.stones, before + 2); assert.match(W.describe(s,"village"), /另付一枚/);
});

test("the deed deadline can advance during a hearing and the hearing clock starts only on victory", () => {
  const s = W.fresh(); go(s, "canal"); act(s, "fight"); W.fight(s, "leave");
  assert.equal(s.waterCase, null); breakMeter(s); act(s, "wait", "wait", "wait");
  assert.equal(s.day, 5); assert.equal(s.deed, "taken"); assert.equal(s.waterCase.outcome, null);
  act(s, "wait"); go(s, "village"); assert.equal(s.day, 7);
  assert.equal(s.waterCase.outcome, "metered"); assert.equal(W.act(s, "takeMeasure"), false);
});

test("old saves keep every prior resource and receive the full hearing window, including a saved victory screen", () => {
  const old = fifthDay("debt"); act(old, "wait", "wait");
  old.version = 1; old.equipped = null; delete old.waterCase;
  const before = structuredClone(old);
  W.upgradeSave(old);
  assert.equal(old.version, 4); assert.equal(Water.valid(old), true);
  assert.deepEqual(old.waterCase, { openedDay: before.day, outcome: null });
  for (const key of ["day","deed","place","stones","inventory","debt","cleared","battle"]) assert.deepEqual(old[key], before[key]);
  assert.deepEqual(old.journal.slice(1), before.journal);
  const after = structuredClone(old); W.upgradeSave(old); assert.deepEqual(old,after);
  const early = W.fresh(); early.version = 1; early.equipped = null; delete early.waterCase; W.upgradeSave(early);
  assert.equal(early.waterCase, null); assert.equal(Water.valid(early), true);
  const victory = W.fresh(); go(victory, "canal"); act(victory, "fight");
  for (const id of ["hit","snap","hit","hit","snap","hit","hit"]) W.fight(victory, id);
  Object.assign(victory.battle, { maxHealth: 5, health: 5 });
  victory.version = 1; victory.equipped = null; delete victory.waterCase; W.upgradeSave(victory);
  assert.equal(victory.battle.outcome, "victory"); assert.equal(victory.inventory.seal, 1);
  assert.equal(W.fight(victory, "hit"), false); assert.equal(Water.valid(victory), true);
});
