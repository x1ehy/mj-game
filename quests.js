"use strict";

// Goals use the same orders and calendar as the map, including NPC schedules and the ferry.
const Quests = ((world, water, rain) => {
  function nextAction(start, action, place, lastDay = Infinity) {
    const sites = place ? [place] : [start.place, ...Object.keys(world.places).filter(id => id !== start.place)];
    let first = null;
    for (const site of sites) {
      const visit = structuredClone(start);
      if (site !== start.place) world.travel(visit, site);
      const arrival = visit.day;
      // The longest ordinary NPC route repeats every four days.
      while (visit.day <= Math.min(arrival + 4, lastDay) && (!first || visit.day < first.day)) {
        const order = world.orders(visit).find(o => o.id === action && !o.disabled);
        if (order) {
          first = { place: site, action, name: order.name, day: visit.day, arrival, visit };
          break;
        }
        world.act(visit, "wait");
      }
    }
    return first;
  }

  function waterTask(s) {
    const base = { id: "water", title: water.title };
    const notice = water.notice(s);
    if (s.waterCase.outcome) return { ...base, result: notice.status + "。" + water.endings[s.waterCase.outcome].terms };
    const last = s.waterCase.openedDay + water.term - 1;
    const routes = [];
    if (s.inventory.diagnosis || s.lesson) routes.push([
      ...(!s.inventory.diagnosis ? [["inspectGear"]] : []), ["signWarranty", "village"],
    ]);
    if (s.debt) routes.push([["signFranchise"]]);
    routes.push([
      ...(!s.inventory.measure && !s.inventory.notches ? [["takeMeasure", "village"]] : []),
      ...(!s.inventory.notches ? [["gaugeFlow", "canal"]] : []), ["signCommons", "village"],
    ]);
    const options = [];
    for (const route of routes) {
      let at = s, first = null;
      for (const [action, place] of route) {
        const step = nextAction(at, action, place, last);
        if (!step) { first = null; break; }
        first ??= step;
        at = structuredClone(step.visit);
        world.act(at, action);
      }
      if (first) options.push(first);
    }
    return { ...base, deadline: notice.date, step: options[0], alternatives: options.slice(1),
      note: options.length ? "递案当日定约。" : "按当前凭据和路程已赶不上递案。可歇脚或继续游历，落印后查看裁决。" };
  }

  function list(state) {
    const s = { ...state, battle: null };
    const tasks = [];
    const late = s.deed === "taken";
    if (late || s.deedLate) tasks.push({ id: "land", title: "灭家的田契", result: "第五日交割，买家接管。仍可向学宫申诉或向买家租田。" });
    const land = { id: late || s.deedLate ? "appeal" : "land", title: late || s.deedLate ? "交割后重议田契" : "灭家的田契" };
    if (["owned", "leased"].includes(s.deed)) tasks.push({ ...land, result: world.deeds[s.deed][1] });
    else {
      const inv = s.inventory;
      const step = !inv.witness ? nextAction(s, "witness") : !inv.record ? nextAction(s, "archive", "academy")
        : nextAction(s, "file", "academy") || (inv.herb ? nextAction(s, "sell", "town") : nextAction(s, "gather", "canal"));
      const alternatives = s.broker ? [nextAction(s, "favor")].filter(Boolean) : [];
      tasks.push({ ...land, step, alternatives, deadline: late ? "已交割 · 可补办" : "第 5 日清晨交割",
        note: late ? "学宫申诉需两份凭据和 2 灵石，或与买家订佃约。" : "收条和地册齐全即可当堂对证，问话、查档均不耗日。" });
    }
    if (s.waterCase) tasks.push(waterTask(s));
    const stage = rain.stage(s);
    if (stage) {
      const base = { id: "rain", title: rain.title };
      if (stage === "ferry" || stage === "granary") tasks.push({ ...base, result: rain.notice(s).text });
      else {
        const [action, place] = { ready: ["readRain", "village"], meeting: ["chooseLock", "village"],
          lock: ["rigGate", "canal"], bank: ["signalGate", "village"], seed: ["lashSeeds", "village"], loft: ["drySeeds", "town"] }[stage];
        const step = nextAction(s, action, place);
        if (stage === "meeting" && step) Object.assign(step, { action: "readRain", name: "回祠堂檐下商议" });
        tasks.push({ ...base, step, note: rain.notice(s).text });
      }
    }
    tasks.push({ id: "bank", title: "帮灭建国修田埂",
      ...(s.inventory.shoes ? { result: "田埂修好了，踩泥草鞋已收入背包，可穿在鞋子位。" }
        : { step: nextAction(s, "mendBank", "village"), note: "修田埂耗 1 日，报酬是身法 +120 的踩泥草鞋。" }) });
    tasks.push({ id: "sluice", title: "重开废渠",
      ...(s.cleared.sluice ? { result: "功德水表已停摆，获得手持法器分水令。" }
        : { step: nextAction(s, "fight", "canal"), note: "打赢功德水表可得分水令。交手不耗郡历。" }) });
    return tasks;
  }
  function tracked(tasks, id) {
    const active = tasks.filter(t => !t.result);
    return active.find(t => t.id === id) || active.find(t => t.id === "land")
      || active.find(t => t.id === "water") || active.find(t => t.id === "rain") || active[0];
  }
  function describe(step, s) {
    if (!step) return "";
    const when = step.day === s.day ? "今日" : "第 " + step.day + " 日";
    const wait = step.day - step.arrival;
    return when + " · " + world.places[step.place].name + " · " + step.name
      + (wait ? "（" + (step.place === s.place ? "原地" : "抵达后") + "等 " + wait + " 日）" : "");
  }
  return { list, tracked, describe };
})(typeof module !== "undefined" && module.exports ? require("./world.js") : World,
   typeof module !== "undefined" && module.exports ? require("./water-case.js") : WaterCase,
   typeof module !== "undefined" && module.exports ? require("./first-rain.js") : FirstRain);
if (typeof module !== "undefined" && module.exports) module.exports = Quests;
