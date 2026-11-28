"use strict";

const Encounters = (() => {
  const foes = {
    thor: {
      title: "雷神托尔", place: "废渠试锤台", caseTitle: "废渠试锤台",
      intro: "托尔把验收牌翻到背面：「切磋记这里。上回把胜负盖在了报销栏。」",
      armor: 16_000, attack: 3200, defense: 1000, speed: 300, challenge: "陪雷神验闸", hit: "抢步出拳", victory: "托尔收锤认输",
      // A saved encounter from before the duel update finishes its original sequence.
      moves: [
        { title: "蓄雷重锤", power: 4000, charged: true, heavy: true, hint: "可打断，或架盖接锤。" },
        { title: "扶正验收牌", hint: "托尔低头寻找被震飞的印泥，本回合不会攻击。" },
        { title: "拔锤出泥", exposed: true, hint: "锤头陷在渠泥里，普通攻击可趁虚而入。" },
      ],
    },
    furnace: {
      title: "考勤丹炉", place: "炼丹房", caseTitle: "你的筑基申请被丹炉驳回了",
      intro: "丹炉把灭霸的请假单烤成了灰，随即判定他没有请过假。", armor: 12_000, attack: 3600, defense: 1000,
      challenge: "进炼丹房应考", hit: "拍炉盖", victory: "丹炉散架了", prize: "裂纹炉盖",
      moves: [
        { title: "喷扣分符", power: 3600, heavy: true, hint: "响指能打断喷符。" },
        { title: "复核考勤", hint: "它在十七页名册里找你的姓。本回合可以放心出手。" },
        { title: "开盖散热", exposed: true, hint: "炉壳松动，普通攻击可趁虚而入。" },
      ],
    },
    sluice: {
      title: "功德水表", place: "废渠闸口", caseTitle: "功德水表只收现钱",
      intro: "水表说河水免费，流动另计。身后的稻田已经裂了三寸。", armor: 14_000, attack: 3000, defense: 1000,
      challenge: "找功德水表算账", hit: "掀算盘", victory: "闸门开了", prize: "分水令",
      moves: [
        { title: "拨珠算账", exposed: true, hint: "它腾出两只手数珠子，普通攻击可趁虚而入。" },
        { title: "催缴水费", power: 4200, heavy: true, hint: "欠费铜钱飞过来，响指可打断。" },
        { title: "抄表歇脚", hint: "它用算盘给自己算工钱，这回合不会动手。" },
      ],
    },
  };
  const sweep = { title: "贴地横锤", power: 2000, physical: true, priority: 0, hint: "锤柄横扫。响指和架盖都拦不住。" };
  const snap = { name: "打响指", cooldown: 2 };
  const tide = { name: "引水诀", cost: 1 };
  const brace = { name: "架盖", desc: "架住重击，接住后的下一回合可以反震。" };
  const counter = { name: "反震" };
  const stance = { name: "沉肩还手", desc: "架住近身锤招，按自身术法威力减伤，并回敬一次普攻。" };
  const pill = { name: "回气丸", recovery: 1 };
  const slots = { head: "头部", body: "身体", legs: "裤子", feet: "鞋子", accessory: "配饰", weapon: "武器" };
  const gear = {
    cap: { slot: "head", stats: { defense: 200 } },
    tallyBand: { slot: "head", stats: { defense: 100, maxHealth: 900 } },
    jacket: { slot: "body", stats: { defense: 600 } },
    trousers: { slot: "legs", stats: { maxHealth: 1200 } },
    shoes: { slot: "feet", stats: { speed: 120 } },
    buckle: { slot: "accessory", stats: { attack: 700 } },
    reedBell: { slot: "accessory", stats: { maxHealth: 700, speed: 60 } },
    lid: { slot: "weapon", stats: {} },
    seal: { slot: "weapon", stats: {} },
  };
  function loadout(legacyItem = null) {
    const result = Object.fromEntries(Object.keys(slots).map(slot => [slot, null]));
    if (legacyItem) result[gear[legacyItem].slot] = legacyItem;
    return result;
  }
  const duelMoves = {
    jab: { title: "短柄试探", power: 0, physical: true, priority: 0 },
    sweep,
    gather: { title: "举锤聚雷", priority: 0 },
    slam: { title: "蓄雷重锤", power: 4000, charged: true, heavy: true, priority: -1 },
    recover: { title: "收锤换气", exposed: true, priority: 0 },
  };
  const priorities = { hit: 0, snap: 1, tide: 0, brace: 2, counter: 0, stance: 2, pill: 0 };

  // Commit a move before the player chooses. Reloading also restores the random stream.
  function roll(plan) {
    plan.seed = (Math.imul(plan.seed, 1664525) + 1013904223) >>> 0;
    return plan.seed / 0x100000000;
  }
  function planNext(plan, interrupted) {
    switch (plan.move) {
      case "gather": return "slam";
      case "slam":
        if (interrupted && roll(plan) < .7) return "sweep";
        return roll(plan) < .6 ? "recover" : "jab";
      case "sweep":
      case "jab": return roll(plan) < .6 ? "gather" : "recover";
      default: return roll(plan) < .65 ? "gather" : "jab";
    }
  }
  function validPlan(battle) {
    if (battle.duel === undefined) return true;
    const plan = battle.duel;
    return battle.id === "thor" && !!plan && Object.hasOwn(duelMoves, plan.move)
      && Number.isInteger(plan.seed) && plan.seed >= 0 && plan.seed <= 0xffffffff;
  }
  const realms = {
    early: { maxHealth: 10_000, maxSpirit: 2, attack: 3000, defense: 1200, speed: 200, technique: 2000 },
    middle: { maxHealth: 24_000, maxSpirit: 3, attack: 6000, defense: 2400, speed: 400, technique: 4000 },
    late: { maxHealth: 32_000, maxSpirit: 4, attack: 7800, defense: 3000, speed: 480, technique: 5000 },
  };
  function realmId(world) {
    return world.realm ?? (world.trained ? "middle" : "early");
  }
  function attributes(world, equipped = world.equipped) {
    const base = realms[realmId(world)];
    const stats = { ...base };
    // A single item previews replacing its own slot; the other five stay in effect.
    const current = typeof world.equipped === "object" ? world.equipped : {};
    const worn = typeof equipped === "string" ? { ...current, [gear[equipped].slot]: equipped } : equipped;
    for (const item of Object.values(worn || {})) {
      if (item) for (const [stat, bonus] of Object.entries(gear[item].stats)) stats[stat] += bonus;
    }
    return stats;
  }
  function damage(attack, power, defense) {
    return Math.max(Math.ceil(attack * .05), attack + power - defense);
  }
  function shieldReduction(maxHealth) { return Math.floor(maxHealth * .4); }
  function artifactEffects(id, world) {
    const { technique, maxHealth } = attributes(world);
    if (id === "seal") return [
      { name: tide.name, desc: `耗 ${tide.cost} 灵力，附加一倍术法威力（+${technique}），可打断符咒或落雷。` },
    ];
    if (id === "lid") return [
      brace,
      { name: counter.name, desc: `附加两倍术法威力（+${technique * 2}），接住重击后的下一回合可用。` },
      { name: "首次减伤", desc: `每场首次受击最多抵消体力上限的四成（${shieldReduction(maxHealth)} 点）。` },
    ];
    return [];
  }
  function start(id, world) {
    const { maxHealth, maxSpirit } = attributes(world);
    const battle = { id, round: 1, health: maxHealth, maxHealth, spirit: maxSpirit, maxSpirit,
      armor: foes[id].armor, shield: world.equipped.weapon === "lid", outcome: null,
      snapReadyAt: 1, counterReady: false, sweepNext: false,
      effect: "", turns: [{ round: 0, text: foes[id].intro }] };
    if (id === "thor") {
      battle.duel = { seed: Math.floor(Math.random() * 0x100000000), move: "gather" };
      if (roll(battle.duel) < .35) battle.duel.move = "jab";
    }
    return battle;
  }
  function intent(battle) {
    if (battle.duel) return duelMoves[battle.duel.move];
    if (battle.id === "thor" && battle.sweepNext) return sweep;
    const moves = foes[battle.id].moves;
    return moves[(battle.round - 1) % moves.length];
  }
  function forecast(battle, world) {
    const move = intent(battle);
    if (!battle.duel) {
      const warning = move.power !== undefined;
      const amount = warning ? damage(foes[battle.id].attack, move.power, attributes(world).defense) : 0;
      return { label: "敌方预告", title: move.title, hint: (warning ? `命中伤害 ${amount}。` : "") + move.hint, warning };
    }
    if (move.charged) return { label: "蓄力已成", title: "雷光沿锤柄落下", hint: "托尔上回合已举锤聚雷。落锤优先度 −1，此时可以抢攻、打断或接锤。", warning: true, charging: true };
    return { label: "单打选招", title: "托尔已定招", hint: "先比招式优先度，同档由身法高的一方先动。", warning: false };
  }
  function commands(battle, world) {
    if (battle.outcome) return [];
    const move = intent(battle), foe = foes[battle.id], hero = attributes(world);
    const cooldown = Math.max(0, (battle.snapReadyAt ?? 1) - battle.round);
    const target = battle.id === "thor" ? "架势" : "外壳";
    const hit = damage(hero.attack, 0, foe.defense);
    const hitDesc = battle.duel ? `基础伤害 ${hit}。托尔换气时额外 +${hero.technique}。`
      : `打掉 ${hit + (move.exposed ? hero.technique : 0)} 点${target}。`;
    const options = [
      { id: "hit", name: foe.hit, desc: hitDesc },
      { id: "snap", name: snap.name, desc: cooldown ? `冷却中，还需 ${cooldown} 回合。` : `可打断符咒或落雷。免费，随后冷却 ${snap.cooldown} 回合。`, disabled: cooldown > 0 },
    ];
    if (battle.duel && world.equipped.weapon !== "lid") options.push({ id: "stance", ...stance });
    if (world.equipped.weapon === "seal") options.push({ id: "tide", name: tide.name, desc: `耗 ${tide.cost} 灵力，伤害 ${damage(hero.attack, hero.technique, foe.defense)}。可打断符咒或落雷。`, disabled: battle.spirit < tide.cost });
    if (world.equipped.weapon === "lid") {
      options.push({ id: "brace", ...brace });
      if (battle.counterReady) options.push({ id: "counter", name: counter.name, desc: `仅本回合可用，伤害 ${damage(hero.attack, 2 * hero.technique, foe.defense)}。` });
    }
    if (world.inventory?.pill > 0) options.push({
      id: "pill", name: `服${pill.name}`,
      desc: battle.spirit === battle.maxSpirit ? `灵力已满。剩余 ${world.inventory.pill} 枚。`
        : `恢复 ${pill.recovery} 点灵力，占用本回合。剩余 ${world.inventory.pill} 枚。`,
      disabled: battle.spirit >= battle.maxSpirit,
    });
    if (battle.duel) for (const option of options) option.priority = priorities[option.id];
    return options;
  }

  function initiative(plan, playerPriority, foePriority, hero, foe) {
    if (playerPriority !== foePriority) return { playerFirst: playerPriority > foePriority, reason: "招式优先度较高" };
    if (hero.speed !== foe.speed) return { playerFirst: hero.speed > foe.speed, reason: "同优先度下身法较高" };
    return { playerFirst: roll(plan) < .5, reason: "同速争先" };
  }
  function turn(battle, world, id, motions) {
    const command = commands(battle, world).find(option => option.id === id && !option.disabled);
    if (!command) return false;
    const move = intent(battle), foe = foes[battle.id], hero = attributes(world);
    const order = battle.duel ? initiative(battle.duel, command.priority, move.priority, hero, foe) : { playerFirst: true };
    const interrupted = order.playerFirst && (id === "snap" || id === "tide") && move.power !== undefined && !move.physical;
    const blocked = order.playerFirst && id === "brace" && move.heavy;
    const parried = order.playerFirst && id === "stance" && move.physical;
    const lines = [];
    if (battle.duel) lines.push(`${order.playerFirst ? "灭霸" : foe.title}先手（${order.reason}）。`);
    battle.counterReady = false;
    battle.sweepNext = !battle.duel && interrupted && !!move.charged;
    battle.effect = move.exposed ? "cool" : "review";

    function show(side, cue, text, impact) {
      lines.push(text);
      motions?.push({ side, cue, text, impact });
    }
    function strike(name, power, opening = 0, cue = id) {
      const amount = Math.min(battle.armor, damage(hero.attack, power, foe.defense) + opening);
      battle.armor -= amount;
      const text = `灭霸使出${name}，${opening ? "抓到破绽，" : ""}打掉 ${amount} 点${battle.id === "thor" ? "架势" : "外壳"}。`;
      show("hero", cue, text, { stat: "armor", value: battle.armor, amount });
    }
    function playerAction() {
      switch (id) {
        case "hit": strike(command.name, 0, move.exposed ? hero.technique : 0); break;
        case "counter": strike(counter.name, 2 * hero.technique); break;
        case "tide": battle.spirit -= tide.cost; strike(tide.name, hero.technique); break;
        case "pill":
          world.inventory.pill--;
          battle.spirit += pill.recovery;
          show("hero", "pill", `灭霸服下${pill.name}，灵力 +${pill.recovery}。`);
          break;
        case "brace": show("hero", "guard", "灭霸架起炉盖。"); break;
        case "stance": show("hero", "guard", "灭霸沉肩，等锤柄靠近。"); break;
        case "snap":
          battle.snapReadyAt = battle.round + snap.cooldown + 1;
          show("hero", "snap", interrupted ? "灭霸打了个响指，来招当场卡住。" : "灭霸打了个响指，山谷回了一声。");
          break;
      }
    }
    function foeAction() {
      if (interrupted) {
        battle.effect = "interrupt";
        show("foe", "interrupted", `${move.title}被打断。`);
      } else if (blocked) {
        battle.counterReady = true;
        show("foe", "blocked", `${move.title}撞上炉盖。下一回合可反震。`);
      } else if (move.power !== undefined) {
        const incoming = damage(foe.attack, move.power, hero.defense);
        const guard = parried ? hero.technique : 0;
        const absorbed = battle.shield ? Math.min(shieldReduction(battle.maxHealth), incoming) : 0;
        const shieldText = battle.shield ? `裂纹炉盖挡下 ${absorbed} 点伤害。` : "";
        battle.shield = false;
        const amount = Math.min(battle.health, Math.max(0, incoming - guard - absorbed));
        battle.health -= amount;
        if (amount) battle.effect = "penalty";
        const resisted = Math.max(0, foe.attack + move.power - incoming);
        const text = `${shieldText}${foe.title}使出${move.title}，防御抵去 ${resisted} 点${parried ? `，沉肩再挡 ${Math.min(guard, incoming)} 点` : ""}，体力 −${amount}。`;
        show("foe", move.charged ? "thunder" : "attack", text, { stat: "health", value: battle.health, amount });
        if (parried && battle.health) strike("沉肩还手", 0, 0, "counter");
      } else if (battle.duel?.move === "gather") {
        show("foe", "charge", "托尔举锤聚雷，锤头亮了起来。下回合落锤。");
      } else show("foe", move.exposed ? "cool" : "review", `${foe.title}忙着${move.title}。`);
    }
    if (order.playerFirst) {
      playerAction();
      if (battle.armor) foeAction();
    } else {
      foeAction();
      if (battle.health) playerAction();
    }
    if (battle.armor === 0) {
      battle.outcome = "victory";
      battle.effect = "victory";
      lines.push(foe.prize ? `${foe.victory}，获得${foe.prize}。` : foe.victory + "。");
    } else if (!battle.health) battle.outcome = "defeat";
    battle.turns.unshift({ round: battle.round, text: lines.join("") });
    battle.turns.length = Math.min(12, battle.turns.length);
    if (!battle.outcome) {
      battle.round++;
      if (battle.duel) battle.duel.move = planNext(battle.duel, interrupted);
    }
    return true;
  }
  return { foes, snap, stance, slots, gear, loadout, pill, realmId, attributes, artifactEffects, validPlan, start, intent, forecast, commands, turn };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Encounters;
