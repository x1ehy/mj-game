"use strict";

// Dates are relative to the day the sluice stopped charging, independent of the land deed.
const WaterCase = (() => {
  const title = "水表拆了，谁来交水费？";
  const term = 5;
  const surveySites = { elder: "village", rocket: "town", stark: "canal" };
  const endings = {
    commons: {
      name: "三户轮灌", terms: "三户轮流开闸，免收水票。渠边留出公用药圃，每次采草可得两株。",
      story: "灭霸把三道水痕转给大家看，一斗水正好流到三家的田埂。灭建国把收费牌翻过来，写上三家的值日顺序。火箭拿着算盘，没找到该按哪颗珠子。",
    },
    franchise: {
      name: "灭家免票", terms: "火箭承包水闸，撕掉草债。灭家收谷免票，其余农户每茬交一枚灵石。",
      story: "火箭把欠条撕成两张免水票，一张交给灭霸，一张贴上灭家的闸口。隔壁大娘伸手时，他已经翻到了价目表那一页。",
    },
    warranty: {
      name: "学宫保修", terms: "学宫承担修闸费，全村免水票。钢铁侠把废渠留作实习场，可随他留下的铜管练功采草。",
      story: "验单上写着「岸上的表，记了天上的雨」。钢铁侠在制造人一栏签了名，又在赔款人一栏签了一回。「两边都是我，至少这趟少跑个窗口。」",
    },
    metered: {
      name: "全村按茬收费", terms: "火箭垫资接闸。灭家每次收谷另付一枚水票钱，原有的地租和人情仍照旧。",
      story: "落印时无人递交别案。钢铁侠收起空白验单，灭建国只争到秧苗不断水。火箭垫了修闸钱，当场卖出全村第一张水票。",
    },
  };
  const items = {
    measure: ["缺口量斗", "灭建国把斗沿锯掉一角。带到废渠试放一次水，就能量出三畦田的水痕。"],
    notches: ["三道水痕的量斗", "斗壁留着三畦田的湿印。听证期间可交给灭建国，提议三户轮灌。"],
    diagnosis: ["空转验单", "钢铁侠签过字的实测单。听证期间可带回灭家村，请学宫承担维修。"],
  };
  function start(s) {
    s.waterCase = { openedDay: s.day, outcome: null };
  }
  function valid(s) {
    const c = s.waterCase;
    if (!s.cleared.sluice) return c === null;
    if (!c || !Number.isSafeInteger(c.openedDay) || c.openedDay < 1 || c.openedDay > s.day) return false;
    const age = s.day - c.openedDay;
    if (c.outcome === null) return age < term;
    return Object.hasOwn(endings, c.outcome) && age >= (c.outcome === "metered" ? term : 1);
  }
  function finish(s, outcome, log) {
    s.waterCase = { ...s.waterCase, outcome };
    if (outcome === "franchise") s.debt = false;
    const ending = endings[outcome];
    log(s, `水案落印 · ${ending.name}。${ending.story}`, "water");
  }
  function nextDay(s, log) {
    const c = s.waterCase;
    if (!c || c.outcome) return;
    switch (s.day - c.openedDay) {
      case 1: log(s, "田边开听。灭建国卸下自家门板当公案，钢铁侠摊开维修单，火箭把算盘搁在唯一一张干凳子上。", "water"); break;
      case 2: log(s, "听证散场查账。钢铁侠到废渠验齿，火箭去青瓦镇估价，灭建国留在村里等实测水痕。", "water"); break;
      case 3: log(s, "三人回村对账。火箭带来了水票样张，钢铁侠带回来半只卡在表齿里的螺蛳。", "water"); break;
      case term: finish(s, "metered", log); break;
    }
  }
  function location(c, id, day) {
    if (!c || c.outcome || !Object.hasOwn(surveySites, id)) return null;
    const age = day - c.openedDay;
    if (age < 1 || age >= term) return null;
    if (age === 2) return surveySites[id];
    return "village";
  }
  function notice(s) {
    const c = s.waterCase;
    if (!c) return null;
    const age = s.day - c.openedDay;
    if (c.outcome) {
      const end = endings[c.outcome];
      return { status: end.name, text: end.terms + "托尔已到废渠，可前往陪他验闸。", date: "已落印" };
    }
    const date = `第 ${c.openedDay + term} 日清晨落印`;
    if (age === 0) return { date, status: "明日开听", text: `拆表当天，灭霸从表肚里抖出一张账单。第 ${s.day + 1} 日到灭家村田头，三方要当面谈修闸钱。` };
    if (age === 2) return { date, status: "分头查账", text: "灭建国在村口等水痕，钢铁侠在废渠查齿轮，火箭在青瓦镇估价。明日三人回村。" };
    return { date, status: age === term - 1 ? "今日截状" : "田边听证", text: "三人在灭家村田头等方案。落印前可递交量斗或验单，逾期由火箭垫钱承包，按茬收水票。" };
  }
  function statements(s, place) {
    const c = s.waterCase;
    if (!c || c.outcome) return [];
    let elder = "我种了三十年田，今天头回听说雨也有欠款。拿这只斗去闸边量量，看咱能不能自己排班。";
    if (s.inventory.measure) elder = "斗在你手上。脚踩最矮的那块闸石，放完水再回来，我给你留着门板这一头。";
    if (s.inventory.notches) elder = "三道湿印都在。你点个头，我就喊三家来排班。";
    let stark = "水表出厂那天我亲自校的。一夜收了八天的水钱，这得是多勤快的一条河。";
    if (s.lesson) stark = "上回教你听气走到哪儿了。拿分水令过来，听听这齿轮是被水推着转，还是自己在报工时。";
    if (s.inventory.diagnosis) stark = "字我签了。你把单子递上村口的公案，学宫就认这笔账。趁墨还干着，离鸭子远点。";
    const voices = [
      ["elder", elder],
      ["rocket", s.debt ? "上回是我给你垫的田钱。今天你肯在包闸约上作保，草债一笔勾销，你家的水也算我的。" : "我把修闸钱垫上。往后每收一茬谷子，给我一枚灵石。没谷子的时候，我总不能找鸭子收吧？"],
      ["stark", stark],
    ];
    return voices.filter(([id]) => location(c, id, s.day) === place);
  }
  function orders(s, add, log) {
    const c = s.waterCase;
    if (!c || c.outcome || s.day <= c.openedDay) return;
    const at = id => location(c, id, s.day) === s.place;
    if (at("elder") && !s.inventory.measure && !s.inventory.notches) {
      add("takeMeasure", "接下灭建国的量斗", "去废渠量水，再回村交斗，可提议三户轮灌。", () => {
        s.inventory.measure = 1;
        log(s, "灭建国递过缺口量斗。「缺的那块正好架在闸口。你看水到哪儿，别听他们说水到哪儿。」");
      });
    }
    if (s.place === "canal" && s.inventory.measure) {
      add("gaugeFlow", "在闸口试放一斗水", "沿三畦田验水，刻下水痕，当日即可动身回村。", () => {
        delete s.inventory.measure;
        s.inventory.notches = 1;
        log(s, "灭霸放了三次水，三畦秧苗挨个点头。他在斗里刻下三道湿印。岸上的鸭子只点了两次，被请出了证人席。");
      });
    }
    if (at("elder") && s.inventory.notches) {
      add("signCommons", "交量斗，立三户轮灌约", "当场定案。三户轮值，村田免水票；渠边药圃每次可采两株草。", () => finish(s, "commons", log));
    }
    if (at("rocket") && s.debt) {
      add("signFranchise", "替火箭作保，换灭家免票", "当场定案。销掉草债，灭家免水票，其余农户每茬交一枚灵石。", () => finish(s, "franchise", log));
    }
    if (at("stark") && s.lesson && !s.inventory.diagnosis) {
      add("inspectGear", "跟师父验分水令", "用学过的行气法复现空转，取得签字验单。", () => {
        s.inventory.diagnosis = 1;
        log(s, "灭霸把分水令搁在干桌上，照师父教的逆行一周。齿轮空转六圈，账上凭空多出半亩暴雨。钢铁侠沉默着签了验单。");
      });
    }
    if (s.place === "village" && s.inventory.diagnosis) {
      add("signWarranty", "递验单，请学宫保修", "当场定案。全村免水票，废渠开放引流吐纳。", () => finish(s, "warranty", log));
    }
  }
  return { title, term, endings, items, start, valid, nextDay, location, notice, statements, orders };
})();
if (typeof module !== "undefined" && module.exports) module.exports = WaterCase;
