"use strict";

// Classic scripts also work when the player opens index.html directly from disk.
const World = ((combat, water) => {
  const places = {
    village: { name: "灭家村", x: 22, y: 72, tag: "灵田 · 渡口", desc: "灭建国种了三十年的田。村口石碑新刷了一层白漆，把田主那一栏也刷白了。" },
    town: { name: "青瓦镇", x: 27, y: 36, tag: "集市 · 茶棚", desc: "桥头卖药，桥尾卖药方。火箭在中间支了张桌子，专收两头的介绍费。" },
    academy: { name: "学宫", x: 78, y: 29, encounter: "furnace", tag: "旧档 · 炼丹房", desc: "仙盟的地册堆在西厢。东厢的丹炉刚学会点名，已经给看火的童子记了三次旷课。" },
    canal: { name: "废渠", x: 74, y: 75, encounter: "sluice", tag: "草药 · 水闸", desc: "废渠边还长着引气草。上游立了一只会拨算盘的功德水表，拦住了下田的水。" },
  };
  const people = {
    elder: { name: "灭建国", job: "种田人", route: ["village", "village", "town", "village"] },
    rocket: { name: "火箭浣熊", job: "掮客", route: ["canal", "town", "town", "village"] },
    stark: { name: "钢铁侠", job: "学宫匠师", route: ["academy", "canal", "academy", "town"] },
  };
  const items = {
    ...water.items,
    witness: ["水脚收条", "灭建国留着的旧收条，背面有当年的田号。"],
    record: ["地册拓片", "学宫旧档里的底册。和水脚收条一对，田主便有名有姓。"],
    herb: ["引气草", "突破需 1 株。在青瓦镇可换 2 灵石，也能用来还火箭的人情。"],
    seal: ["分水令", "引水诀耗 1 灵力，攻击并打断符咒或蓄雷。托尔的贴地横锤仍会落下。"],
    lid: ["裂纹炉盖", "每场首次受击最多抵消体力上限的四成。可主动架盖挡重击，下一回合反震。"],
  };
  const deeds = {
    pending: ["待交割", "仙盟把灭建国的灵田登记成了无主地，第五天由买家接手。"],
    owned: ["田契归还", "学宫撤销了无主登记。地头重新插上灭家的木牌，稻谷收成归灭家。"],
    leased: ["分成留耕", "灭家保住耕作权。买家照约分走一枚灵石，余下收成归灭家。"],
    taken: ["买家接管", "管事在田头支起收租摊。可以在村里签佃约，也能带两份凭证到学宫申诉。"],
  };
  const boundary = 5;
  const breakthrough = { xp: 4, herbs: 1 };
  function fresh() {
    return { version: 3, day: 1, place: "village", deed: "pending", stones: 3, xp: 0, waterCase: null,
      trained: false, equipped: null, debt: false, introduced: false, lesson: false,
      broker: false, inventory: {}, cleared: { furnace: false, sluice: false }, battle: null,
      journal: [{ day: 1, text: "灭霸回村那天，告示上写着「无主灵田一亩」。灭建国正蹲在那亩田里拔草。" }] };
  }
  function log(s, text, kind) {
    const entry = { day: s.day, text };
    if (kind) entry.kind = kind;
    s.journal.unshift(entry);
    if (s.journal.length > 60) s.journal.pop();
  }
  function armorScale(s) {
    if (s.version === 3) return 1;
    return [5, 7].includes(s.battle.maxHealth) ? 2000 : 100;
  }
  function upgradeSave(s) {
    if (s.version === 3) return s;
    const b = s.battle;
    if (b) {
      const fullHealth = combat.attributes(s).maxHealth;
      b.armor *= armorScale(s);
      b.health = Math.round(b.health * fullHealth / b.maxHealth);
      b.maxHealth = fullHealth;
    }
    if (s.version === 1) {
      s.waterCase = null;
      if (s.cleared.sluice) {
        water.start(s);
        log(s, "学宫今日才收到水表停摆的报修单。明日到灭家村田头开听，旧账从今天起公示。");
      }
    }
    s.version = 3;
    return s;
  }
  function passDay(s) {
    s.day++;
    if (s.day >= boundary && s.deed === "pending") {
      s.deed = "taken";
      log(s, "第五天交割。买家接管灵田，新管事把灭家的锄头也登记成了租具。");
    }
    water.nextDay(s, log);
  }
  function locationOf(id, day, s) {
    const assignment = water.location(s?.waterCase, id, day);
    if (assignment) return assignment;
    const route = people[id].route;
    return route[(day - 1) % route.length];
  }
  function describe(s, place) {
    const ruling = s.waterCase?.outcome;
    if (place === "village") {
      const field = s.deed === "pending" ? places.village.desc : deeds[s.deed][1];
      if (ruling) return field + water.endings[ruling].terms;
      return field + (s.cleared.sluice ? "新开的渠水正往田里流。" : "");
    }
    if (place === "canal" && ruling) {
      const scene = { commons: "三户轮灌的木牌旁支起了公用药圃。", franchise: "火箭在闸口盖了票亭，灭家的免票钉在窗口。", warranty: "钢铁侠留下一截铜管，沿渠采药时可以跟着水声行气。", metered: "闸边摆起了火箭的售票凳。牌上写着「按茬收费，鸭子随行」。" };
      return scene[ruling] + "闸水仍流向村田。";
    }
    if (place === "canal" && s.cleared.sluice) return "闸门下的水重新流进灭家村。那块「按滴收费」的牌子，已经被人拿去架柴了。";
    if (place === "academy" && s.cleared.furnace) return "西厢照常收状子。东厢的丹炉空着炉口，旁边贴了张「今日免点名」。";
    return places[place].desc;
  }
  function realm(s) { return s.trained ? "炼气中期" : "炼气初期"; }
  function gain(s, id, count = 1) { s.inventory[id] = (s.inventory[id] || 0) + count; }
  function relation(s, id) {
    if (id === "elder") return s.deed === "owned" ? "愿替你引荐" : s.deed === "leased" ? "与你合耕" : "同乡";
    if (id === "rocket" && s.waterCase?.outcome === "franchise") return "包闸合约的保人";
    if (id === "rocket") return s.debt ? "欠他一份人情" : s.broker ? "生意相识" : "尚无往来";
    return s.lesson ? "有授业之谊" : s.introduced ? "持引荐可请教" : "点头之交";
  }
  function openDeed(s) { return s.deed === "pending" || s.deed === "taken"; }

  function elderOrders(s, add) {
    if (!s.inventory.witness) add("witness", "找灭建国问田契", "他把三十年的收条都压在饭桌腿下。", () => {
      gain(s, "witness"); log(s, "灭建国拔出桌腿下的水脚收条。「桌子晃了三十年，总算晃对了。」带它去学宫查旧档。");
    });
    else if (s.deed === "owned" && !s.introduced) add("introduce", "请灭建国引荐", "听说他有个会炼铁的老同学。", () => {
      s.introduced = true; log(s, "灭建国给钢铁侠写了张字条。「欠我的那顿饭，就折成教孩子两招吧。」");
    });
    else add("talkElder", "和灭建国聊聊", "打听灵田和沿渠的收成。", () => log(s,
      s.waterCase?.outcome === "metered" ? "灭建国翻翻账本。「这季多收的那枚灵石，刚好够给火箭买票。他还问我要不要办年卡。」" :
      s.cleared.sluice ? "灭建国挽起裤腿。「水回来了，等秧苗站稳，该请你吃新米。」" : "灭建国指指干裂的田。「地契管地，水表管水。这两位神仙互相不认。」"));
  }
  function rocketOrders(s, add) {
    const unsettled = openDeed(s);
    if (!s.broker) add("broker", unsettled ? "找火箭牵线" : "和火箭打个照面", unsettled ? "问问买家肯不肯留灭家耕田。" : "打听集市上的行情。", () => {
      s.broker = true; log(s, !unsettled ? "火箭收起账本。「听说田里有了着落。引气草拿来镇上卖，一株值两枚灵石。」" : "火箭搬出两把椅子。「买家要收益，你们要下田。这事能谈。灵石、人情，我这儿都收。」");
    });
    if (s.broker && unsettled) {
      const fee = s.deed === "taken" ? 5 : 3;
      add("pay", "出灵石订佃约", `付 ${fee} 灵石，灭家留耕，买家分成。`, () => {
        s.stones -= fee; s.deed = "leased"; log(s, "火箭咬了一口灵石，点头。灭家拿回耕作权，每次收成分买家一枚灵石。");
      }, s.stones < fee);
      add("favor", "拿人情换佃约", "火箭垫钱，日后还他一株引气草。", () => {
        s.deed = "leased"; s.debt = true; log(s, "火箭在字据上按了个爪印。灭家可以继续种田，灭霸欠他一株引气草。");
      });
    }
    if (s.debt) add("repay", "还火箭的人情", "交给火箭 1 株引气草。", () => {
      gain(s, "herb", -1); s.debt = false; log(s, "火箭收起引气草，把欠条折成纸船放进河里。「下回见面就算老客户。」");
    }, !s.inventory.herb);
    if (s.broker && !unsettled && !s.debt) add("talkRocket", "和火箭叙旧", "打听本地的收成和物价。", () => log(s,
      s.waterCase?.outcome === "metered" ? "火箭弹弹票根。「多收的那一枚，是水闸挣的。水闸正好归我。」" :
      s.waterCase?.outcome === "franchise" ? "火箭亮出两张免票。「我们说好的是灭家免。你可别领全村来认亲。」" :
      s.cleared.sluice ? "火箭摊开账本。「水费没了，灭家收一茬谷子能多落一枚灵石。我就不收咨询费了。」" : "火箭压低声音。「废渠的水表比我还黑。你让它消停，灭家的田就能多收一份。」"));
  }
  function starkOrders(s, add) {
    if (s.introduced && !s.lesson) add("lesson", "请钢铁侠指点", "用灭建国的引荐换一次行气指点。", () => {
      s.lesson = true; s.xp += 2; log(s, "钢铁侠把护腕借你半刻，震得你连打三个嗝。经脉倒真通了，修为增加 2。");
    });
    else add("talkStark", "和钢铁侠聊聊", "问问匠师这阵子都在修什么。", () => log(s,
      s.cleared.furnace ? "钢铁侠听说炉盖掉了，立刻在修理单上勾了「可拆洗」。" : "钢铁侠翻着工单。「废渠水表归学宫，学宫丹炉归后勤，后勤归正在维修的水表。」"));
  }
  function academyOrders(s, add) {
    if (!s.inventory.record) add("archive", "翻查学宫旧档", "在西厢取一张底册拓片。", () => {
      gain(s, "record"); log(s, "你拓下底册。新册抄漏了一个「灭」字，难怪灭家田成了无主田。带齐收条就能递状。");
    });
    if (openDeed(s)) {
      const fee = s.deed === "taken" ? 2 : 0;
      add("file", fee ? "递交田契申诉" : "当堂对证", `需水脚收条和地册拓片${fee ? "，交割后另收 2 灵石" : "，当日办结"}。`, () => {
        s.stones -= fee; s.deed = "owned"; log(s, "两份田号对上了。学宫撤销登记，灭建国重获田契。再见到他，可以请他引荐故交。");
      }, !s.inventory.witness || !s.inventory.record || s.stones < fee);
    }
  }
  function villageOrders(s, add) {
    if (s.deed === "taken") add("rent", "与管事签佃约", "付 4 灵石重新租田，每次收成分买家一枚。", () => {
      s.stones -= 4; s.deed = "leased"; log(s, "管事收下租金，把地头的木牌翻到背面。灭家重新下田，收成按佃约分账。");
    }, s.stones < 4);
    if (!openDeed(s)) {
      const waterFee = s.waterCase?.outcome === "metered" ? 1 : 0;
      const yieldStones = 3 + Number(s.cleared.sluice) - Number(s.deed === "leased") - waterFee;
      const feeText = waterFee ? "含水票扣款 1 灵石。" : "";
      add("harvest", "下田收灵谷", `净得 ${yieldStones} 灵石，耗时 1 日。${feeText}`, () => {
        s.stones += yieldStones; passDay(s); log(s, `收了一茬灵谷。${feeText}扣清分账，灭家净得 ${yieldStones} 灵石。`);
      });
    }
  }
  function canalOrders(s, add) {
    const herbs = s.waterCase?.outcome === "commons" ? 2 : 1;
    add("gather", "沿渠采引气草", `得 ${herbs} 株，耗时 1 日。可出售或用于突破。`, () => {
      gain(s, "herb", herbs); passDay(s); log(s, herbs === 2 ? "轮灌腾出了渠边的药圃。你采到两株引气草，把带籽的那株留给了下家。" : "在闸石底下采到一株引气草。它逆着风弯腰，倒是很好认。");
    });
    if (s.waterCase?.outcome === "warranty") add("flowPractice", "沿铜管引流吐纳", "耗时 1 日，得 2 修为和 1 株引气草。", () => {
      s.xp += 2; gain(s, "herb"); passDay(s); log(s, "按铜管的水音调息一周天，修为增加 2。起身时顺手摘了一株引气草。");
    });
  }
  function townOrders(s, add) {
    add("sell", "在药摊卖草", "每株换 2 灵石，当场结清。", () => {
      gain(s, "herb", -1); s.stones += 2; log(s, "草药铺付了 2 灵石，顺手给引气草改名「上品聚灵芽」。");
    }, !s.inventory.herb);
  }
  function dailyOrders(s, add) {
    if (!s.trained) {
      add("train", "就地修炼", "耗时 1 日，修为增加 2。", () => {
        s.xp += 2; passDay(s); log(s, `吐纳一周天，修为增加 2。现有 ${s.xp} 点修为。`);
      });
      if (s.xp >= breakthrough.xp) add("advance", "冲击炼气中期", `需 ${breakthrough.xp} 修为、${breakthrough.herbs} 株引气草。体力、灵力、攻击、防御和身法提升。`, () => {
        s.xp -= breakthrough.xp; gain(s, "herb", -breakthrough.herbs); s.trained = true;
        const { maxHealth, maxSpirit } = combat.attributes(s);
        log(s, `灭霸迈入炼气中期。战斗体力升至 ${maxHealth}、灵力升至 ${maxSpirit}，普通攻击也更重了。`);
      }, (s.inventory.herb || 0) < breakthrough.herbs);
    }
    add("wait", "歇脚一日", "时过一日，看看明日谁会路过。", () => { passDay(s); log(s, `在${places[s.place].name}歇过一夜。`); });
  }

  const conversations = { elder: elderOrders, rocket: rocketOrders, stark: starkOrders };
  const localOrders = { academy: academyOrders, village: villageOrders, canal: canalOrders, town: townOrders };

  function orders(s) {
    if (s.battle) return [];
    const result = [];
    const add = (id, name, desc, run, disabled = false) => result.push({ id, name, desc, run, disabled });
    water.orders(s, add, log);
    for (const [id, conversation] of Object.entries(conversations)) {
      if (locationOf(id, s.day, s) === s.place) conversation(s, add);
    }
    localOrders[s.place]?.(s, add);
    const inspection = s.place === "canal" && s.waterCase?.outcome;
    const foe = inspection ? "thor" : places[s.place].encounter;
    if (foe && (inspection || !s.cleared[foe])) add("fight", combat.foes[foe].challenge, inspection ? "免费切磋，可重复挑战。开打前可在背包里换法器。" : "指令回合战，可中途撤走。", () => { s.battle = combat.start(foe, s); });
    if (s.place === "canal" && !inspection) add("spar", "上试锤台单挑托尔", "切磋不耗郡历。双方各选一招，按优先度与身法交手。", () => { s.battle = combat.start("thor", s); });
    dailyOrders(s, add);
    return result;
  }
  function act(s, id) {
    const order = orders(s).find(x => x.id === id && !x.disabled);
    if (!order) return false;
    order.run();
    return true;
  }
  function travel(s, to) {
    if (s.battle || !Object.hasOwn(places, to) || to === s.place) return false;
    s.place = to; passDay(s); log(s, `抵达${places[to].name}。`);
    return true;
  }
  function equip(s, id) {
    if (s.battle || !["lid", "seal"].includes(id) || !s.inventory[id]) return false;
    s.equipped = s.equipped === id ? null : id;
    log(s, s.equipped ? `装上${items[id][0]}。` : `收起${items[id][0]}。`);
    return true;
  }
  function victoryReport(id) {
    if (id === "thor") return "托尔在验收单上盖了个锤印。回到废渠，可换件法器再来切磋。";
    return id === "sluice"
      ? "功德水表停摆。你拾到分水令，开渠后灵谷增产。学宫送来一张修闸账单，明日到灭家村开听。"
      : "考勤丹炉散了架。裂纹炉盖已收入背包，可装备挡伤。";
  }
  function fight(s, action) {
    const b = s.battle;
    if (!b) return false;
    if (action === "leave") {
      if (!b.outcome) log(s, `你退出了与${combat.foes[b.id].title}的交手。`);
      s.battle = null; return true;
    }
    if (action === "retry" && b.outcome === "defeat") { s.battle = combat.start(b.id, s); return true; }
    if (!combat.turn(b, s, action)) return false;
    if (b.outcome === "victory") {
      if (b.id !== "thor") {
        s.cleared[b.id] = true;
        gain(s, b.id === "furnace" ? "lid" : "seal");
      }
      if (b.id === "sluice") water.start(s);
      log(s, victoryReport(b.id));
    }
    if (b.outcome === "defeat") log(s, `灭霸败给${combat.foes[b.id].title}，可以重整旗鼓或回地图。`);
    return true;
  }
  return { places, people, items, deeds, boundary, breakthrough, fresh, realm, relation, describe, armorScale, upgradeSave,
    locationOf, orders, act, travel, equip, fight, victoryReport };
})(typeof module !== "undefined" && module.exports ? require("./encounters.js") : Encounters,
   typeof module !== "undefined" && module.exports ? require("./water-case.js") : WaterCase);

if (typeof module !== "undefined" && module.exports) module.exports = World;
