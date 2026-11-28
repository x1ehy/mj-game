"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../world.js");
const C = require("../encounters.js");
const Q = require("../quests.js");
const quest = (s, id) => Q.list(s).find(task => task.id === id);

test("task previews leave the world untouched and follow the actual deed actions and late settlement", () => {
  const s = W.fresh(), before = structuredClone(s);
  assert.equal(quest(s,"land").step.action, "witness");
  assert.deepEqual(s, before);
  W.act(s,"witness");
  assert.deepEqual([quest(s,"land").step.place, quest(s,"land").step.day], ["academy",2]);
  W.travel(s,"academy"); W.act(s,"archive");
  assert.equal(quest(s,"land").step.action,"file");
  while (s.day < 5) W.act(s,"wait");
  assert.ok(quest(s,"land").result);
  assert.equal(quest(s,"appeal").step.action,"file");
  W.act(s,"file");
  assert.ok(quest(s,"land").result && quest(s,"appeal").result);
});

test("a moving villager is located on the day of arrival and unreachable water hearings stop directing travel", () => {
  const s = W.fresh();
  W.travel(s,"canal"); // On day 2 the elder is in the village; on day 3 he visits town.
  const next = quest(s,"land").step;
  assert.deepEqual([next.day,next.place],[3,"town"]);
  s.cleared.sluice = true; s.inventory.seal = 1; s.waterCase = {openedDay:2,outcome:null};
  let task = quest(s,"water");
  assert.deepEqual([task.step.action,task.step.place,task.step.day],["takeMeasure","village",3]);
  for (let i=0;i<4;i++) W.act(s,"wait");
  assert.equal(quest(s,"water").step,undefined);
  W.act(s,"wait");
  assert.ok(quest(s,"water").result);
  assert.equal(quest(s,"rain").step.action,"readRain");
});

test("six slots stack; swapping a weapon only changes its commands, and combat locks the loadout", () => {
  const s = W.fresh();
  W.act(s,"mendBank"); assert.ok(W.act(s,"claimTrousers")); assert.equal(W.act(s,"claimTrousers"),false);
  s.place="academy"; s.cleared.furnace=true; assert.ok(W.act(s,"claimCap"));
  for (const id of ["cap","trousers","shoes","jacket","buckle","lid","seal"]) {
    s.inventory[id] = 1;
    assert.ok(W.equip(s,id));
  }
  assert.equal(Object.values(s.equipped).filter(Boolean).length,6);
  assert.deepEqual(C.attributes(s),{maxHealth:11200,maxSpirit:2,attack:3700,defense:2000,speed:320,technique:2000});
  s.place="canal"; W.act(s,"spar");
  assert.ok(C.commands(s.battle,s).some(m=>m.id==="tide"));
  assert.equal(s.battle.shield,false);
  assert.equal(W.equip(s,"lid"),false);
  W.fight(s,"leave"); W.equip(s,"lid"); W.equip(s,"cap"); W.act(s,"spar");
  assert.equal(s.battle.shield,true);
  assert.equal(C.attributes(s).defense,1800);
  assert.ok(!C.commands(s.battle,s).some(m=>m.id==="tide"));
});

test("v3 saves migrate each old slot and preserve an in-progress duel exactly", () => {
  for (const id of [null,"lid","seal","shoes","jacket","buckle"]) {
    const s = W.fresh(); if (id) { s.inventory[id]=1; W.equip(s,id); }
    s.place="canal"; W.act(s,"spar"); s.battle.health=4321;
    const battle=structuredClone(s.battle);
    const expected=structuredClone(s.equipped);
    s.version=3; s.equipped=id; W.upgradeSave(s); W.upgradeSave(s);
    assert.deepEqual(s.equipped,expected); assert.deepEqual(s.battle,battle);
  }
});
