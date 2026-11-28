"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const slots = SaveSlots.create(() => localStorage);
  let state = World.fresh();
  let activeSlot = null;
  let menuPage = "home";
  let continueSlot = null;
  let opening = null;
  let resetTarget = null;
  let selected = state.place;
  let panel = "";
  let bagCategory = "gear";
  let bagItem = null;
  let bagSlot = "";
  let lastSave = null;
  let saveMessage = "";
  let playback = null;
  let crossing = null;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const isCount = n => Number.isSafeInteger(n) && n >= 0;
  function validSave(s) {
    if (!s || ![1, 2, 3, 4, 5].includes(s.version) || !Object.hasOwn(World.places, s.place) || !Object.hasOwn(World.deeds, s.deed)) return false;
    if (![s.day, s.stones, s.xp].every(isCount) || s.day < 1 || !s.inventory || !s.cleared) return false;
    if (!["debt", "introduced", "lesson", "broker"].every(key => typeof s[key] === "boolean")) return false;
    if (s.version < 5 && typeof s.trained !== "boolean") return false;
    if (s.version === 5 && (typeof s.realm !== "string" || !Object.hasOwn(World.realmNames, s.realm) || typeof s.hideTips !== "boolean"
      || !Array.isArray(s.discoveries) || !s.discoveries.every(id => World.discoveryIds.includes(id)))) return false;
    if (!Object.entries(s.inventory).every(([id, n]) => Object.hasOwn(World.items, id) && isCount(n))) return false;
    if (s.version >= 4) {
      if (!s.equipped || typeof s.equipped !== "object" || Array.isArray(s.equipped)
        || Object.keys(s.equipped).length !== Object.keys(Encounters.slots).length) return false;
      for (const slot of Object.keys(Encounters.slots)) {
        const id = s.equipped[slot];
        if (id !== null && (typeof id !== "string" || Encounters.gear[id]?.slot !== slot || !s.inventory[id])) return false;
      }
    } else if (s.equipped !== null && (typeof s.equipped !== "string" || !Object.hasOwn(Encounters.gear, s.equipped) || !s.inventory[s.equipped])) return false;
    if (!["furnace", "sluice"].every(key => typeof s.cleared[key] === "boolean")) return false;
    if (s.version >= 2 && !WaterCase.valid(s)) return false;
    if (!FirstRain.valid(s)) return false;
    if (!Array.isArray(s.journal) || !s.journal.length || !s.journal.every(x => x && isCount(x.day) && typeof x.text === "string")) return false;
    const b = s.battle;
    if (b === null) return true;
    const fighter = s.version === 5 ? s : { trained: s.trained };
    const hero = s.version >= 3 ? Encounters.attributes(fighter, s.version === 3 ? Encounters.loadout(s.equipped) : s.equipped) : null;
    const maxHealthOK = hero ? b?.maxHealth === hero.maxHealth : [5, 7, 100, 140].includes(b?.maxHealth);
    const spiritLimits = s.version === 5 ? [hero.maxSpirit] : [2, 3];
    return b && Object.hasOwn(Encounters.foes, b.id) && [b.round, b.health, b.maxHealth, b.spirit, b.maxSpirit, b.armor].every(isCount)
      && (b.snapReadyAt === undefined || isCount(b.snapReadyAt))
      && [b.sweepNext, b.counterReady].every(flag => flag === undefined || typeof flag === "boolean")
      && Encounters.validPlan(b) && (![5, 7].includes(b.maxHealth) || !b.duel)
      && (b.thorReward === undefined || (b.thorReward === true && b.id === "thor" && b.outcome === "victory" && s.inventory.buckle > 0))
      && b.round > 0 && maxHealthOK && spiritLimits.includes(b.maxSpirit)
      && b.health <= b.maxHealth && b.spirit <= b.maxSpirit && b.armor <= Encounters.foes[b.id].armor / World.armorScale(s)
      && [null, "victory", "defeat"].includes(b.outcome) && Array.isArray(b.turns) && b.turns.length
      && b.turns.every(x => x && isCount(x.round) && typeof x.text === "string");
  }
  function parseSave(raw) {
    try {
      const data = JSON.parse(raw);
      return validSave(data) ? data : null;
    } catch { return null; }
  }
  function load(data, { raw, persistent }) {
    state = data ? World.resumeSave(data) : World.fresh();
    lastSave = raw;
    saveMessage = persistent ? `已存入槽位 ${activeSlot}` : "进度暂存在此标签页";
    selected = state.place;
  }
  function save() {
    if (!activeSlot) return;
    // Until a fight is settled, the slot retains the last exploration snapshot.
    if (state.battle && !state.battle.outcome) {
      saveMessage = "战斗中 · 读档回到开战前";
      return;
    }
    const raw = JSON.stringify(state);
    const persistent = slots.write(activeSlot, raw);
    lastSave = raw;
    saveMessage = persistent ? `已存入槽位 ${activeSlot}` : "进度暂存在此标签页";
  }
  function checkForNewerSave() {
    if (!activeSlot) return false;
    const entry = slots.read(activeSlot);
    if (!entry.persistent || entry.raw === lastSave) return false;
    const data = parseSave(entry.raw);
    if (!data) {
      showMenu("slots", "当前槽位已在另一页清除或无法读取。请选择要继续的存档。");
      return true;
    }
    closeDialog("reset-dialog");
    closeDialog("story-dialog");
    load(data, entry);
    render();
    if ($("ledger").open) renderLedger();
    announce("另一页已更新当前槽位，请按当前局势重新选择。");
    return true;
  }
  window.addEventListener("storage", event => {
    if (activeSlot && (event.key === SaveSlots.key(activeSlot) || event.key === null)) checkForNewerSave();
    else if (!activeSlot && !opening && (event.key === null || SaveSlots.ids.some(id => event.key === SaveSlots.key(id)))) renderMenu();
  });
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  const heroTemplate = $("hero-art");
  for (const mount of document.querySelectorAll("[data-hero-art]")) {
    mount.append(heroTemplate.content.cloneNode(true));
  }
  function thanosHearingReply() {
    if (state.inventory.diagnosis) return ["smug", "这回验单上有签名。谁要再收钱，先把制造人和赔款人请来。"];
    if (state.inventory.notches) return ["smug", "我把水量刻在斗上了。斗没学过算账，应该比水表靠谱。"];
    if (state.inventory.measure) return ["steady", "我去闸口放水。谁都别动桌上那把算盘，回来我要对数。"];
    if (state.debt) return ["hurt", "一株草还没还，人情已经长利息了。"];
    return ["steady", "账单给我看。河流了三十年，头回听说它也得交学费。"];
  }
  function announce(text) { $("update").textContent = text; }
  function actionButton(option, primary = false) {
    const btn = el("button", undefined, primary ? "command command-primary" : "command");
    btn.type = "button"; btn.dataset.action = option.id; btn.disabled = !!option.disabled;
    if (option.kind === "discovery") btn.classList.add("discovery-command");
    const name = option.kind === "discovery" ? "见闻 · " + option.name : option.name;
    btn.append(el("span", name, "command-name"), el("span", option.desc, "command-description"));
    return btn;
  }
  function renderTips() {
    const battle = state.battle;
    let field = "", duel = "";
    if (!state.hideTips) {
      if (battle?.duel && battle.round === 1 && !battle.outcome) {
        duel = "开打先看指令上的优先度。托尔举锤后，下一回合留意敌方预告。";
      } else if (!battle) {
        if (state.inventory.shoes && state.equipped.feet !== "shoes" && state.day <= 6) {
          field = "草鞋已入包。打开背包的「装备 → 鞋子」即可穿上。";
        } else if (state.day <= 2 && !state.inventory.witness) {
          field = "点「定位」找下一步。确认动身才会赶路。";
        }
      }
    }
    $("field-tip").hidden = !field;
    $("field-tip-copy").textContent = field;
    $("duel-tip").hidden = !duel;
    $("duel-tip-copy").textContent = duel;
  }
  function renderWaterCase(here) {
    const note = WaterCase.notice(state);
    const rain = FirstRain.notice(state);
    $("rain-notice").hidden = !rain;
    if (rain) {
      $("rain-status").textContent = rain.status;
      $("rain-copy").textContent = rain.text;
    }
    $("water-notice").hidden = !note || !!rain;
    if (note && !rain) {
      if (!$("hearing-art").hasAttribute("src")) $("hearing-art").src = "art/locations/water-hearing.webp";
      $("water-title").textContent = WaterCase.title;
      $("water-status").textContent = note.status;
      $("water-date").textContent = note.date;
      $("water-copy").textContent = note.text;
    }
    const voices = here ? WaterCase.statements(state, state.place) : [];
    $("water-voices").hidden = !voices.length;
    if (!voices.length) $("water-voices").open = false;
    $("voice-lines").replaceChildren(...voices.flatMap(([id, line]) => [el("dt", World.people[id].name), el("dd", line)]));
    if (voices.length) {
      const [mood, line] = thanosHearingReply();
      $("hearing-face").dataset.mood = mood;
      $("hearing-reply").textContent = line;
    }
  }
  function layoutTrail() {
    const line = $("route-trail");
    line.hidden = state.place === selected || !!state.battle;
    if (line.hidden || crossing) return;
    const from = World.places[state.place], to = World.places[selected];
    const map = $("atlas-map");
    const dx = map.clientWidth * (to.x - from.x) / 100, dy = map.clientHeight * (to.y - from.y) / 100;
    Object.assign(line.style, { left: from.x + "%", top: from.y + "%",
      width: Math.hypot(dx, dy) + "px", transform: `rotate(${Math.atan2(dy, dx)}rad)` });
  }
  new ResizeObserver(layoutTrail).observe($("atlas-map"));
  function renderAtlas() {
    renderTips();
    const here = selected === state.place;
    const place = World.places[selected];
    const preview = here ? state : structuredClone(state);
    if (!here) World.travel(preview, selected);
    const visitDay = preview.day;
    const visitors = Object.entries(World.people).filter(([id]) => World.locationOf(id, visitDay, preview) === selected);
    $("day").textContent = `第 ${state.day} 日`;
    $("map-position").textContent = `灭霸在${World.places[state.place].name}`;
    const quest = Quests.tracked(Quests.list(state), state.trackedQuest);
    const origin = World.places[state.place];
    layoutTrail();
    $("traveler").style.left = origin.x + "%";
    $("traveler").style.top = origin.y + "%";
    const route = $("route-note");
    route.hidden = here;
    route.style.left = place.x + "%";
    route.style.top = place.y + "%";
    route.textContent = FirstRain.ferry(state, selected) ? "乘索 · 当日抵达" : `赶路 1 日 · 第 ${visitDay} 日抵达`;
    $("hud-realm").textContent = World.realm(state);
    const heroStats = Encounters.attributes(state);
    const nextRealm = World.breakthrough(state);
    $("hud-cultivation").textContent = `修为 ${state.xp}${nextRealm ? " / " + nextRealm.xp : ""}　灵石 ${state.stones}`;
    $("hud-gear").textContent = `装备 · ${Object.values(state.equipped).filter(Boolean).length} / 6`;
    $("hud-vitals").textContent = `体力上限 ${heroStats.maxHealth.toLocaleString("zh-CN")}　灵力上限 ${heroStats.maxSpirit}`;
    $("travel-hint").textContent = FirstRain.ferry(state, "village") ? "点灭家村 · 乘索当日回村" : "点地名探路 · 赶路耗一日";
    document.querySelectorAll("[data-place]").forEach(pin => {
      const id = pin.dataset.place;
      pin.toggleAttribute("data-quest", quest?.step?.place === id);
      pin.dataset.current = String(id === state.place);
      pin.setAttribute("aria-pressed", String(id === selected));
      pin.setAttribute("aria-label", `${World.places[id].name}${id === state.place ? "，灭霸当前所在" : "，查看行程"}`);
    });
    const [label, desc] = World.deeds[state.deed];
    $("world-premise").textContent = state.deed === "pending" ? "天门闭了三十年。仙盟重划灵脉，灭家的田要在第五日交割。" : "天门闭了三十年。学宫收着全郡的地册，青瓦河养着两岸的人家。";
    $("deed-state").textContent = state.deed === "pending" ? `距交割 ${World.boundary - state.day} 日` : label;
    $("deed-copy").textContent = desc;
    renderWaterCase(here);
    $("dispatch-text").textContent = quest?.title ?? "已结清 · 查看纪事";
    $("quest-deadline").textContent = quest?.deadline || "";
    const locate = $("quest-locate");
    locate.hidden = !quest;
    locate.disabled = !quest?.step;
    locate.textContent = quest?.step ? "定位 · " + Quests.describe(quest.step, state) : quest?.note || "";
    $("place-context").textContent = here ? "灭霸所在" : `行程预览 · 第 ${visitDay} 日抵达`;
    $("place-name").textContent = place.name;
    $("place-vignette").dataset.site = selected;
    $("place-tag").textContent = place.tag;
    $("place-lore").textContent = World.describe(preview, selected);
    $("visitors").textContent = `${here ? "今日在场" : "抵达时在场"}　${visitors.map(([,p]) => p.name).join("、") || "暂无熟人"}`;
    const [latest, previous] = state.journal;
    const dispatch = previous?.kind === "water" && previous.day === latest.day ? " " + previous.text : "";
    $("latest").textContent = here ? latest.text + dispatch : "";
    const travelNotes = [FirstRain.ferry(state, selected) ? "乘渡索回村，当日抵达。" : `赶路 1 日，第 ${visitDay} 日抵达。`];
    if (preview.deed !== state.deed) travelNotes.push("抵达时灵田将完成交割。");
    if (preview.waterCase?.outcome !== state.waterCase?.outcome) travelNotes.push("抵达时水案已落印，火箭将按茬收水票。");
    let actions = here ? World.orders(state) : [
      { id: "travel", name: `动身去${place.name}`, desc: travelNotes.join("") },
      { id: "cancel", name: "留在原地", desc: `回到${World.places[state.place].name}，不耗时。` },
    ];
    if (here && selected === "village" && FirstRain.stage(state) === "meeting") {
      actions = [{ id: "readRain", name: "回祠堂檐下商议", desc: "和钢铁侠、灭建国决定先去哪边救急。" },
        ...actions.filter(order => !isRainChoice(order))];
    }
    const target = quest?.step;
    const guided = target?.place === selected && (here && target.day === state.day
      ? actions.find(a => a.id === target.action && !a.disabled) : !here && actions.find(a => a.id === "travel"));
    const first = guided || actions.find(a => !a.disabled);
    if (guided) actions = [guided, ...actions.filter(a => a !== guided)];
    $("local-actions").replaceChildren(...actions.map(a => actionButton(a, a === first)));
    $("identity").textContent = `灭霸　·　${World.realm(state)}　·　${state.stones} 灵石`;
    $("save-status").textContent = saveMessage;
  }
  function meter(stat, value, max) {
    $(stat + "-value").textContent = value.toLocaleString("zh-CN");
    $(stat + "-max").textContent = max.toLocaleString("zh-CN");
    $(stat + "-meter").firstElementChild.style.width = (100 * value / max) + "%";
  }
  function renderBattle() {
    renderTips();
    const b = state.battle, foe = Encounters.foes[b.id], info = Encounters.forecast(b, state);
    const won = b.outcome === "victory", lost = b.outcome === "defeat";
    $("battle-save-note").hidden = !!b.outcome;
    $("case-title").textContent = foe.caseTitle; $("case-premise").textContent = foe.intro;
    $("battle-realm").textContent = World.realm(state);
    $("arena-art").setAttribute("aria-label", `左侧是灭霸，右侧是${foe.title}。`);
    const arena = $("arena-art");
    arena.dataset.foe = b.id;
    arena.dataset.outcome = b.outcome || "";
    arena.toggleAttribute("data-charging", !b.outcome && !!info.charging);
    arena.toggleAttribute("data-resting", b.id === "thor" && !b.outcome && b.effect === "cool" && !info.charging);
    const mood = won || b.effect === "interrupt" ? "smug" : lost || b.effect === "penalty" ? "hurt" : "steady";
    $("arena-art").dataset.mood = mood;
    const remark = won ? "这回谁签字？我手腾不开。" : lost ? "先歇一会儿。别写我旷课。" :
      b.counterReady ? "打我盖上了。现在轮到我还盖。" :
      b.effect === "interrupt" ? "这一步先免了。你接着念。" :
      b.health <= b.maxHealth * .4 ? "等会儿，我领子都被你打歪了。" : "";
    $("battle-reply").textContent = remark ? `灭霸：「${remark}」` : "";
    $("battle-place").textContent = foe.place; $("enemy-name").textContent = foe.title;
    $("enemy-meter-label").textContent = b.id === "thor" ? "架势" : "外壳";
    $("furnace-art").hidden = b.id !== "furnace"; $("round-number").textContent = `第 ${b.round} 回合`;
    meter("armor", b.armor, foe.armor); meter("health", b.health, b.maxHealth);
    $("spirit-value").textContent = b.spirit; $("spirit-max").textContent = b.maxSpirit;
    $("announcement").dataset.tone = b.outcome || (info.warning ? "warning" : "neutral");
    $("announcement-label").textContent = won ? "胜利" : lost ? "战败" : info.label;
    $("announcement-title").textContent = won ? foe.victory : lost ? "灭霸先躺为敬" : info.title;
    $("announcement-description").textContent = won ? World.victoryReport(b.id, b.thorReward) : lost ? "可立即重试，或回到地图继续游历。" : info.hint;
    $("duel-details").hidden = !b.duel;
    if (b.duel) {
      const hero = Encounters.attributes(state);
      $("duel-attributes").textContent = `灭霸　攻击 ${hero.attack} · 防御 ${hero.defense} · 身法 ${hero.speed}\n托尔　攻击 ${foe.attack} · 防御 ${foe.defense} · 身法 ${foe.speed}`;
    }
    const latest = b.turns[0];
    $("duel-result").hidden = !b.duel || !latest.round;
    $("duel-result").textContent = b.duel && latest.round ? `第 ${latest.round} 回合　${latest.text}` : "";
    let options = Encounters.commands(b, state);
    if (lost) options = [{ id: "retry", name: "重试战斗", desc: "体力与灵力恢复，重新读招。" }];
    if (b.outcome) options.push({ id: "leave", name: "回到山河图", desc: won && (foe.prize || b.thorReward) ? "掉落已收入背包，回到山河图后可装备。" : "回去可在背包换装，再次挑战。" });
    $("commands").replaceChildren(...options.map((a,i) => {
      const button = actionButton(a, i === 0);
      if (a.priority !== undefined) button.prepend(el("span", `优先度 ${a.priority > 0 ? "+" : ""}${a.priority}`, "move-priority"));
      return button;
    }));
    $("history-list").replaceChildren(...b.turns.map(x => {
      const li = el("li"); li.append(el("strong", x.round ? `第 ${x.round} 回合` : "开战"), el("p", x.text)); return li;
    }));
  }
  function render() {
    cancelCrossing();
    stopPlayback();
    $("game-binding").hidden = !activeSlot;
    $("battle-view").hidden = !activeSlot || !state.battle;
    $("atlas-view").hidden = !activeSlot || !!state.battle;
    if (!activeSlot) return;
    if (state.battle) renderBattle(); else renderAtlas();
  }
  function cancelCrossing() {
    if (!crossing) return;
    crossing.cancel();
    crossing = null;
    document.body.removeAttribute("data-crossing");
  }
  // The action is saved before its visual transition. Loading another tab's
  // save cancels the animation and renders the authoritative state immediately.
  function transition(node, frames, duration, finish) {
    if (reducedMotion.matches || !node.getClientRects().length) { finish(); return; }
    const anim = node.animate(frames, { duration, easing: "ease-in-out", fill: "both" });
    crossing = anim;
    document.body.setAttribute("data-crossing", "");
    anim.onfinish = () => {
      if (crossing !== anim) return;
      cancelCrossing();
      if (!checkForNewerSave()) finish();
    };
  }
  function enterScene(node) {
    if (!reducedMotion.matches) node.animate([{ opacity: .25 }, { opacity: 1 }], { duration: 170 });
  }
  function focusAction(container, id, fallback) {
    const btn = [...$(container).querySelectorAll("button")].find(b => b.dataset.action === id && !b.disabled);
    (btn || $(fallback)).focus({ preventScroll: true });
  }
  const storyDialog = $("story-dialog");
  const storyPortraits = {
    stark: "art/characters/stark-mj.webp",
    elder: "art/characters/elder-mj.webp",
  };
  let story = null;
  const isRainChoice = order => order.id === "chooseLock" || order.id === "chooseSeed";
  function renderStory() {
    const line = story.lines[story.index];
    const hero = line.speaker === "thanos";
    const decision = story.index === story.lines.length - 1;
    const face = line.smile ? "laugh" : "stern";
    $("story-hero-photo").src = `art/characters/thanos-campus-${face}.png`;
    $("story-partner-photo").src = storyPortraits[line.partner];
    $("story-hero").dataset.speaking = String(hero);
    $("story-partner").dataset.speaking = String(!hero);
    $("story-partner-name").textContent = World.people[line.partner].name;
    $("story-speaker").textContent = hero ? "灭霸" : World.people[line.speaker].name;
    $("story-text").textContent = line.text;
    $("story-prev").hidden = story.index === 0;
    $("story-next").hidden = decision;
    $("story-choices").hidden = !decision;
  }
  function openShelter() {
    const preview = structuredClone(state);
    if (FirstRain.stage(preview) === "ready" && !World.act(preview, "readRain")) return;
    const choices = World.orders(preview).filter(isRainChoice);
    if (!choices.length) return;
    story = { lines: FirstRain.shelterLines(preview), index: 0 };
    $("story-choices").replaceChildren(...choices.map(choice => actionButton(choice)));
    renderStory();
    storyDialog.showModal();
    $("story-title").focus({ preventScroll: true });
  }
  $("story-next").addEventListener("click", () => {
    if (!story || story.index >= story.lines.length - 1) return;
    story.index++;
    renderStory();
    if (!$("story-choices").hidden) $("story-choices").firstElementChild.focus();
  });
  $("story-prev").addEventListener("click", () => {
    if (!story || story.index === 0) return;
    story.index--;
    renderStory();
    if ($("story-prev").hidden) $("story-next").focus();
  });
  $("story-close").addEventListener("click", () => storyDialog.close());
  storyDialog.addEventListener("close", () => {
    if (!storyDialog.open) story = null;
  });
  $("story-choices").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || !storyDialog.open || !story || $("story-choices").hidden || checkForNewerSave()) return;
    const next = structuredClone(state);
    if (FirstRain.stage(next) === "ready" && !World.act(next, "readRain")) return;
    if (!World.act(next, button.dataset.action)) return;
    state = next;
    storyDialog.close();
    save(); render();
    $("latest").focus({ preventScroll: true });
    announce($("latest").textContent);
  });
  function selectPlace(id) {
    if (crossing) return;
    selected = id; renderAtlas();
    $("local-sheet").scrollTop = 0;
    if (!reducedMotion.matches) $("local-sheet").animate([{ opacity: .72 }, { opacity: 1 }], { duration: 150 });
    if (matchMedia("(max-width: 48rem)").matches) {
      $("place-name").focus({ preventScroll: true });
      $("local-sheet").scrollIntoView({ block: "start" });
    }
    announce(`${World.places[id].name}。${$("place-context").textContent}。${$("visitors").textContent}`);
  }
  for (const [id, place] of Object.entries(World.places)) {
    const pin = el("button", undefined, "pin");
    pin.type = "button"; pin.dataset.place = id;
    pin.style.left = place.x + "%"; pin.style.top = place.y + "%";
    pin.append(el("span", place.name));
    pin.addEventListener("click", () => selectPlace(id));
    $("atlas-map").append(pin);
  }
  $("local-actions").addEventListener("click", e => {
    const button = e.target.closest("button"); if (!button || crossing || checkForNewerSave()) return;
    const id = button.dataset.action;
    if (id === "readRain") { openShelter(); return; }
    if (id === "cancel") { selectPlace(state.place); return; }
    const before = state.deed;
    if (!(id === "travel" ? World.travel(state, selected) : World.act(state, id))) return;
    selected = state.place; save();
    function arrive() {
      render();
      if (state.battle) {
        enterScene($("battle-view"));
        $("case-title").focus(); announce($("case-premise").textContent); return;
      }
      if (before === "pending" && state.deed === "taken") $("latest").textContent += " 第五天已交割，买家接管了灭家的田。";
      if (id === "travel") $("local-sheet").scrollTop = 0;
      enterScene($("latest"));
      announce($("latest").textContent); focusAction("local-actions", id, "latest");
    }
    if (id === "travel") {
      const marker = $("traveler"), dest = World.places[selected];
      transition(marker, [{ left: marker.style.left, top: marker.style.top }, { left: dest.x + "%", top: dest.y + "%" }], 320, arrive);
    } else if (state.battle) transition($("atlas-view"), [{ opacity: 1 }, { opacity: .2 }], 145, arrive);
    else arrive();
  });
  function clearMotion() {
    const arena = $("arena-art");
    delete arena.dataset.gesture;
    delete arena.dataset.impact;
    $("battle-impact").textContent = "";
  }
  function stopPlayback() {
    if (!playback) return;
    clearTimeout(playback.timer);
    playback = null;
    $("battle").removeAttribute("data-playing");
    $("skip-battle").hidden = true;
    clearMotion();
  }
  function finishBattleAction(id) {
    const active = document.activeElement;
    const restoreFocus = !document.querySelector("dialog[open]")
      && (!playback || active === document.body || active === $("skip-battle") || $("commands").contains(active));
    render();
    if (state.battle) {
      announce(`${state.battle.turns[0].text} ${$("announcement-title").textContent}。`);
      const choice = $("commands").querySelector("button:not(:disabled)");
      const same = [...$("commands").children].find(b => b.dataset.action === id && !b.disabled);
      if (restoreFocus) (same || choice)?.focus({ preventScroll: true });
    } else { $("place-name").focus(); announce(state.journal[0].text); }
  }
  function finishPlayback() {
    if (playback && !checkForNewerSave()) finishBattleAction(playback.id);
  }
  function playRound(id, motions) {
    const arena = $("arena-art");
    const b = state.battle;
    let next = 0;
    playback = { id, timer: null };
    $("battle").setAttribute("data-playing", "");
    $("skip-battle").hidden = false;
    for (const button of $("commands").children) button.setAttribute("aria-disabled", "true");
    $("announcement-label").textContent = "交手中";
    $("announcement").dataset.tone = "neutral";

    function step() {
      clearMotion();
      const motion = motions[next++];
      if (!motion) { finishPlayback(); return; }
      const { side, cue, text, impact } = motion;
      // Reset the CSS animation even when consecutive steps use the same cue.
      void arena.offsetWidth;
      arena.dataset.gesture = cue;
      if (cue === "charge") arena.setAttribute("data-charging", "");
      if (["thunder", "blocked", "interrupted", "cool"].includes(cue)) arena.removeAttribute("data-charging");
      if (side === "foe") arena.toggleAttribute("data-resting", cue === "cool");
      $("announcement-title").textContent = side === "hero" ? "灭霸行动" : `${Encounters.foes[b.id].title}行动`;
      $("announcement-description").textContent = text;
      playback.timer = setTimeout(() => {
        if (cue === "tide" || cue === "pill") $("spirit-value").textContent = b.spirit;
        if (impact) {
          meter(impact.stat, impact.value, impact.stat === "health" ? b.maxHealth : Encounters.foes[b.id].armor);
          arena.dataset.impact = impact.amount ? impact.stat : "blocked";
          $("battle-impact").textContent = impact.amount ? `−${impact.amount.toLocaleString("zh-CN")}` : "挡住";
        } else if (cue === "blocked") {
          arena.dataset.impact = "blocked";
          $("battle-impact").textContent = "格挡";
        }
        const hold = b.id === "thor" && ["charge", "thunder", "cool"].includes(cue) ? 345 : 215;
        playback.timer = setTimeout(step, hold);
      }, 105);
    }
    step();
  }
  function battleAction(id) {
    if (crossing || checkForNewerSave() || (playback && id !== "leave")) return;
    const motions = [];
    if (!World.fight(state, id, motions)) return;
    save();
    if (id === "leave") {
      stopPlayback();
      transition($("battle-view"), [{ opacity: 1 }, { opacity: .2 }], 140, () => {
        finishBattleAction(id); enterScene($("atlas-view"));
      });
    } else if (motions.length && !reducedMotion.matches) playRound(id, motions);
    else finishBattleAction(id);
  }
  $("commands").addEventListener("click", e => { const btn = e.target.closest("button"); if (btn) battleAction(btn.dataset.action); });
  $("leave-battle").addEventListener("click", () => battleAction("leave"));
  $("skip-battle").addEventListener("click", finishPlayback);
  reducedMotion.addEventListener("change", event => {
    if (event.matches) { crossing?.finish(); finishPlayback(); }
  });

  function entry(title, note) {
    const li = el("li"); li.append(el("strong", title), el("small", note)); return li;
  }
  function ledgerButton(id, name, className = "text-button") {
    const button = el("button", name, className);
    button.type = "button";
    button.id = id;
    return button;
  }
  const bagCategories = {
    gear: { name: "装备", ids: Object.keys(Encounters.gear) },
    material: { name: "材料", ids: ["herb"] },
    consumable: { name: "丹药", ids: ["pill"] },
    evidence: { name: "凭证", ids: ["witness", "record", ...Object.keys(WaterCase.items), "returnSlip"] },
  };
  const panelTitles = { character: "人物", bag: "背包", journal: "郡中纪事" };
  const artifactName = id => id ? World.items[id][0] : "未装备";
  // Cells are in reading order in the 3 × 3 equipment atlas.
  const equipmentArt = ["shoes", "jacket", "trousers", "cap", "tallyBand", "buckle", "reedBell", "lid", "seal"];
  const gearStats = [["maxHealth", "体力上限"], ["attack", "攻击"], ["defense", "防御"], ["speed", "身法"]];
  function itemArt(id) {
    const art = el("span", undefined, "item-art");
    const cell = equipmentArt.indexOf(id);
    art.setAttribute("aria-hidden", "true");
    if (cell === -1) art.classList.add("item-art-empty");
    else art.style.backgroundPosition = `${cell % 3 * 50}% ${Math.floor(cell / 3) * 50}%`;
    return art;
  }
  const ownedItems = category => bagCategories[category].ids.filter(id => state.inventory[id] > 0);

  function effectList(effects) {
    const list = el("ul", undefined, "ledger-list technique-list");
    for (const { name, desc } of effects) list.append(entry(name, desc));
    return list;
  }
  function progressRow(label, count, goal) {
    const row = el("div", undefined, "cultivation-row");
    const caption = el("p");
    caption.append(el("span", label), el("strong", `${count} / ${goal}`));
    const progress = el("progress");
    progress.max = goal;
    progress.value = Math.min(count, goal);
    progress.setAttribute("aria-label", label);
    row.append(caption, progress);
    return row;
  }
  function renderCharacter(body) {
    const { maxHealth, maxSpirit, attack, defense, speed, technique } = Encounters.attributes(state);
    const battle = state.battle;
    const profile = el("section", undefined, "hero-dossier");
    const portrait = el("div", undefined, "dossier-portrait");
    portrait.setAttribute("aria-hidden", "true");
    portrait.append(heroTemplate.content.cloneNode(true));
    const identity = el("div", undefined, "dossier-name");
    identity.append(el("h3", "灭霸"), el("p", World.realm(state)));
    const stats = el("dl", undefined, "character-stats");
    const values = [
      [battle ? "体力" : "体力上限", battle ? `${battle.health} / ${battle.maxHealth}` : maxHealth],
      [battle ? "灵力" : "灵力上限", battle ? `${battle.spirit} / ${battle.maxSpirit}` : maxSpirit],
      ["攻击", attack], ["防御", defense], ["身法", speed], ["术法威力", technique],
    ];
    for (const [label, value] of values) {
      const stat = el("div");
      stat.append(el("dt", label), el("dd", value));
      stats.append(stat);
    }
    const cultivation = el("div", undefined, "cultivation");
    const next = World.breakthrough(state);
    const herbCount = state.inventory.herb || 0;
    if (!next) cultivation.append(el("p", `当前修为 ${state.xp} · 已达本版最高境界`, "ledger-note"));
    else {
      cultivation.append(el("h4", "突破至" + next.name), progressRow("修为", state.xp, next.xp), progressRow("引气草", herbCount, next.herbs));
      if (state.xp >= next.xp && herbCount >= next.herbs) cultivation.append(el("p", "可在地图的行动列表中突破。", "ledger-note"));
    }
    profile.append(el("p", "学宫档案", "field-label"), portrait, identity, stats, cultivation);

    const training = el("section", undefined, "character-techniques");
    const equipment = el("div", undefined, "dossier-equipment");
    const rack = el("div", undefined, "slot-rack");
    for (const [slot, name] of Object.entries(Encounters.slots)) {
      const btn = ledgerButton("slot-" + slot, undefined, "slot-entry");
      const worn = state.equipped[slot];
      btn.dataset.slot = slot;
      btn.toggleAttribute("data-worn", !!worn);
      const caption = el("span");
      caption.append(el("small", name), el("strong", worn ? artifactName(worn) : "空槽"));
      btn.append(itemArt(worn), caption);
      rack.append(btn);
    }
    equipment.append(el("h3", "随身装备"), rack);
    const { name, cooldown } = Encounters.snap;
    training.append(equipment, el("h3", "战斗招式"), effectList([
      { name: "普通攻击", desc: `攻击 + 招式威力 − 对手防御，保底为攻击的 5%。普攻威力 +0，抓到破绽再加 ${technique}。` },
      { name, desc: `可打断符咒或蓄雷。免费，出手后冷却 ${cooldown} 回合。` },
      ...(state.equipped.weapon === "lid" ? [] : [{ name: Encounters.stance.name + " · 试锤台", desc: Encounters.stance.desc }]),
      ...Encounters.artifactEffects(state.equipped.weapon, state),
    ]));
    const layout = el("div", undefined, "character-layout");
    layout.append(profile, training);
    body.append(layout);
  }
  function gearColumn(label, id, loadout) {
    const column = el("div", undefined, "gear-column");
    const heading = el("div", undefined, "gear-heading");
    const caption = el("div");
    caption.append(el("p", label, "field-label"), el("strong", artifactName(id), "gear-name"));
    heading.append(itemArt(id), caption);
    const stats = Encounters.attributes(state, loadout);
    const current = Encounters.attributes(state);
    const details = el("dl", undefined, "gear-stats");
    for (const [key, title] of gearStats) {
      const delta = stats[key] - current[key];
      const value = el("dd", stats[key].toLocaleString("zh-CN"));
      if (delta) caption.append(el("small", `${title} ${delta > 0 ? "+" : "−"}${Math.abs(delta).toLocaleString("zh-CN")}`, delta > 0 ? "gear-increase" : "gear-decrease"));
      details.append(el("dt", title), value);
    }
    column.append(heading, details);
    const effects = Encounters.artifactEffects(id, state);
    if (effects.length) column.append(effectList(effects));
    return column;
  }
  function itemNote(id) {
    if (id === "herb" && !World.breakthrough(state)) return "在青瓦镇可换 2 灵石，也能用来还火箭的人情。";
    if (id === "witness" || id === "record") {
      const active = state.deed === "pending" || state.deed === "taken";
      const next = active ? "带齐水脚收条和地册拓片，可到学宫处理田契。" : "田契争端已办结。";
      return World.items[id][1] + next;
    }
    if (state.waterCase?.outcome && Object.hasOwn(WaterCase.items, id)) return "水案已落印，留作凭证。";
    return World.items[id][1];
  }
  function renderBag(body) {
    const summary = el("div", undefined, "pack-summary");
    summary.append(el("p", `已穿戴 ${Object.values(state.equipped).filter(Boolean).length} / 6 件`), el("strong", `${state.stones} 灵石`));
    const categories = el("div", undefined, "pack-categories");
    categories.setAttribute("role", "group");
    categories.setAttribute("aria-label", "物品类别");
    for (const [id, { name }] of Object.entries(bagCategories)) {
      const button = ledgerButton(`pack-category-${id}`, undefined, "pack-category");
      button.dataset.category = id;
      button.setAttribute("aria-pressed", String(bagCategory === id));
      button.append(el("span", name), el("span", ownedItems(id).length, "pack-count"));
      categories.append(button);
    }
    body.append(summary, categories);

    let ids = ownedItems(bagCategory);
    if (bagCategory === "gear") {
      const filters = el("div", undefined, "slot-filter");
      for (const [slot, name] of Object.entries({ "": "全部", ...Encounters.slots })) {
        const btn = ledgerButton("filter-" + (slot || "all"), name, "slot-choice");
        btn.dataset.filter = slot;
        btn.setAttribute("aria-pressed", String(bagSlot === slot));
        filters.append(btn);
      }
      body.append(filters);
      if (bagSlot) ids = ids.filter(id => Encounters.gear[id].slot === bagSlot);
    }
    if (!ids.includes(bagItem)) bagItem = ids[0] ?? null;
    if (!bagItem) {
      const empty = { gear: "暂无随身装备。可找灭建国帮忙修田埂。", material: "暂无材料。可去废渠采引气草。", consumable: "暂无丹药。可去青瓦镇药摊买回气丸。", evidence: "暂无凭证。游历取得的凭证会收在这里。" };
      body.append(el("p", bagCategory === "gear" && bagSlot ? "尚未取得" + Encounters.slots[bagSlot] + "装备。" : empty[bagCategory], "pack-empty ledger-note"));
      return;
    }
    const list = el("ul", undefined, "pack-items");
    for (const id of ids) {
      const li = el("li");
      const button = ledgerButton(`pack-item-${id}`, undefined, "pack-item");
      button.dataset.item = id;
      button.setAttribute("aria-pressed", String(id === bagItem));
      button.setAttribute("aria-controls", "pack-detail");
      const label = el("div", undefined, "pack-item-label");
      label.append(el("strong", World.items[id][0]));
      if (Object.values(state.equipped).includes(id)) label.append(el("small", "已穿戴"));
      button.toggleAttribute("data-gear", bagCategory === "gear");
      if (bagCategory === "gear") button.append(itemArt(id));
      button.append(label, el("span", `×${state.inventory[id]}`, "pack-quantity"));
      li.append(button);
      list.append(li);
    }
    const detail = el("section", undefined, "pack-detail");
    detail.id = "pack-detail";
    const title = el("h3", World.items[bagItem][0]);
    title.id = "pack-item-title";
    title.tabIndex = -1;
    detail.setAttribute("aria-labelledby", title.id);
    const unit = { herb: "株", pill: "枚", returnSlip: "张" }[bagItem] || "件";
    detail.append(title, el("p", `持有 ${state.inventory[bagItem]} ${unit}`, "ledger-note"));
    if (bagCategory === "gear") {
      const slot = Encounters.gear[bagItem].slot;
      const worn = state.equipped[slot];
      const equipped = bagItem === worn;
      const preview = el("div", undefined, "gear-preview");
      detail.append(el("p", Encounters.slots[slot] + " · " + itemNote(bagItem), "pack-usage"));
      if (!equipped) preview.append(gearColumn(worn ? "待替换 · " + Encounters.slots[slot] : "当前" + Encounters.slots[slot], worn, state.equipped));
      preview.append(gearColumn(equipped ? "已穿戴" : "换装后", bagItem, { ...state.equipped, [slot]: bagItem }));
      const action = ledgerButton("pack-equip", equipped ? "卸下" : worn ? "换上" : "装备", "pack-equip");
      action.disabled = !!state.battle;
      detail.append(preview, action);
      if (state.battle) detail.append(el("p", "回到山河图后可换装。", "ledger-note"));
    } else detail.append(el("p", itemNote(bagItem), "pack-usage"));
    const layout = el("div", undefined, "pack-layout");
    layout.append(list, detail);
    body.append(layout);
  }
  function renderJournal(body) {
    body.append(el("p", `第 ${state.day} 日 · ${World.deeds[state.deed][0]} · ${World.places[state.place].name}`, "ledger-stats"),
      el("p", World.deeds[state.deed][1], "ledger-note"));
    const tasks = Quests.list(state);
    const tracked = Quests.tracked(tasks, state.trackedQuest);
    body.append(el("h3", "待办任务"));
    if (!tracked) body.append(el("p", "本郡事务均已办结。", "ledger-note"));
    for (const task of tasks.filter(t => !t.result)) {
      const card = el("section", undefined, "quest-entry");
      const active = task === tracked;
      card.append(el("strong", task.title + (active ? " · 追踪中" : "")));
      if (task.deadline) card.append(el("small", task.deadline));
      if (task.step) card.append(el("p", Quests.describe(task.step, state)));
      card.append(el("p", task.note, "ledger-note"));
      for (const option of task.alternatives || []) card.append(el("p", "也可：" + Quests.describe(option, state), "ledger-note"));
      if (!active) {
        const btn = ledgerButton("track-" + task.id, "追踪此事");
        btn.dataset.track = task.id;
        card.append(btn);
      }
      if (task.step && !state.battle) {
        const btn = ledgerButton("locate-" + task.id, "在地图定位");
        btn.dataset.locate = task.id;
        card.append(btn);
      }
      body.append(card);
    }
    const resolved = tasks.filter(t => t.result);
    if (resolved.length) {
      const list = el("ul", undefined, "ledger-list");
      for (const task of resolved) list.append(entry(task.title, task.result));
      body.append(el("h3", "已办结"), list);
    }
    const note = WaterCase.notice(state);
    if (note) body.append(el("h3", WaterCase.title), el("p", `${note.status} · ${note.date}。${note.text}`, "ledger-note"));
    const rain = FirstRain.notice(state);
    if (rain) body.append(el("h3", FirstRain.title), el("p", `${rain.status}。${rain.text}`, "ledger-note"));
    const people = el("ul", undefined, "ledger-list");
    for (const [id, p] of Object.entries(World.people)) {
      const today = World.places[World.locationOf(id, state.day, state)].name;
      const tomorrow = World.places[World.locationOf(id, state.day + 1, state)].name;
      people.append(entry(`${p.name} · ${p.job}`, `${World.relation(state, id)}。今日在${today}，明日在${tomorrow}。`));
    }
    const list = el("ol", undefined, "ledger-list");
    for (const line of state.journal) {
      const li = el("li"); li.append(el("strong", `第 ${line.day} 日`, "log-day"), document.createTextNode(line.text)); list.append(li);
    }
    body.append(el("h3", "人物行踪"), people, el("h3", "游历记录"), list, el("p", saveMessage, "ledger-note"));
    body.append(ledgerButton("toggle-tips", state.hideTips ? "显示新手提示" : "关闭新手提示"), ledgerButton("ledger-menu", "选择存档"));
  }
  function renderLedger() {
    const body = $("ledger-content");
    const active = body.contains(document.activeElement) ? document.activeElement.id : "";
    body.replaceChildren();
    $("ledger-title").textContent = panelTitles[panel];
    $("ledger").dataset.panel = panel;
    if (panel === "character") renderCharacter(body);
    else if (panel === "bag") renderBag(body);
    else renderJournal(body);
    if (active) {
      const replacement = $(active);
      (replacement && !replacement.disabled ? replacement : $("close-ledger")).focus({ preventScroll: true });
    }
  }
  function openLedger(kind, category, slot = "") {
    if (crossing || checkForNewerSave()) return;
    panel = kind;
    if (kind === "bag") {
      bagSlot = slot;
      bagCategory = category || Object.keys(bagCategories).find(id => ownedItems(id).length) || "gear";
      bagItem = state.equipped[bagSlot] || null;
    }
    $("ledger-feedback").textContent = "";
    renderLedger();
    const ledger = $("ledger");
    if (!ledger.open) ledger.showModal();
    ledger.scrollTop = 0;
    $("ledger-title").focus({ preventScroll: true });
  }
  $("ledger-content").addEventListener("click", e => {
    const btn = e.target.closest("button"); if (!btn) return;
    if (checkForNewerSave()) { renderLedger(); return; }
    if (btn.id === "toggle-tips") {
      state.hideTips = !state.hideTips;
      save(); renderTips(); renderLedger();
      $("save-status").textContent = saveMessage;
      return;
    }
    if (btn.id === "ledger-menu") { showMenu("slots"); return; }
    if (btn.dataset.slot) { openLedger("bag", "gear", btn.dataset.slot); return; }
    if (btn.dataset.track || btn.dataset.locate) {
      const task = Quests.list(state).find(t => t.id === (btn.dataset.track || btn.dataset.locate) && !t.result);
      if (!task) return;
      state.trackedQuest = task.id;
      save();
      if (!state.battle) renderAtlas();
      if (btn.dataset.locate && task.step && !state.battle) {
        $("ledger").close();
        locateTask(task);
      } else renderLedger();
      return;
    }
    if (btn.hasAttribute("data-filter")) {
      bagSlot = btn.dataset.filter; bagItem = state.equipped[bagSlot] || null; renderLedger(); return;
    }
    if (btn.dataset.category) {
      bagSlot = "";
      bagCategory = btn.dataset.category;
      bagItem = state.equipped[bagSlot] || null;
      renderLedger();
    } else if (btn.dataset.item) {
      bagItem = btn.dataset.item;
      renderLedger();
      if (matchMedia("(max-width: 38rem)").matches) {
        const title = $("pack-item-title");
        title.focus({ preventScroll: true });
        title.scrollIntoView({ block: "start" });
      }
    } else if (btn.id === "pack-equip" && World.equip(state, bagItem)) {
      save(); render(); renderLedger();
      $("ledger-feedback").textContent = state.journal[0].text;
    }
  });
  $("nav-character").addEventListener("click", () => openLedger("character"));
  $("explorer-card").addEventListener("click", () => openLedger("character"));
  function locateTask(task) {
    selectPlace(task.step.place);
    const id = selected !== state.place ? "travel" : task.step.day > state.day ? "wait" : task.step.action;
    focusAction("local-actions", id, "place-name");
    $("local-actions").querySelector(`[data-action="${id}"]`)?.scrollIntoView({ block: "nearest" });
  }
  $("quest-locate").addEventListener("click", () => {
    if (crossing || checkForNewerSave()) return;
    const task = Quests.tracked(Quests.list(state), state.trackedQuest);
    if (task?.step) locateTask(task);
  });
  $("atlas-dispatch").addEventListener("click", () => openLedger("journal"));
  $("nav-bag").addEventListener("click", () => openLedger("bag"));
  $("nav-journal").addEventListener("click", () => openLedger("journal"));
  $("close-ledger").addEventListener("click", () => $("ledger").close());

  const prologue = [
    {
      title: "天门闭了三十年",
      art: "art/locations/qingwa-atlas.webp",
      copy: "天门关得严，凡间的灵气却照旧往低处流。仙盟派人来青瓦郡丈量灵田，说从今往后，每一畦地、每一股水，都要在册子上对得上号。",
    },
    {
      title: "村口贴了新告示",
      art: "art/locations/village-notice.webp",
      notice: true,
      copy: "灭霸穿着校服回村，在告示上看见「无主灵田一亩，第五日交割」。田号分明是自家的。田里，灭建国正弯腰拔草，褪色的草帽一晃一晃。",
    },
  ];

  function closeDialog(id) {
    if ($(id).open) $(id).close();
  }
  function readSlot(id) {
    const entry = slots.read(id);
    return { id, ...entry, data: parseSave(entry.raw) };
  }
  function saveSummary(data) {
    return `第 ${data.day} 日 · ${World.places[data.place].name} · ${World.realm(data)}`;
  }
  function makeSlotRow(entry) {
    const { id, raw, data, persistent } = entry;
    const row = el("li", undefined, "save-row");
    const info = el("div", undefined, "save-slot-info");
    let details = data ? saveSummary(data) : raw === null ? "空槽" : "存档无法读取";
    if (data?.battle && !data.battle.outcome) details += " · 续玩从战前开始";
    if (raw !== null && !persistent) details += " · 临时存档";
    info.append(el("strong", `槽位 ${id}`), el("small", details));
    const actions = el("div", undefined, "save-slot-actions");
    if (raw === null || data) {
      const label = data ? "继续" : "新开";
      const button = ledgerButton(`slot-open-${id}`, label, data ? "start-primary" : "");
      button.dataset.openSlot = id;
      button.setAttribute("aria-label", `${label}槽位 ${id}`);
      actions.append(button);
    }
    if (raw !== null) {
      const button = ledgerButton(`slot-clear-${id}`, "清除", "slot-delete");
      button.dataset.clearSlot = id;
      button.setAttribute("aria-label", `清除槽位 ${id}的存档`);
      actions.append(button);
    }
    row.append(info, actions);
    return row;
  }
  function renderMenu(message = "") {
    const entries = SaveSlots.ids.map(readSlot);
    const last = slots.lastPlayed();
    const candidate = entries.find(entry => entry.id === last && entry.data) || entries.find(entry => entry.data);
    continueSlot = candidate?.id ?? null;
    $("start-continue").hidden = !candidate;
    if (candidate) $("start-continue").textContent = `继续游历 · 槽位 ${candidate.id}`;
    $("start-home").hidden = menuPage !== "home";
    $("start-saves").hidden = menuPage !== "slots";
    if (menuPage === "slots") {
      const focus = $("save-list").contains(document.activeElement) ? document.activeElement.id : "";
      $("save-list").replaceChildren(...entries.map(makeSlotRow));
      if (focus) ($(focus) || $("save-list-title")).focus({ preventScroll: true });
    }
    const temporary = entries.every(entry => !entry.persistent);
    $("start-feedback").textContent = message || (temporary ? "浏览器存储不可用。临时进度会随此标签页关闭或刷新而消失。" : "");
  }
  function showMenu(page = "home", message = "", focus = true) {
    activeSlot = null;
    opening = null;
    menuPage = page;
    for (const id of ["story-dialog", "ledger", "reset-dialog"]) closeDialog(id);
    $("prologue-view").hidden = true;
    $("start-view").hidden = false;
    render();
    renderMenu(message);
    window.scrollTo(0, 0);
    if (focus) $(page === "home" ? "start-title" : "save-list-title").focus({ preventScroll: true });
  }
  function beginPlay(entry) {
    const { id, data } = entry;
    const atCheckpoint = data?.battle && !data.battle.outcome;
    activeSlot = id;
    opening = null;
    load(data, entry);
    if (!data || atCheckpoint) save();
    slots.choose(id);
    $("start-view").hidden = true;
    $("prologue-view").hidden = true;
    $("water-voices").open = false;
    $("duel-details").open = false;
    $("local-sheet").scrollTop = 0;
    render();
    window.scrollTo(0, 0);
    $(state.battle ? "case-title" : "place-name").focus({ preventScroll: true });
    if (atCheckpoint) announce("已从开战前的地点续玩。");
  }
  function continuePlay(id) {
    if (!id) return;
    const entry = readSlot(id);
    if (entry.data) beginPlay(entry);
    else showMenu("slots", "所选存档已变动，请选择一个可用的槽位。");
  }
  function renderPrologue() {
    const scene = prologue[opening.page];
    $("prologue-art").src = scene.art;
    $("prologue-page").textContent = `序章 · ${opening.page + 1} / ${prologue.length}`;
    $("prologue-notice").hidden = !scene.notice;
    $("prologue-title").textContent = scene.title;
    $("prologue-copy").textContent = scene.copy;
    $("prologue-back").textContent = opening.page ? "上一幕" : "返回";
    $("prologue-next").textContent = opening.page === prologue.length - 1 ? "进入青瓦郡" : "下一幕";
    $("prologue-title").focus({ preventScroll: true });
  }
  function beginPrologue(id) {
    if (slots.read(id).raw !== null) {
      showMenu("slots", "这个槽位已有记录，请选择一个空槽。");
      return;
    }
    opening = { id, page: 0, from: menuPage };
    $("start-view").hidden = true;
    $("prologue-view").hidden = false;
    window.scrollTo(0, 0);
    renderPrologue();
  }
  function finishPrologue() {
    if (!opening) return;
    const entry = readSlot(opening.id);
    if (entry.raw !== null) showMenu("slots", "序章期间，另一页已使用这个槽位。请选择一个空槽。");
    else beginPlay(entry);
  }
  $("start-continue").addEventListener("click", () => continuePlay(continueSlot));
  $("start-new").addEventListener("click", () => {
    const empty = SaveSlots.ids.find(id => slots.read(id).raw === null);
    if (empty) beginPrologue(empty);
    else showMenu("slots", "三个槽位都有记录。要另开游历，可以先清除一个槽位。");
  });
  $("start-slots").addEventListener("click", () => showMenu("slots"));
  $("start-back").addEventListener("click", () => showMenu());
  $("nav-menu").addEventListener("click", () => {
    if (!crossing) showMenu();
  });
  $("save-list").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (button?.dataset.clearSlot) openReset(Number(button.dataset.clearSlot));
    if (button?.dataset.openSlot) {
      const id = Number(button.dataset.openSlot);
      if (slots.read(id).raw === null) beginPrologue(id);
      else continuePlay(id);
    }
  });
  $("prologue-back").addEventListener("click", () => {
    if (!opening) return;
    if (opening.page === 0) showMenu(opening.from);
    else { opening.page--; renderPrologue(); }
  });
  $("prologue-skip").addEventListener("click", finishPrologue);
  $("prologue-next").addEventListener("click", () => {
    if (!opening) return;
    if (opening.page === prologue.length - 1) finishPrologue();
    else { opening.page++; renderPrologue(); }
  });

  const resetDialog = $("reset-dialog");
  function openReset(id) {
    if (!id || crossing || resetDialog.open) return;
    if (id === activeSlot && checkForNewerSave()) return;
    const entry = readSlot(id);
    if (entry.raw === null) return;
    resetTarget = entry;
    $("reset-title").textContent = `清除槽位 ${id}？`;
    const where = entry.data ? saveSummary(entry.data) : "无法读取的存档";
    $("reset-warning").textContent = entry.persistent
      ? `${where}。确认后将删除此槽位的游历记录，包括物品、人物关系和剧情进度。此操作无法撤销。`
      : `${where}。确认后将删除此标签页里的临时进度。`;
    $("reset-error").hidden = true;
    resetDialog.showModal();
    $("reset-cancel").focus();
  }
  $("nav-clear").addEventListener("click", () => openReset(activeSlot));
  document.addEventListener("keydown", event => {
    if (!activeSlot) return;
    const shortcuts = { b: "bag", j: "journal" };
    const tab = shortcuts[event.key.toLowerCase()];
    if (tab && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.repeat && !event.isComposing
      && !event.defaultPrevented && !event.target.isContentEditable && !event.target.closest?.("input, textarea, select")
      && !resetDialog.open && !storyDialog.open && !crossing) {
      event.preventDefault();
      if ($("ledger").open && panel === tab) $("ledger").close();
      else openLedger(tab);
      return;
    }
    if (event.key !== "Delete" || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.isComposing || event.defaultPrevented) return;
    if (document.querySelector("dialog[open]") || event.target.isContentEditable || event.target.closest?.("input, textarea, select")) return;
    event.preventDefault();
    openReset(activeSlot);
  });
  $("reset-cancel").addEventListener("click", () => resetDialog.close());
  $("reset-confirm").addEventListener("click", () => {
    if (!resetDialog.open) return;
    const { id, raw, persistent } = resetTarget;
    const current = slots.read(id);
    if (current.raw !== raw || current.persistent !== persistent) {
      closeDialog("reset-dialog");
      if (activeSlot) checkForNewerSave();
      else renderMenu("这个槽位已在另一页更新，请重新确认。");
      return;
    }
    try { slots.clear(id); }
    catch {
      $("reset-error").textContent = "浏览器未能清除存档。请重试或选择保留存档。";
      $("reset-error").hidden = false;
      return;
    }
    showMenu("slots", `已清除槽位 ${id}的${persistent ? "" : "临时"}存档。`);
  });
  $("start-version").textContent = $("game-version").textContent;
  showMenu("home", "", false);
})();
