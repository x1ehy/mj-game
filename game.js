"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const saveKey = "mj-game.qingwa.v1";
  let state = World.fresh();
  let selected = state.place;
  let panel = "";
  let lastSave = null;
  let preserveSave = false;
  let saveMessage = "";

  const isCount = n => Number.isSafeInteger(n) && n >= 0;
  function validSave(s) {
    if (!s || ![1, 2].includes(s.version) || !Object.hasOwn(World.places, s.place) || !Object.hasOwn(World.deeds, s.deed)) return false;
    if (![s.day, s.stones, s.xp].every(isCount) || s.day < 1 || !s.inventory || !s.cleared) return false;
    if (!["trained", "debt", "introduced", "lesson", "broker"].every(key => typeof s[key] === "boolean")) return false;
    if (!Object.entries(s.inventory).every(([id, n]) => Object.hasOwn(World.items, id) && isCount(n))) return false;
    if (![null, "lid", "seal"].includes(s.equipped) || (s.equipped && !s.inventory[s.equipped])) return false;
    if (!["furnace", "sluice"].every(key => typeof s.cleared[key] === "boolean")) return false;
    if (s.version === 2 && !WaterCase.valid(s)) return false;
    if (!Array.isArray(s.journal) || !s.journal.length || !s.journal.every(x => x && isCount(x.day) && typeof x.text === "string")) return false;
    const b = s.battle;
    if (b === null) return true;
    return b && Object.hasOwn(Encounters.foes, b.id) && [b.round, b.health, b.maxHealth, b.spirit, b.maxSpirit, b.armor].every(isCount)
      && (b.snapReadyAt === undefined || isCount(b.snapReadyAt))
      && [b.sweepNext, b.counterReady].every(flag => flag === undefined || typeof flag === "boolean")
      && b.round > 0 && [5, 7].includes(b.maxHealth) && [2, 3].includes(b.maxSpirit)
      && b.health <= b.maxHealth && b.spirit <= b.maxSpirit && b.armor <= Encounters.foes[b.id].armor
      && [null, "victory", "defeat"].includes(b.outcome) && Array.isArray(b.turns) && b.turns.length
      && b.turns.every(x => x && isCount(x.round) && typeof x.text === "string");
  }
  function load(raw) {
    lastSave = raw;
    preserveSave = false;
    try {
      const next = raw === null ? World.fresh() : JSON.parse(raw);
      if (!validSave(next)) throw new Error("save");
      state = World.upgradeSave(next);
      saveMessage = raw === null ? "行动后自动存档" : "已存入本机";
    } catch {
      state = World.fresh();
      preserveSave = true;
      saveMessage = "旧存档无法读取。本次可临时游玩，在纪事中另开新局可恢复保存。";
    }
    selected = state.place;
  }
  try { load(localStorage.getItem(saveKey)); }
  catch { saveMessage = "浏览器暂时无法存档，本次可继续游玩。"; }
  function save() {
    if (preserveSave) return;
    try {
      const raw = JSON.stringify(state);
      localStorage.setItem(saveKey, raw);
      lastSave = raw; saveMessage = "已存入本机";
    } catch { saveMessage = "浏览器暂时无法存档，本次可继续游玩。"; }
  }
  function checkForNewerSave() {
    try {
      const raw = localStorage.getItem(saveKey);
      if (raw !== lastSave) {
        if ($("reset-dialog").open) $("reset-dialog").close();
        load(raw); render(); announce("另一页已更新存档，请按当前局势重新选择。"); return true;
      }
    } catch { /* Memory-only play is still available. */ }
    return false;
  }
  window.addEventListener("storage", event => {
    if ((event.key === saveKey || event.key === null) && checkForNewerSave() && $("ledger").open) renderLedger();
  });
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function announce(text) { $("update").textContent = text; }
  function actionButton(option, primary = false) {
    const btn = el("button", undefined, primary ? "command command-primary" : "command");
    btn.type = "button"; btn.dataset.action = option.id; btn.disabled = !!option.disabled;
    btn.append(el("span", option.name, "command-name"), el("span", option.desc, "command-description"));
    return btn;
  }
  function renderWaterCase(here) {
    const note = WaterCase.notice(state);
    $("water-notice").hidden = !note;
    if (note) {
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
  }
  function renderAtlas() {
    const here = selected === state.place;
    const place = World.places[selected];
    const preview = here ? state : structuredClone(state);
    if (!here) World.travel(preview, selected);
    const visitDay = preview.day;
    const visitors = Object.entries(World.people).filter(([id]) => World.locationOf(id, visitDay, preview) === selected);
    $("day").textContent = `第 ${state.day} 日`;
    $("map-position").textContent = `灭霸在${World.places[state.place].name}`;
    document.querySelectorAll("[data-place]").forEach(pin => {
      const id = pin.dataset.place;
      pin.dataset.current = String(id === state.place);
      pin.setAttribute("aria-pressed", String(id === selected));
      pin.setAttribute("aria-label", `${World.places[id].name}${id === state.place ? "，灭霸当前所在" : "，查看行程"}`);
    });
    const [label, desc] = World.deeds[state.deed];
    $("world-premise").textContent = state.deed === "pending" ? "天门闭了三十年。仙盟重划灵脉，灭家的田要在第五日交割。" : "天门闭了三十年。学宫收着全郡的地册，青瓦河养着两岸的人家。";
    $("deed-state").textContent = state.deed === "pending" ? `距交割 ${World.boundary - state.day} 日` : label;
    $("deed-copy").textContent = desc;
    renderWaterCase(here);
    $("place-context").textContent = here ? "灭霸所在" : `行程预览 · 第 ${visitDay} 日抵达`;
    $("place-name").textContent = place.name;
    $("place-tag").textContent = place.tag;
    $("place-lore").textContent = World.describe(preview, selected);
    $("visitors").textContent = `${here ? "今日在场" : "抵达时在场"}　${visitors.map(([,p]) => p.name).join("、") || "暂无熟人"}`;
    const [latest, previous] = state.journal;
    const dispatch = previous?.kind === "water" && previous.day === latest.day ? " " + previous.text : "";
    $("latest").textContent = here ? latest.text + dispatch : "";
    const travelNotes = [`赶路 1 日，第 ${visitDay} 日抵达。`];
    if (preview.deed !== state.deed) travelNotes.push("抵达时灵田将完成交割。");
    if (preview.waterCase?.outcome !== state.waterCase?.outcome) travelNotes.push("抵达时水案已落印，火箭将按茬收水票。");
    const actions = here ? World.orders(state) : [
      { id: "travel", name: `动身去${place.name}`, desc: travelNotes.join("") },
      { id: "cancel", name: "留在原地", desc: `回到${World.places[state.place].name}，不耗时。` },
    ];
    const first = actions.find(a => !a.disabled);
    $("local-actions").replaceChildren(...actions.map(a => actionButton(a, a === first)));
    $("identity").textContent = `灭霸　·　${World.realm(state)}　·　${state.stones} 灵石`;
    $("save-status").textContent = saveMessage;
  }
  function meter(stat, value, max) {
    $(stat + "-value").textContent = value; $(stat + "-max").textContent = max;
    $(stat + "-meter").replaceChildren(...Array.from({ length: max }, (_, i) => el("span", undefined, i < value ? "filled" : "")));
  }
  function renderBattle() {
    const b = state.battle, foe = Encounters.foes[b.id], move = Encounters.intent(b);
    const won = b.outcome === "victory", lost = b.outcome === "defeat";
    $("case-title").textContent = foe.caseTitle; $("case-premise").textContent = foe.intro;
    $("arena-art").dataset.foe = b.id; $("arena-art").dataset.effect = b.effect;
    $("battle-place").textContent = foe.place; $("enemy-name").textContent = foe.title;
    $("enemy-meter-label").textContent = b.id === "thor" ? "架势" : "外壳";
    $("furnace-art").hidden = b.id !== "furnace"; $("round-number").textContent = `第 ${b.round} 回合`;
    meter("armor", b.armor, foe.armor); meter("health", b.health, b.maxHealth); meter("spirit", b.spirit, b.maxSpirit);
    $("announcement").dataset.tone = b.outcome || (move.damage ? "warning" : "neutral");
    $("announcement-label").textContent = won ? "胜利" : lost ? "战败" : "敌方预告";
    $("announcement-title").textContent = won ? foe.victory : lost ? "灭霸先躺为敬" : move.title;
    $("announcement-description").textContent = won ? World.victoryReport(b.id) : lost ? "可立即重试，或回到地图继续游历。" : move.hint;
    let options = Encounters.commands(b, state);
    if (lost) options = [{ id: "retry", name: "重试战斗", desc: "体力与灵力恢复，重新读招。" }];
    if (b.outcome) options.push({ id: "leave", name: "回到山河图", desc: won && foe.prize ? "掉落已收入行囊，可随时装备。" : "可在行囊换装，再次挑战。" });
    $("commands").replaceChildren(...options.map((a,i) => actionButton(a,i === 0)));
    $("history-list").replaceChildren(...b.turns.map(x => {
      const li = el("li"); li.append(el("strong", x.round ? `第 ${x.round} 回合` : "开战"), el("p", x.text)); return li;
    }));
  }
  function render() {
    $("battle-view").hidden = !state.battle; $("atlas-view").hidden = !!state.battle;
    if (state.battle) renderBattle(); else renderAtlas();
  }
  function focusAction(container, id, fallback) {
    const btn = [...$(container).querySelectorAll("button")].find(b => b.dataset.action === id && !b.disabled);
    (btn || $(fallback)).focus({ preventScroll: true });
  }
  function selectPlace(id) {
    selected = id; renderAtlas();
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
    const button = e.target.closest("button"); if (!button || checkForNewerSave()) return;
    const id = button.dataset.action;
    if (id === "cancel") { selectPlace(state.place); return; }
    const before = state.deed;
    if (!(id === "travel" ? World.travel(state, selected) : World.act(state, id))) return;
    selected = state.place; save(); render();
    if (state.battle) {
      $("case-title").focus(); announce($("case-premise").textContent); return;
    }
    const deadline = before === "pending" && state.deed === "taken";
    if (deadline) $("latest").textContent += " 第五天已交割，买家接管了灭家的田。";
    announce($("latest").textContent); focusAction("local-actions", id, "latest");
  });
  function battleAction(id) {
    if (checkForNewerSave() || !World.fight(state, id)) return;
    save(); render();
    if (state.battle) {
      announce(`${state.battle.turns[0].text} ${$("announcement-title").textContent}。`);
      const choice = $("commands").querySelector("button:not(:disabled)");
      const same = [...$("commands").children].find(b => b.dataset.action === id && !b.disabled);
      (same || choice)?.focus({ preventScroll: true });
    } else { $("place-name").focus(); announce(state.journal[0].text); }
  }
  $("commands").addEventListener("click", e => { const btn = e.target.closest("button"); if (btn) battleAction(btn.dataset.action); });
  $("leave-battle").addEventListener("click", () => battleAction("leave"));

  function entry(title, note) {
    const li = el("li"); li.append(el("strong", title), el("small", note)); return li;
  }
  function textButton(id, name) {
    const b = el("button", name, "text-button"); b.type = "button"; b.dataset.ledger = id; return b;
  }
  function renderLedger() {
    const body = $("ledger-content");
    body.replaceChildren();
    $("ledger-title").textContent = panel === "bag" ? "人物行囊" : "郡中纪事";
    if (panel === "bag") {
      body.append(el("p", `灭霸　·　${World.realm(state)}　·　${state.stones} 灵石`, "ledger-stats"),
        el("p", state.trained ? "炼气中期，战斗体力 7、灵力 3，普通攻击威力 2。" : `修为 ${state.xp}。集齐 4 点修为和 1 株引气草，可突破至炼气中期。`, "ledger-note"),
        el("h3", "随身物件"));
      const list = el("ul", undefined, "ledger-list");
      for (const [id, [name, desc]] of Object.entries(World.items)) {
        const n = state.inventory[id]; if (!n) continue;
        const li = entry(`${name} × ${n}${state.equipped === id ? " · 已装备" : ""}`, desc);
        if (id === "seal" || id === "lid") {
          const b = textButton(id, state.battle ? "交手结束后可换装" : state.equipped === id ? "收起法器" : "装备此物");
          b.disabled = !!state.battle; li.append(b);
        }
        list.append(li);
      }
      if (!list.children.length) list.append(el("li", "布囊里只有几枚灵石。取得的凭证、草药和法器会放在这里。", "ledger-note"));
      body.append(list, el("h3", "人物行踪"));
      const people = el("ul", undefined, "ledger-list");
      for (const [id, p] of Object.entries(World.people)) {
        const today = World.places[World.locationOf(id, state.day, state)].name;
        const tomorrow = World.places[World.locationOf(id, state.day+1, state)].name;
        people.append(entry(`${p.name} · ${p.job}`, `${World.relation(state,id)}。今日在${today}，明日在${tomorrow}。`));
      }
      body.append(people); return;
    }
    body.append(el("p", `第 ${state.day} 日 · ${World.deeds[state.deed][0]} · ${World.places[state.place].name}`, "ledger-stats"),
      el("p", World.deeds[state.deed][1], "ledger-note"));
    const note = WaterCase.notice(state);
    if (note) body.append(el("h3", WaterCase.title), el("p", `${note.status} · ${note.date}。${note.text}`, "ledger-note"));
    const list = el("ol", undefined, "ledger-list");
    for (const line of state.journal) {
      const li = el("li"); li.append(el("strong", `第 ${line.day} 日`, "log-day"), document.createTextNode(line.text)); list.append(li);
    }
    body.append(list, el("p", saveMessage, "ledger-note"));
    body.append(textButton("ask-reset", "另开新局"));
  }
  function openLedger(kind) {
    panel = kind; renderLedger(); $("ledger").showModal(); $("ledger").scrollTop = 0;
  }
  $("ledger-content").addEventListener("click", e => {
    const btn = e.target.closest("[data-ledger]"); if (!btn) return;
    const id = btn.dataset.ledger;
    if (checkForNewerSave()) { renderLedger(); return; }
    if (id === "ask-reset") { openReset("restart"); return; }
    if (World.equip(state, id)) {
      save(); render(); renderLedger();
      $("ledger-content").querySelector(`[data-ledger="${id}"]`)?.focus({ preventScroll: true });
      announce(state.journal[0].text);
    }
  });
  $("nav-bag").addEventListener("click", () => openLedger("bag"));
  $("nav-journal").addEventListener("click", () => openLedger("journal"));
  $("close-ledger").addEventListener("click", () => $("ledger").close());
  const resetDialog = $("reset-dialog");
  function openReset(mode) {
    if (resetDialog.open) return;
    checkForNewerSave();
    resetDialog.dataset.mode = mode;
    const restart = mode === "restart";
    $("reset-title").textContent = restart ? "覆盖存档，另开新局？" : "清除当前存档？";
    const where = preserveSave ? "此浏览器中的旧存档" : `第 ${state.day} 日 · ${World.places[state.place].name}的游历记录`;
    $("reset-warning").textContent = `${where}将被${restart ? "覆盖" : "删除"}，包括物品、人物关系和战斗进度。此操作无法撤销。确认后将回到灭家村第一天。`;
    $("reset-confirm").textContent = restart ? "确认重开" : "确认清除";
    $("reset-error").hidden = true;
    resetDialog.showModal();
    $("reset-cancel").focus();
  }
  $("nav-clear").addEventListener("click", () => openReset("clear"));
  document.addEventListener("keydown", event => {
    if (event.key !== "Delete" || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.isComposing || event.defaultPrevented) return;
    if (document.querySelector("dialog[open]") || event.target.isContentEditable || event.target.closest?.("input, textarea, select")) return;
    event.preventDefault();
    openReset("clear");
  });
  $("reset-cancel").addEventListener("click", () => resetDialog.close());
  $("reset-confirm").addEventListener("click", () => {
    if (!resetDialog.open || checkForNewerSave()) return;
    const restart = resetDialog.dataset.mode === "restart";
    if (!restart) {
      try { localStorage.removeItem(saveKey); }
      catch {
        $("reset-error").textContent = "浏览器未能清除存档。请重试或选择保留存档。";
        $("reset-error").hidden = false;
        return;
      }
    }
    load(null);
    if (restart) save();
    resetDialog.close();
    if ($("ledger").open) $("ledger").close();
    render();
    $("place-name").focus();
    announce(restart ? "已另开新局。" : "当前存档已清除，已回到灭家村第一天。");
  });
  render();
})();
