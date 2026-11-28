"use strict";

const FirstRain = (() => {
  const title = "青瓦郡的第一场大雨";
  // The same object that governed the water hearing is now in somebody's hands.
  const supplies = {
    commons: { sight: "三家的值日牌泡在水里。轮到守闸的那户已经把另外两户喊来了，三根牛绳在堤上接成了一根。", take: "向轮值三户借牛绳", gear: "牛绳" },
    franchise: { sight: "火箭的票亭进水了。他还在问谁家有免票，直到一条鲤鱼从窗口游过去。他卸下票亭的长绳递出来。", take: "借火箭票亭的长绳", gear: "票亭绳" },
    warranty: { sight: "保修铜管在雨里敲出三短一长。钢铁侠听了一遍，从学宫的检修箱里拆出绞索。箱盖内侧还夹着你们签过的验单。", take: "从保修箱放出绞索", gear: "检修绞索" },
    metered: { sight: "售票凳被水顶得直晃。买了票的人都在凳前排队，谁也没敢先碰公家的东西。灭建国一脚踢翻凳子，露出底下捆凳的麻绳。", take: "解下售票凳的麻绳", gear: "捆凳绳" },
  };
  const steps = {
    ready: ["山雨将至", "灭建国托人捎话，说祠堂的瓦漏了，接雨的盆却从底下往上冒水。回灭家村看看。"],
    meeting: ["祠堂檐下", "灭建国要把谷种搬上高处。钢铁侠盯着反着转的水轮，说旧渠还有一道旁闸。在灭家村决定先帮哪边。"],
    lock: ["旧渠倒灌", "到废渠找钢铁侠，给闸底的铁环系上绳。"],
    bank: ["给下游一个信号", "回灭家村的渡口，把绳头放到第三块青石上。钢铁侠在上游等你的信号。"],
    seed: ["谷袋过水", "在灭家村把谷种扎成一排，送到镇桥的石阶下。"],
    loft: ["镇桥接粮", "到青瓦镇找灭建国。过了水的谷种还得摊开，桥头干燥的阁楼锁着门。"],
    ferry: ["雨歇 · 旧渡复通", "从废渠动身去灭家村可以乘索渡，当日抵达。"],
    granary: ["雨歇 · 公仓留种", "灭家村开放翻晒公粮，每日可挣 2 灵石工钱。"],
  };
  function stage(s) { return s?.waterCase?.outcome ? s.firstRain ?? "ready" : null; }
  function valid(s) {
    return s.firstRain === undefined || (typeof s.firstRain === "string" && !!s.waterCase?.outcome && Object.hasOwn(steps, s.firstRain));
  }
  function notice(s) {
    const name = stage(s);
    if (!name) return null;
    const [status, text] = steps[name];
    return { status, text };
  }
  function shelterLines(s) {
    return [
      { speaker: "stark", partner: "stark", text: s.lesson
        ? "上回教你听气，今天听听水。它在往回走。"
        : "叫我老史就行。这靴子防水，进去的出不来。" },
      { speaker: "thanos", partner: "stark", smile: !s.lesson, text: s.lesson
        ? "水轮也在倒着转。师父，旧渠底下还有一道闸？"
        : "先把鱼倒出来。老史，你图上怎么还画着一道闸？" },
      { speaker: "stark", partner: "stark", text: "十二年前我把旁闸钉死了。那时候下游还没人家。现在要开，得有人到闸底摸清底环。" },
      { speaker: "elder", partner: "elder", text: "你画的河拐弯了，我种的稻子可没长腿。来托一把，这袋谷种已经湿到一半了。" },
      { speaker: "thanos", partner: "elder", text: "老史去看闸，灭建国守着谷仓。我先去哪边搭手？" },
    ];
  }
  function location(s, id) {
    switch (stage(s)) {
      case "meeting": if (id === "elder" || id === "stark") return "village"; break;
      case "lock": case "bank":
        if (id === "stark") return "canal";
        if (id === "elder") return stage(s) === "lock" && s.waterCase.outcome === "metered" ? "canal" : "village";
        if (id === "rocket" && stage(s) === "lock" && s.waterCase.outcome === "franchise") return "canal";
        break;
      case "seed":
        if (id === "elder" || id === "stark" || (id === "rocket" && s.waterCase.outcome === "franchise")) return "village";
        break;
      case "loft": if (id === "elder" || id === "stark") return "town"; break;
    }
    return null;
  }
  function scene(s, place) {
    const current = stage(s);
    if (current === "lock" && place === "canal") return supplies[s.waterCase.outcome].sight;
    if (current === "seed" && place === "village") {
      const atWarehouse = {
        commons: "轮值的三户赶来抬袋。三条牛绳不一样长，接在一起恰好能从仓门够到船尾。",
        franchise: "火箭坐着票亭漂到了仓门口。隔壁大娘一脚踏上来，他下意识伸手要票，看清她背上扛的是谁家的谷种，又把爪子缩回去了。",
        warranty: "钢铁侠从保修箱里放出绞索，牵进谷仓。上次验单上师徒俩按的手印已经花了，箱盖倒还严丝合缝。",
        metered: "灭建国划着售票凳回来了。凳下原来绑着一大盘麻绳。「票钱我可交过了，今天也让这凳子驮我一趟。」",
      };
      return atWarehouse[s.waterCase.outcome];
    }
    if (current === "loft" && place === "town") return "湿谷袋挤满桥阶。阁楼的铜锁开着，门却关得很紧。里面有人挪木箱，每挪一下，门缝里就喷出一股陈年卷宗的灰。";
    if (current === "bank" && place === "village") return "灭建国蹲在第三块青石旁，脚下就是倒灌口。雨幕对岸一盏掌心灯亮了两下，等这边先回信。";
    if (current === "ferry" && ["canal", "village"].includes(place)) return "两岸的青石间多了一条渡索。钢铁侠把自己的手套缝在滑把上，拇指那里还破了个洞。";
    if (current === "granary" && place === "village") return "村口新搭了晒架。头一袋谷种上留着一个铁手印，小孩照着描了五根指头，给它添了半截蓝白校服袖子。";
    return "";
  }
  function orders(s, add, log, passDay) {
    const current = stage(s);
    if (!current) return;
    const supply = supplies[s.waterCase.outcome];
    const step = (next, text) => { s.firstRain = next; log(s, text, "rain"); };
    if (current === "ready" && s.place === "village") {
      add("readRain", "去祠堂檐下避雨", "门口那双铁靴还站得笔直，里面的人却光着脚。", () => {
        const greeting = s.lesson ? "钢铁侠把你拉到漏雨的那块瓦下。「上回教你听气，今天听听水。它在往回走。」" : "一个赤脚匠师蹲在檐下，把铁靴里的小鱼放回水沟。「叫我老史就行。这靴子防水，进去的出不来。」";
        step("meeting", greeting + "他抹掉旧渠图上的霉点。十二年前，是他把旁闸钉死的，那时下游还没有人家。灭建国扛着一袋谷种打断他：「你画的河拐弯了，我种的稻子可没长腿。」");
      });
    } else if (current === "meeting" && s.place === "village") {
      add("chooseLock", "跟钢铁侠去查旧闸", "先管倒灌。灭建国留下照看谷袋。", () => step("lock", "灭霸把蓝白校服的袖口扎紧，接过旧渠图。钢铁侠想把图倒过来，又停了手。「照你站的方向看。十二年前我就是坐在屋里画反了。」两人约在废渠闸底碰头。"));
      add("chooseSeed", "留下陪灭建国抢谷种", "先保来年的种。钢铁侠留下帮忙接袋。", () => step("seed", "灭霸踩进仓房，水正从门缝往里挤。灭建国撕开一袋给他看，稻壳底下已经有水珠了。钢铁侠收起图，把两只铁靴横过来垫高门槛。「你们搬。我这回在下面接。」"));
    } else if (current === "lock" && s.place === "canal") {
      add("rigGate", supply.take + "，试开旁闸", "一头系住底环，一头顺水送去村口。", () => step("bank", "灭霸把" + supply.gear + "系在底环上，潜下去摸到了那颗反钉的铆钉。钢铁侠握着他的手转了半圈，闸板松了。浮球带着绳头往村口漂。「你看得见田里的水。到第三块青石再扯，我听你的。」"));
    } else if (current === "bank" && s.place === "village") {
      add("signalGate", "站上青石，给上游放闸信号", "等漂来的绳头擦过秧苗的叶尖，扯两下。", () => step("ferry", "灭霸连扯两下。旁闸应声开了一掌，水从田埂退回旧道。他想沿泥坡爬回去，脚下却一滑。绳子猛地一紧，对岸的钢铁侠把另一端扣在自己腰上，灭建国趁势拉他上了岸。雨停要拆绳时，匠师看见有个孩子正等船上学，就回去取了副滑把。渡索留给两岸，从废渠回村当日就到。"));
    } else if (current === "seed" && s.place === "village") {
      add("lashSeeds", supply.take + "，扎牢谷袋", "逐袋验种，把湿得最重的送上第一条船。", () => step("loft", "灭霸用" + supply.gear + "把袋口串起来，手指每松一下，钢铁侠就在下面托一下。最后一袋上船，灭建国才肯松手。镇桥底下已经没了干地，只剩学宫寄放旧卷的阁楼还亮着灯。"));
    } else if (current === "loft" && s.place === "town") {
      add("drySeeds", "敲开阁楼，摊谷过夜", "楼钥匙在钢铁侠手里。灭建国抱着最后一袋湿种上了桥。", () => step("granary", "灭霸刚抬起手，门从里面开了。钢铁侠已经把卷宗背上二楼，借库单的担责人一栏签着他自己的名字。「你的手腾出来。袋底再闷半个时辰，明年咱们就得种粥了。」雨过后，村里用晒干的头一袋谷种立了公仓，谁来翻晒都领一份工钱。"));
    } else if (current === "granary" && s.place === "village") {
      add("dryGrain", "替公仓翻晒谷种", "工钱 2 灵石，耗时 1 日。失田的农户也能领工。", () => {
        s.stones += 2; passDay(s); log(s, "灭霸把谷种耙出一道道细沟。灭建国验过干湿，把今日的 2 灵石工钱塞进他校服口袋。");
      });
    }
  }
  function ferry(s, to) { return stage(s) === "ferry" && s.place === "canal" && to === "village"; }
  return { title, valid, stage, notice, shelterLines, location, scene, orders, ferry };
})();
if (typeof module !== "undefined" && module.exports) module.exports = FirstRain;
