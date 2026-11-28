"use strict";

// Classic scripts also work when the player opens index.html directly from disk.
const World = ((combat, water, rain) => {
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
  const jacketPrice = 5;
  const pillPrice = 2;
  const slipValue = 4;
  const slipPills = 2;
  const items = {
    ...water.items,
    witness: ["水脚收条", "灭建国留着的旧收条，背面有当年的田号。"],
    record: ["地册拓片", "学宫旧档里的底册。和水脚收条一对，田主便有名有姓。"],
    herb: ["引气草", "突破需 1 株。在青瓦镇可换 2 灵石，也能用来还火箭的人情。"],
    seal: ["分水令", "引水诀耗 1 灵力，攻击并打断符咒或蓄雷。托尔的贴地横锤仍会落下。"],
    lid: ["裂纹炉盖", "每场首次受击最多抵消体力上限的四成。可主动架盖挡重击，下一回合反震。"],
    shoes: ["踩泥草鞋", "灭建国用旧稻秆编的。帮他修完灭家村的田埂就能拿到。"],
    jacket: ["补过三回的校服", `里衬缝了三层，肘上还印着上一任主人的班号。火箭在青瓦镇摆摊时卖 ${jacketPrice} 灵石。`],
    cap: ["丹房护头帽", "学宫库房备着厚毡帽。击败点名的丹炉后可领一顶，防御 +200。"],
    trousers: ["渡口下田裤", "村口管事缝的厚布裤。修好田埂后可去领，体力上限 +1,200。"],
    buckle: ["雷纹铁扣", "托尔拿锤子把验收章压在废铁上。首次赢下废渠的切磋可得。"],
    returnSlip: ["丹房退货单", `可在青瓦镇找火箭换 ${slipValue} 灵石，或在学宫丹房库房换 ${slipPills} 枚${combat.pill.name}。兑过即收回。`],
    pill: [combat.pill.name, `战斗中占用一回合，恢复 ${combat.pill.recovery} 点灵力。青瓦镇药摊售价 ${pillPrice} 灵石。`],
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
    return { version: 4, day: 1, place: "village", deed: "pending", stones: 3, xp: 0, waterCase: null,
      trained: false, equipped: combat.loadout(), trackedQuest: null, debt: false, introduced: false, lesson: false,
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
    if (s.version >= 3) return 1;
    return [5, 7].includes(s.battle.maxHealth) ? 2000 : 100;
  }
  function upgradeSave(s) {
    if (s.version === 4) return s;
    s.deedLate = s.deed === "taken" || s.journal.some(entry => entry.text.startsWith("第五天交割。"));
    s.equipped = combat.loadout(s.equipped);
    s.trackedQuest = null;
    const b = s.battle;
    if (b && s.version < 3) {
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
    s.version = 4;
    return s;
  }
  function passDay(s) {
    s.day++;
    if (s.day >= boundary && s.deed === "pending") {
      s.deedLate = true;
      s.deed = "taken";
      log(s, "第五天交割。买家接管灵田，新管事把灭家的锄头也登记成了租具。");
    }
    water.nextDay(s, log);
  }
  function locationOf(id, day, s) {
    const assignment = rain.location(s, id) || water.location(s?.waterCase, id, day);
    if (assignment) return assignment;
    const route = people[id].route;
    return route[(day - 1) % route.length];
  }
  function localLore(s, place) {
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
  function describe(s, place) {
    const scene = rain.scene(s, place);
    return scene || localLore(s, place);
  }
  function realm(s) { return s.trained ? "炼气中期" : "炼气初期"; }
  function gain(s, id, count = 1) { s.inventory[id] = (s.inventory[id] || 0) + count; }
  function relation(s, id) {
    if (id === "elder") return s.deed === "owned" ? "愿替你引荐" : s.deed === "leased" ? "与你合耕" : "同乡";
    if (id === "rocket" && s.waterCase?.outcome === "franchise") return "包闸合约的保人";
    if (id === "rocket") return s.debt ? "欠他一份人情" : s.broker ? "生意相识" : "尚无往来";
    const ties = { ferry: "与你一起开过旁闸", granary: "与你一起保过谷种" };
    const shared = ties[rain.stage(s)];
    if (shared) return (s.lesson ? "有授业之谊，" : "") + shared;
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
    if (s.place === "village" && !s.inventory.shoes) {
      add("mendBank", "帮灭建国修田埂", "耗时 1 日，得踩泥草鞋，装备后身法 +120。", () => {
        gain(s, "shoes"); passDay(s);
        log(s, "灭霸用手把最后一道豁口抹平。灭建国从锄把上解下两只草鞋。「你穿这个走。先别试响指，鞋带是打活扣的。」");
      });
    }
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
    if (s.place !== "town") return;
    if (!s.inventory.jacket) add("buyJacket", "向火箭买旧校服", `付 ${jacketPrice} 灵石，得补过三回的校服，装备后防御 +600。`, () => {
      s.stones -= jacketPrice; gain(s, "jacket");
      log(s, "火箭把校服往你肩上一披。「三层补丁，洗一遍还能省三件衣服的钱。」");
    }, s.stones < jacketPrice);
    if (s.inventory.returnSlip) add("cashSlip", "找火箭兑退货单", `交回退货单，换 ${slipValue} 灵石。也可去学宫库房换药。`, () => {
      gain(s, "returnSlip", -1); s.stones += slipValue;
      log(s, `火箭盯着单子看了半天。「炉盖都被你拿走了，你退的是哪一部分？」他划掉货号，给了你 ${slipValue} 灵石。`);
    });
  }
  function starkOrders(s, add) {
    if (s.introduced && !s.lesson) add("lesson", "请钢铁侠指点", "用灭建国的引荐换一次行气指点。", () => {
      s.lesson = true; s.xp += 2; log(s, "钢铁侠把护腕借你半刻，震得你连打三个嗝。经脉倒真通了，修为增加 2。");
    });
    if (s.firstRain === "ferry" || s.firstRain === "granary") {
      add("talkStark", "和钢铁侠叙旧", "他把工单折起来，给你腾出半条长凳。", () => log(s, s.firstRain === "ferry"
        ? "钢铁侠伸出右手，掌心还留着绳印。「那天要是按我的图开闸，田准得淹。以后画水道，青石那头给你留一支笔。」"
        : "钢铁侠从衣袋摸出几粒稻谷，壳都裂开了。「我留了三粒试种。早上出了两个芽，另一个大概跟我一样，起得晚。」"));
    } else if (s.firstRain && rain.location(s, "stark") === s.place) {
      add("talkStark", "问钢铁侠旧渠的来历", "他的旧图上还有半枚学宫的骑缝印。", () => log(s,
        "钢铁侠把湿图揭开。图背面还有条细细的蓝线，一直通到郡界外。「那年仙盟说上游要蓄灵，叫我封了旁闸。我回来交差的时候，连画图的人都调走了。」他指指印上缺的半边。「另一半，在上游。」"));
    } else if (!s.introduced || s.lesson) add("talkStark", "和钢铁侠聊聊", "问问匠师这阵子都在修什么。", () => log(s,
      s.cleared.furnace ? "钢铁侠听说炉盖掉了，立刻在修理单上勾了「可拆洗」。" : "钢铁侠翻着工单。「废渠水表归学宫，学宫丹炉归后勤，后勤归正在维修的水表。」"));
    if (s.cleared.furnace && !Object.hasOwn(s.inventory, "returnSlip")) {
      add("getReturnSlip", "请钢铁侠开丹房退货单", "可在青瓦镇兑灵石，或去学宫库房换回气丸。", () => {
        gain(s, "returnSlip");
        log(s, "钢铁侠看了一眼裂纹炉盖，在单上写下「退炉身一件」。炉盖仍然归你。");
      });
    }
  }
  function academyOrders(s, add) {
    if (s.cleared.furnace && !s.inventory.cap) add("claimCap", "去库房领护头帽", "丹炉已停，库房按检修规矩发帽。防御 +200。", () => {
      gain(s, "cap"); log(s, "库房给灭霸发了顶护头帽。帽檐内侧绣着「检修前领取」，签收单上却要先填完工日期。");
    });
    if (!s.inventory.record) add("archive", "翻查学宫旧档", "在西厢取一张底册拓片。", () => {
      gain(s, "record"); log(s, "你拓下底册。新册抄漏了一个「灭」字，难怪灭家田成了无主田。带齐收条就能递状。");
    });
    if (openDeed(s)) {
      const fee = s.deed === "taken" ? 2 : 0;
      add("file", fee ? "递交田契申诉" : "当堂对证", `需水脚收条和地册拓片${fee ? "，交割后另收 2 灵石" : "，当日办结"}。`, () => {
        s.stones -= fee; s.deed = "owned"; log(s, "两份田号对上了。学宫撤销登记，灭建国重获田契。再见到他，可以请他引荐故交。");
      }, !s.inventory.witness || !s.inventory.record || s.stones < fee);
    }
    if (s.inventory.returnSlip) add("tradeSlip", "去库房用退货单换药", `交回退货单，领 ${slipPills} 枚回气丸。也可到青瓦镇找火箭兑灵石。`, () => {
      gain(s, "returnSlip", -1); gain(s, "pill", slipPills);
      log(s, `管库的童子把单子钉到墙上，数出 ${slipPills} 枚回气丸。「炉子坏了以后，库房总算有人亲自点数了。」`);
    });
  }
  function villageOrders(s, add) {
    if (s.inventory.shoes && !s.inventory.trousers) add("claimTrousers", "在渡口领下田裤", "修田埂的工衣。体力上限 +1,200，领取不耗日。", () => {
      gain(s, "trousers"); log(s, "管事抖开一条厚布裤。两边裤脚各有一指泥印，正好记着昨天的水深。");
    });
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
    add("buyPill", "在药摊买回气丸", `付 ${pillPrice} 灵石买 1 枚，战斗中可恢复 1 点灵力。`, () => {
      s.stones -= pillPrice; gain(s, "pill");
      log(s, "药摊递来一枚回气丸，油纸上写着「嚼完再运功」。");
    }, s.stones < pillPrice);
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
    rain.orders(s, add, log, passDay);
    water.orders(s, add, log);
    for (const [id, conversation] of Object.entries(conversations)) {
      if (locationOf(id, s.day, s) === s.place) conversation(s, add);
    }
    localOrders[s.place]?.(s, add);
    const inspection = s.place === "canal" && s.waterCase?.outcome;
    const thorPrize = s.inventory.buckle ? "" : "首次胜利掉落雷纹铁扣。";
    const foe = inspection ? "thor" : places[s.place].encounter;
    if (foe && (inspection || !s.cleared[foe])) add("fight", combat.foes[foe].challenge, inspection ? "免费切磋，可重复挑战。" + thorPrize : "指令回合战，可中途撤走。", () => { s.battle = combat.start(foe, s); });
    if (s.place === "canal" && !inspection) add("spar", "上试锤台单挑托尔", "切磋不耗郡历。双方各选一招，按优先度与身法交手。" + thorPrize, () => { s.battle = combat.start("thor", s); });
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
    const crossing = rain.ferry(s, to);
    s.place = to;
    if (!crossing) passDay(s);
    log(s, crossing ? "灭霸扣住滑把，顺着渡索回到灭家村，午饭还热着。" : `抵达${places[to].name}。`);
    return true;
  }
  function equip(s, id) {
    if (s.battle || !Object.hasOwn(combat.gear, id) || !s.inventory[id]) return false;
    const slot = combat.gear[id].slot;
    s.equipped[slot] = s.equipped[slot] === id ? null : id;
    log(s, s.equipped[slot] ? `装上${items[id][0]}。` : `收起${items[id][0]}。`);
    return true;
  }
  function victoryReport(id, firstWin = false) {
    if (id === "thor") return firstWin
      ? "托尔把验收章砸在一截废铁上。雷纹铁扣已收入背包，装备后攻击 +700。"
      : "托尔在验收单上盖了个锤印。回到废渠，可换件装备再来切磋。";
    return id === "sluice"
      ? "功德水表停摆。你拾到分水令，开渠后灵谷增产。学宫送来一张修闸账单，明日到灭家村开听。"
      : "考勤丹炉散了架。裂纹炉盖已收入背包，可装备挡伤。";
  }
  function fight(s, action, motions) {
    const b = s.battle;
    if (!b) return false;
    if (action === "leave") {
      if (!b.outcome) log(s, `你退出了与${combat.foes[b.id].title}的交手。`);
      s.battle = null; return true;
    }
    if (action === "retry" && b.outcome === "defeat") { s.battle = combat.start(b.id, s); return true; }
    if (!combat.turn(b, s, action, motions)) return false;
    if (b.outcome === "victory") {
      if (b.id !== "thor") {
        s.cleared[b.id] = true;
        gain(s, b.id === "furnace" ? "lid" : "seal");
      } else if (!s.inventory.buckle) {
        gain(s, "buckle");
        b.thorReward = true;
        b.turns[0].text += "获得雷纹铁扣。";
      }
      if (b.id === "sluice") water.start(s);
      log(s, victoryReport(b.id, b.thorReward));
    }
    if (b.outcome === "defeat") log(s, `灭霸败给${combat.foes[b.id].title}，可以重整旗鼓或回地图。`);
    return true;
  }
  return { places, people, items, deeds, boundary, breakthrough, fresh, realm, relation, describe, armorScale, upgradeSave,
    locationOf, orders, act, travel, equip, fight, victoryReport };
})(typeof module !== "undefined" && module.exports ? require("./encounters.js") : Encounters,
   typeof module !== "undefined" && module.exports ? require("./water-case.js") : WaterCase,
   typeof module !== "undefined" && module.exports ? require("./first-rain.js") : FirstRain);

if (typeof module !== "undefined" && module.exports) module.exports = World;
