"use strict";

const Encounters = (() => {
  const foes = {
    thor: {
      title: "雷神托尔", place: "废渠试锤台", caseTitle: "雷神来验闸",
      intro: "托尔要验闸门能不能扛雷。灭霸指指空地：「冲我来，修闸的钱刚算清。」",
      armor: 8, challenge: "陪雷神验闸", hit: "抢步出拳", victory: "闸门通过防雷验收",
      moves: [
        { title: "蓄雷重锤", damage: 3, charged: true, hint: "重锤落下扣 3 体力。可打断，或架盖接锤。蓄雷被打断后，托尔会改用横锤。" },
        { title: "扶正验收牌", damage: 0, hint: "托尔低头寻找被震飞的印泥，本回合不会攻击。" },
        { title: "拔锤出泥", damage: 0, exposed: true, hint: "锤头陷在渠泥里，普通攻击多打掉 1 点架势。" },
      ],
    },
    furnace: {
      title: "考勤丹炉", place: "炼丹房", caseTitle: "你的筑基申请被丹炉驳回了",
      intro: "丹炉把灭霸的请假单烤成了灰，随即判定他没有请过假。", armor: 6,
      challenge: "进炼丹房应考", hit: "拍炉盖", victory: "丹炉散架了", prize: "裂纹炉盖",
      moves: [
        { title: "喷扣分符", damage: 3, hint: "命中扣 3 点体力。响指能打断喷符。" },
        { title: "复核考勤", damage: 0, hint: "它在十七页名册里找你的姓。本回合可以放心出手。" },
        { title: "开盖散热", damage: 0, exposed: true, hint: "外壳松动，普通攻击多打掉 1 层。" },
      ],
    },
    sluice: {
      title: "功德水表", place: "废渠闸口", caseTitle: "功德水表只收现钱",
      intro: "水表说河水免费，流动另计。身后的稻田已经裂了三寸。", armor: 7,
      challenge: "找功德水表算账", hit: "掀算盘", victory: "闸门开了", prize: "分水令",
      moves: [
        { title: "拨珠算账", damage: 0, exposed: true, hint: "它腾出两只手数珠子，普通攻击多打掉 1 层。" },
        { title: "催缴水费", damage: 3, hint: "欠费铜钱飞过来，命中扣 3 点体力。响指可打断。" },
        { title: "抄表歇脚", damage: 0, hint: "它用算盘给自己算工钱，这回合不会动手。" },
      ],
    },
  };
  const sweep = { title: "贴地横锤", damage: 2, physical: true, hint: "托尔收起雷光，横锤扣 2 体力。这招无法打断，也不触发架盖反震。" };
  function start(id, world) {
    const maxHealth = world.trained ? 7 : 5;
    const maxSpirit = world.trained ? 3 : 2;
    return { id, round: 1, health: maxHealth, maxHealth, spirit: maxSpirit, maxSpirit,
      armor: foes[id].armor, shield: world.equipped === "lid", outcome: null,
      snapReadyAt: 1, counterReady: false, sweepNext: false,
      effect: "", turns: [{ round: 0, text: foes[id].intro }] };
  }
  function intent(battle) {
    if (battle.id === "thor" && battle.sweepNext) return sweep;
    const moves = foes[battle.id].moves;
    return moves[(battle.round - 1) % moves.length];
  }
  function commands(battle, world) {
    if (battle.outcome) return [];
    const move = intent(battle);
    const cooldown = Math.max(0, (battle.snapReadyAt ?? 1) - battle.round);
    const target = battle.id === "thor" ? "架势" : "外壳";
    const canInterrupt = move.damage && !move.physical;
    const options = [
      { id: "hit", name: foes[battle.id].hit, desc: `打掉 ${(world.trained ? 2 : 1) + Number(!!move.exposed)} 点${target}。` },
      { id: "snap", name: "打响指", desc: cooldown ? `冷却中，还需 ${cooldown} 回合。` : `免费，随后冷却两回合。${canInterrupt ? "可打断这招。" : "本回合无招可打断。"}`, disabled: cooldown > 0 },
    ];
    if (world.equipped === "seal") options.push({ id: "tide", name: "引水诀", desc: `耗 1 灵力，打掉 2 点${target}。${canInterrupt ? "同时打断这招。" : "本回合仅造成伤害。"}`, disabled: battle.spirit < 1 });
    if (world.equipped === "lid") {
      options.push({ id: "brace", name: "架盖", desc: "挡住本回合 3 点及以上的重击，下回合可反震。" });
      if (battle.counterReady) options.push({ id: "counter", name: "反震", desc: `仅本回合可用，打掉 3 点${target}。` });
    }
    return options;
  }
  function turn(battle, world, id) {
    if (!commands(battle, world).some(option => option.id === id && !option.disabled)) return false;
    const move = intent(battle);
    const foe = foes[battle.id];
    const lines = [];
    const interrupted = (id === "snap" || id === "tide") && move.damage > 0 && !move.physical;
    const blocked = id === "brace" && move.damage >= 3;
    battle.sweepNext = !!(interrupted && move.charged);
    battle.counterReady = blocked;
    if (id === "tide") battle.spirit--;
    if (id === "snap") {
      battle.snapReadyAt = battle.round + 3;
      lines.push(interrupted ? "灭霸打了个响指，来招当场卡住。" : "灭霸打了个响指。山谷很配合，回了个声。");
    } else if (id === "brace") {
      lines.push(blocked ? "炉盖接住重击，盖沿嗡嗡作响。下一回合可使出反震。" : "灭霸架起炉盖，本回合没有重击可接。");
    } else {
      const force = id === "counter" ? 3 : id === "tide" ? 2 : (world.trained ? 2 : 1) + Number(!!move.exposed);
      const damage = Math.min(battle.armor, force);
      battle.armor -= damage;
      const skill = { tide: "引水诀", counter: "反震", hit: foe.hit }[id];
      lines.push(`灭霸使出${skill}，打掉 ${damage} 点${battle.id === "thor" ? "架势" : "外壳"}。`);
    }
    battle.effect = move.exposed ? "cool" : "review";
    if (battle.armor === 0) {
      battle.outcome = "victory";
      battle.effect = "victory";
      lines.push(foe.prize ? `${foe.victory}，获得${foe.prize}。` : "托尔在验收单上盖了个锤印。「下次验章能不能扛锤。」");
    } else if (move.damage && !interrupted && !blocked) {
      const damage = Math.min(battle.health, Math.max(0, move.damage - (battle.shield ? 2 : 0)));
      if (battle.shield) lines.push("裂纹炉盖挡下 2 点伤害。");
      battle.shield = false;
      battle.health -= damage;
      battle.effect = "penalty";
      lines.push(`${foe.title}使出${move.title}，扣去 ${damage} 点体力。`);
      if (!battle.health) battle.outcome = "defeat";
    } else if (interrupted) {
      battle.effect = "interrupt";
      lines.push(`${move.title}没能出手。`);
      if (battle.sweepNext) lines.push("托尔把锤柄压低，准备改用横锤。");
    } else if (!blocked) {
      lines.push(`${foe.title}忙着${move.title}。`);
    }
    battle.turns.unshift({ round: battle.round, text: lines.join("") });
    battle.turns.length = Math.min(12, battle.turns.length);
    if (!battle.outcome) battle.round++;
    return true;
  }
  return { foes, start, intent, commands, turn };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Encounters;
