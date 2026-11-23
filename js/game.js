(function () {
  const STRINGS = window.SO_STRINGS;
  const STORY = window.SO_STORY;
  const LANGS = ["tr", "en", "es", "ar", "fr", "de", "pt", "ru", "zh", "hi", "id", "ja", "ko", "it"];
  const LANG_LABEL = {
    tr: "Türkçe",
    en: "English",
    es: "Español",
    ar: "العربية",
    fr: "Français",
    de: "Deutsch",
    pt: "Português",
    ru: "Русский",
    zh: "中文",
    hi: "हिन्दी",
    id: "Indonesia",
    ja: "日本語",
    ko: "한국어",
    it: "Italiano",
  };
  const RTL_LANGS = ["ar", "ur", "fa"];
  const STORAGE_LANG = "so_lang";
  const STORAGE_PICKED = "so_lang_picked";
  const STORAGE_ADFREE = "so_adfree";
  const ADFREE_PRICE = "99,90 TL";

  const DEFAULT_METERS = {
    mustafaFavor: 28,
    courtSuspicion: 28,
    janissaryLoyalty: 24,
  };

  const DEFAULT_FLAGS = {
    letterProof: false,
    earlyRevolt: false,
    ulemaAlly: false,
    warnedMustafa: false,
    suleymanTrust: false,
    rustemExposed: false,
    hintUsed: false,
    bitterReign: false,
    successionReform: false,
    successionKept: false,
    successionSoft: false,
    janissaryReform: false,
    janissaryBribe: false,
    janissaryCrush: false,
    timarReform: false,
    taxHarsh: false,
    bureaucracyMerit: false,
    europeBalance: false,
    europeWar: false,
    europeTrade: false,
    safavidPeace: false,
    safavidWar: false,
    techLeap: false,
  };

  const state = {
    lang: "tr",
    langPicked: false,
    nodeId: null,
    meters: { ...DEFAULT_METERS },
    flags: { ...DEFAULT_FLAGS },
    checkpoint: null,
    hintRevealed: false,
    adFree: false,
  };

  const el = {
    title: document.getElementById("screen-title"),
    play: document.getElementById("screen-play"),
    end: document.getElementById("screen-end"),
    btnStart: document.getElementById("btn-start"),
    btnLangPlay: document.getElementById("btn-lang-play"),
    btnHint: document.getElementById("btn-hint"),
    btnPause: document.getElementById("btn-pause"),
    langGateStatus: document.getElementById("lang-gate-status"),
    langModal: document.getElementById("lang-modal"),
    btnLangClose: document.getElementById("btn-lang-close"),
    pauseModal: document.getElementById("pause-modal"),
    btnResume: document.getElementById("btn-resume"),
    btnRestartPause: document.getElementById("btn-restart-pause"),
    btnPauseLang: document.getElementById("btn-pause-lang"),
    iapCardTitle: document.getElementById("iap-card-title"),
    iapCardPause: document.getElementById("iap-card-pause"),
    btnIapTitle: document.getElementById("btn-iap-title"),
    btnIapPause: document.getElementById("btn-iap-pause"),
    chapterChip: document.getElementById("chapter-chip"),
    goalText: document.getElementById("goal-text"),
    scene: document.getElementById("scene"),
    sceneStill: document.getElementById("scene-still"),
    sceneStillImg: document.getElementById("scene-still-img"),
    sceneTitle: document.getElementById("scene-title"),
    sceneBody: document.getElementById("scene-body"),
    hintPanel: document.getElementById("hint-panel"),
    choices: document.getElementById("choices"),
    endKicker: document.getElementById("end-kicker"),
    endTitle: document.getElementById("end-title"),
    endBody: document.getElementById("end-body"),
    endActions: document.getElementById("end-actions"),
    endCard: document.querySelector(".end-card"),
    adModal: document.getElementById("ad-modal"),
    adKicker: document.getElementById("ad-kicker"),
    adTitle: document.getElementById("ad-title"),
    adBody: document.getElementById("ad-body"),
    btnWatchAd: document.getElementById("btn-watch-ad"),
    btnGiveUp: document.getElementById("btn-give-up"),
    adSim: document.getElementById("ad-sim"),
    adSimFill: document.getElementById("ad-sim-fill"),
    adSimLabel: document.getElementById("ad-sim-label"),
    fills: {
      mustafaFavor: document.getElementById("fill-mustafaFavor"),
      courtSuspicion: document.getElementById("fill-courtSuspicion"),
      janissaryLoyalty: document.getElementById("fill-janissaryLoyalty"),
    },
  };

  let adTimer = null;
  let adPhase = "idle"; // idle | watching | ready
  let adMode = "retry"; // retry | hint | restart

  function t(key) {
    const pack = STRINGS[state.lang] || STRINGS.tr;
    const v = pack[key] ?? STRINGS.tr[key] ?? key;
    return v == null ? key : v;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function applyDir() {
    const rtl = RTL_LANGS.includes(state.lang);
    document.documentElement.lang = state.lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.body.dir = rtl ? "rtl" : "ltr";
  }

  function buildLangButtons() {
    const grids = [
      document.getElementById("lang-grid-title"),
      document.getElementById("lang-grid-modal"),
    ].filter(Boolean);
    grids.forEach((grid) => {
      grid.innerHTML = "";
      LANGS.forEach((lang) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--lang";
        btn.setAttribute("data-lang", lang);
        btn.setAttribute("aria-pressed", "false");
        btn.textContent = LANG_LABEL[lang] || lang;
        btn.addEventListener("click", () => {
          setLang(lang, true);
          refreshAfterLangChange();
        });
        grid.appendChild(btn);
      });
    });
  }

  function persistLang() {
    try {
      localStorage.setItem(STORAGE_LANG, state.lang);
      localStorage.setItem(STORAGE_PICKED, state.langPicked ? "1" : "0");
    } catch (_) {}
  }

  function loadLang() {
    try {
      const saved = localStorage.getItem(STORAGE_LANG);
      const picked = localStorage.getItem(STORAGE_PICKED) === "1";
      if (saved && LANGS.includes(saved)) {
        state.lang = saved;
        state.langPicked = picked;
      }
    } catch (_) {}
  }

  function loadAdFree() {
    try {
      state.adFree = localStorage.getItem(STORAGE_ADFREE) === "1";
    } catch (_) {
      state.adFree = false;
    }
  }

  function persistAdFree() {
    try {
      localStorage.setItem(STORAGE_ADFREE, state.adFree ? "1" : "0");
    } catch (_) {}
  }

  function syncAdFreeUi() {
    const owned = !!state.adFree;
    [el.iapCardTitle, el.iapCardPause].forEach((card) => {
      if (!card) return;
      card.classList.toggle("is-owned", owned);
    });
    [el.btnIapTitle, el.btnIapPause].forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle("is-owned", owned);
      btn.disabled = owned;
      btn.textContent = owned ? t("iap.adfree.owned") : t("iap.adfree.buy");
    });
    document.querySelectorAll(".iap-price").forEach((node) => {
      node.textContent = owned ? t("iap.adfree.owned") : ADFREE_PRICE;
    });
  }

  function buyAdFree() {
    if (state.adFree) return;
    const ok = window.confirm(t("iap.adfree.confirm"));
    if (!ok) return;
    state.adFree = true;
    persistAdFree();
    syncAdFreeUi();
  }

  function syncLangButtons() {
    document.querySelectorAll(".btn--lang").forEach((btn) => {
      const lang = btn.getAttribute("data-lang");
      const on = state.langPicked && lang === state.lang;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    el.btnStart.disabled = !state.langPicked;
    if (state.langPicked) {
      el.langGateStatus.hidden = false;
      el.langGateStatus.textContent = t("ui.langConfirm") + " · " + (LANG_LABEL[state.lang] || state.lang);
    } else {
      el.langGateStatus.hidden = true;
      el.langGateStatus.textContent = "";
    }
  }

  function setLang(lang, picked) {
    if (!LANGS.includes(lang)) return;
    state.lang = lang;
    if (picked) state.langPicked = true;
    persistLang();
    applyDir();
    applyI18nStatic();
    syncLangButtons();
    syncAdFreeUi();
  }

  function applyI18nStatic() {
    applyDir();
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    if (el.btnLangPlay) el.btnLangPlay.textContent = t("ui.lang");
    if (el.btnHint) el.btnHint.textContent = t("ui.hint");
    if (el.btnPause) el.btnPause.textContent = t("ui.pause");
    if (!state.langPicked && el.btnStart) {
      el.btnStart.setAttribute("aria-label", t("ui.startLocked"));
    }
    syncAdFreeUi();
  }

  function showScreen(name) {
    el.title.hidden = name !== "title";
    el.play.hidden = name !== "play";
    el.end.hidden = name !== "end";
    el.title.classList.toggle("is-active", name === "title");
    el.play.classList.toggle("is-active", name === "play");
    el.end.classList.toggle("is-active", name === "end");
  }

  function isReignChapter(chapterKey) {
    return typeof chapterKey === "string" && /^ch\.d\d$/.test(chapterKey);
  }

  function meterLabel(key, reign) {
    if (!reign) return t("meter." + key);
    if (key === "mustafaFavor") return t("meter.reignFavor");
    if (key === "courtSuspicion") return t("meter.reignUnrest");
    if (key === "janissaryLoyalty") return t("meter.reignArmy");
    return t("meter." + key);
  }

  function updateMeters(reign) {
    Object.keys(el.fills).forEach((key) => {
      const v = clamp(state.meters[key], 0, 100);
      el.fills[key].style.width = v + "%";
      const label = document.querySelector('.meter[data-meter="' + key + '"] .meter-label');
      if (label) label.textContent = meterLabel(key, !!reign);
    });
  }

  function paragraphs(text) {
    return String(text)
      .split(/\n\n+/)
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveEchoes(node) {
    if (!node || !node.echoes || !node.echoes.length) return "";
    const bits = [];
    node.echoes.forEach((echo) => {
      if (echo.ifFlag && state.flags[echo.ifFlag]) {
        const line = t(echo.key);
        if (line && line !== echo.key) bits.push(line);
      } else if (echo.ifNotFlag && !state.flags[echo.ifNotFlag]) {
        const line = t(echo.key);
        if (line && line !== echo.key) bits.push(line);
      }
    });
    return bits.length ? "\n\n" + bits.join("\n\n") : "";
  }

  function resetRun(fromCheckpoint) {
    state.hintRevealed = false;
    if (fromCheckpoint && state.checkpoint) {
      const snap = state.checkpoint;
      state.meters = { ...snap.meters };
      state.flags = { ...snap.flags };
      state.nodeId = snap.nodeId;
      return;
    }
    state.meters = { ...DEFAULT_METERS };
    state.flags = { ...DEFAULT_FLAGS };
    state.checkpoint = null;
    state.nodeId = STORY.start;
  }

  function saveCheckpoint(nodeId) {
    state.checkpoint = {
      nodeId,
      meters: { ...state.meters },
      flags: { ...state.flags },
    };
  }

  function applyEffects(effects) {
    if (!effects) return;
    Object.keys(effects).forEach((key) => {
      if (key in state.flags) {
        state.flags[key] = !!effects[key];
        return;
      }
      if (key in state.meters) {
        state.meters[key] = clamp(state.meters[key] + effects[key], 0, 100);
      }
    });
  }

  function checkFailIf(node) {
    if (!node || !node.failIf) return null;
    const f = node.failIf;
    if (typeof f.suspicionGte === "number" && state.meters.courtSuspicion >= f.suspicionGte) {
      return f.next || "fail_denounced";
    }
    if (f.flag && state.flags[f.flag]) {
      return f.next || "fail_revolt_end";
    }
    if (typeof f.loyaltyLte === "number" && state.meters.janissaryLoyalty <= f.loyaltyLte) {
      return f.next || "fail_ocak";
    }
    return null;
  }

  function renderNode() {
    const node = STORY.nodes[state.nodeId];
    if (!node) return;

    if (node.checkpoint) {
      saveCheckpoint(state.nodeId);
    }

    const failNext = checkFailIf(node);
    if (failNext && failNext !== state.nodeId) {
      state.nodeId = failNext;
      renderNode();
      return;
    }

    if (node.ending) {
      showEnding(node.ending);
      return;
    }

    showScreen("play");
    updateMeters(isReignChapter(node.chapter));
    applyI18nStatic();
    if (isReignChapter(node.chapter)) updateMeters(true);
    state.hintRevealed = false;

    el.chapterChip.textContent = t(node.chapter);
    el.goalText.textContent = node.goal ? t(node.goal) : t("goal.survive");
    el.sceneTitle.textContent = t(node.title);

    if (node.image) {
      el.sceneStill.hidden = false;
      el.sceneStillImg.src = node.image;
      el.sceneStillImg.alt = t(node.title);
    } else {
      el.sceneStill.hidden = true;
      el.sceneStillImg.removeAttribute("src");
    }

    let bodyHtml = "";
    if (node.checkpoint) {
      bodyHtml += `<span class="checkpoint-badge">${escapeHtml(t("checkpoint.badge"))}</span>`;
    }
    const bodyText = t(node.body) + resolveEchoes(node);
    bodyHtml += paragraphs(bodyText);
    el.sceneBody.innerHTML = bodyHtml;

    el.hintPanel.hidden = true;
    el.hintPanel.textContent = "";

    const hasHint = !!node.hint;
    el.btnHint.hidden = !hasHint;
    el.btnHint.disabled = false;

    el.scene.classList.remove("is-refresh");
    void el.scene.offsetWidth;
    el.scene.classList.add("is-refresh");

    el.choices.innerHTML = "";
    (node.choices || []).forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--choice";
      btn.textContent = t(choice.text);
      btn.addEventListener("click", () => onChoice(choice));
      el.choices.appendChild(btn);
    });
  }

  function onChoice(choice) {
    if (choice.ending) {
      showEnding(choice.ending);
      return;
    }

    let effects = choice.effects;
    let next = choice.next;

    if (choice.require) {
      const ok = Object.keys(choice.require).every((key) => {
        if (key in state.flags) return !!state.flags[key] === !!choice.require[key];
        return true;
      });
      if (!ok) {
        next = choice.fallbackNext || next;
        effects = choice.fallbackEffects || effects;
      }
    }

    applyEffects(effects);

    if (choice.resolve) {
      next = STORY.resolve(choice.resolve, state);
    }

    state.nodeId = next;
    renderNode();
  }

  function endingKeys(kind) {
    if (kind === "fail") {
      return { kicker: "end.fail.kicker", title: "end.fail.title", body: "end.fail.body", lock: null };
    }
    if (kind === "bitter") {
      return {
        kicker: "end.bitter.kicker",
        title: "end.bitter.title",
        body: "end.bitter.body",
        lock: "end.bitter.lock",
      };
    }
    if (kind === "rival") {
      return { kicker: "end.rival.kicker", title: "end.rival.title", body: "end.rival.body", lock: null };
    }
    if (kind === "middle") {
      return { kicker: "end.middle.kicker", title: "end.middle.title", body: "end.middle.body", lock: null };
    }
    if (kind === "fade") {
      return { kicker: "end.fade.kicker", title: "end.fade.title", body: "end.fade.body", lock: null };
    }
    return { kicker: "end.win.kicker", title: "end.win.title", body: "end.win.body", lock: "end.win.lock" };
  }

  function appendRestartButton(container) {
    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "btn btn--ghost";
    restart.dataset.action = "restart";
    restart.textContent = t("ui.restart");
    restart.addEventListener("click", requestRestartFromBeginning);
    container.appendChild(restart);
  }

  function showEnding(kind) {
    showScreen("end");
    closePauseModal();
    applyI18nStatic();
    const keys = endingKeys(kind);
    el.endCard.classList.toggle("is-fail", kind === "fail");
    el.endCard.classList.toggle("is-bitter", kind === "bitter");
    el.endCard.classList.toggle("is-rival", kind === "rival");
    el.endCard.classList.toggle("is-middle", kind === "middle");
    el.endCard.classList.toggle("is-fade", kind === "fade");
    el.endKicker.textContent = t(keys.kicker);
    el.endTitle.textContent = t(keys.title);
    el.endBody.textContent = t(keys.body);

    el.endActions.innerHTML = "";
    if (kind === "fail") {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "btn btn--primary";
      retry.dataset.action = "retry";
      retry.textContent = state.adFree ? t("ui.continue") : t("ad.watch");
      retry.addEventListener("click", () => openAdModal("retry"));
      el.endActions.appendChild(retry);

      appendRestartButton(el.endActions);

      const give = document.createElement("button");
      give.type = "button";
      give.className = "btn btn--ghost";
      give.dataset.action = "title";
      give.textContent = t("ui.retryTitle");
      give.addEventListener("click", () => {
        closeAdModal();
        goTitle();
      });
      el.endActions.appendChild(give);
      openAdModal("retry");
    } else {
      if (keys.lock) {
        const lock = document.createElement("p");
        lock.style.margin = "0 0 1rem";
        lock.style.color = "var(--gold-soft)";
        lock.style.fontFamily = "var(--font-display)";
        lock.style.fontSize = "1.1rem";
        lock.textContent = t(keys.lock);
        el.endActions.appendChild(lock);
      }

      const again = document.createElement("button");
      again.type = "button";
      again.className = "btn btn--primary";
      again.dataset.action = "again";
      again.textContent = t("ui.playAgain");
      again.addEventListener("click", () => {
        resetRun(false);
        renderNode();
      });
      el.endActions.appendChild(again);

      appendRestartButton(el.endActions);

      const titleBtn = document.createElement("button");
      titleBtn.type = "button";
      titleBtn.className = "btn btn--ghost";
      titleBtn.dataset.action = "title";
      titleBtn.textContent = t("ui.retryTitle");
      titleBtn.addEventListener("click", goTitle);
      el.endActions.appendChild(titleBtn);
    }
  }

  function grantAdReward(mode) {
    const m = mode || adMode;
    if (m === "hint") {
      revealHint();
    } else if (m === "restart") {
      restartFromBeginning();
    } else {
      retryFromCheckpoint();
    }
  }

  function openAdModal(mode) {
    adMode = mode || "retry";
    if (state.adFree) {
      const m = adMode;
      closeAdModal();
      grantAdReward(m);
      return;
    }

    el.adModal.hidden = false;
    el.adSim.hidden = true;
    el.adSimFill.style.width = "0%";
    adPhase = "idle";
    el.btnWatchAd.disabled = false;
    el.btnWatchAd.textContent = t("ad.watch");
    if (adMode === "hint") {
      el.adKicker.textContent = t("ad.hint.kicker");
      el.adTitle.textContent = t("ad.hint.title");
      el.adBody.textContent = t("ad.hint.body");
      el.btnGiveUp.hidden = false;
      el.btnGiveUp.textContent = t("ad.hint.cancel");
    } else if (adMode === "restart") {
      el.adKicker.textContent = t("ad.restart.kicker");
      el.adTitle.textContent = t("ad.restart.title");
      el.adBody.textContent = t("ad.restart.body");
      el.btnGiveUp.hidden = false;
      el.btnGiveUp.textContent = t("ad.restart.cancel");
    } else {
      el.adKicker.textContent = t("ad.kicker");
      el.adTitle.textContent = t("ad.title");
      el.adBody.textContent = t("ad.body");
      el.btnGiveUp.hidden = false;
      el.btnGiveUp.textContent = t("ad.giveUp");
    }
  }

  function closeAdModal() {
    el.adModal.hidden = true;
    adPhase = "idle";
    adMode = "retry";
    if (adTimer) {
      clearInterval(adTimer);
      adTimer = null;
    }
  }

  function onAdPrimary() {
    if (adPhase === "watching") return;
    if (adPhase === "ready") {
      const mode = adMode;
      closeAdModal();
      grantAdReward(mode);
      return;
    }
    simulateAd();
  }

  function simulateAd() {
    adPhase = "watching";
    el.adSim.hidden = false;
    el.btnWatchAd.disabled = true;
    el.btnGiveUp.hidden = true;
    el.adSimLabel.textContent = t("ad.watching");
    el.adSimFill.style.width = "0%";

    const duration = 3000;
    const start = performance.now();

    if (adTimer) clearInterval(adTimer);
    adTimer = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / duration);
      el.adSimFill.style.width = p * 100 + "%";
      if (p >= 1) {
        clearInterval(adTimer);
        adTimer = null;
        adPhase = "ready";
        el.adSimLabel.textContent = t("ad.done");
        el.btnWatchAd.disabled = false;
        el.btnWatchAd.textContent = t("ui.continue");
      }
    }, 50);
  }

  function revealHint() {
    const node = STORY.nodes[state.nodeId];
    if (!node || !node.hint) return;
    el.hintPanel.hidden = false;
    el.hintPanel.textContent = t(node.hint);
    el.btnHint.disabled = true;
    state.flags.hintUsed = true;
    state.hintRevealed = true;
  }

  function retryFromCheckpoint() {
    if (!state.checkpoint) {
      resetRun(false);
    } else {
      resetRun(true);
    }
    renderNode();
  }

  function restartFromBeginning() {
    closeAdModal();
    closePauseModal();
    closeLangModal();
    resetRun(false);
    showScreen("title");
    applyI18nStatic();
    syncLangButtons();
    syncAdFreeUi();
  }

  function requestRestartFromBeginning() {
    closePauseModal();
    openAdModal("restart");
  }

  function goTitle() {
    closeAdModal();
    closePauseModal();
    closeLangModal();
    resetRun(false);
    showScreen("title");
    applyI18nStatic();
    syncLangButtons();
    syncAdFreeUi();
  }

  function openLangModal() {
    el.langModal.hidden = false;
    syncLangButtons();
  }

  function closeLangModal() {
    el.langModal.hidden = true;
  }

  function openPauseModal() {
    el.pauseModal.hidden = false;
    applyI18nStatic();
    syncAdFreeUi();
  }

  function closePauseModal() {
    el.pauseModal.hidden = true;
  }

  function refreshAfterLangChange() {
    applyI18nStatic();
    syncLangButtons();
    syncAdFreeUi();
    if (!el.play.hidden) {
      const keepHint = state.hintRevealed;
      renderNode();
      if (keepHint) {
        const node = STORY.nodes[state.nodeId];
        if (node && node.hint) {
          el.hintPanel.hidden = false;
          el.hintPanel.textContent = t(node.hint);
          el.btnHint.disabled = true;
          state.hintRevealed = true;
        }
      }
      return;
    }
    if (!el.end.hidden) {
      const isFail = el.endCard.classList.contains("is-fail");
      const isBitter = el.endCard.classList.contains("is-bitter");
      const isRival = el.endCard.classList.contains("is-rival");
      const isMiddle = el.endCard.classList.contains("is-middle");
      const isFade = el.endCard.classList.contains("is-fade");
      const kind = isFail ? "fail" : isBitter ? "bitter" : isRival ? "rival" : isMiddle ? "middle" : isFade ? "fade" : "win";
      const keys = endingKeys(kind);
      const modalWasOpen = !el.adModal.hidden;
      el.endKicker.textContent = t(keys.kicker);
      el.endTitle.textContent = t(keys.title);
      el.endBody.textContent = t(keys.body);
      const primary = el.endActions.querySelector(".btn--primary");
      const restartBtn = el.endActions.querySelector('[data-action="restart"]');
      const titleBtn = el.endActions.querySelector('[data-action="title"]');
      if (isFail) {
        if (primary) primary.textContent = state.adFree ? t("ui.continue") : t("ad.watch");
        if (titleBtn) titleBtn.textContent = t("ui.retryTitle");
      } else {
        const lock = el.endActions.querySelector("p");
        if (lock && keys.lock) lock.textContent = t(keys.lock);
        if (primary) primary.textContent = t("ui.playAgain");
        if (titleBtn) titleBtn.textContent = t("ui.retryTitle");
      }
      if (restartBtn) restartBtn.textContent = t("ui.restart");
      if (modalWasOpen) {
        if (adMode === "hint") {
          el.adKicker.textContent = t("ad.hint.kicker");
          el.adTitle.textContent = t("ad.hint.title");
          el.adBody.textContent = t("ad.hint.body");
          if (adPhase === "idle") el.btnGiveUp.textContent = t("ad.hint.cancel");
        } else if (adMode === "restart") {
          el.adKicker.textContent = t("ad.restart.kicker");
          el.adTitle.textContent = t("ad.restart.title");
          el.adBody.textContent = t("ad.restart.body");
          if (adPhase === "idle") el.btnGiveUp.textContent = t("ad.restart.cancel");
        } else {
          el.adKicker.textContent = t("ad.kicker");
          el.adTitle.textContent = t("ad.title");
          el.adBody.textContent = t("ad.body");
          if (adPhase === "idle") el.btnGiveUp.textContent = t("ad.giveUp");
        }
        if (adPhase === "idle") el.btnWatchAd.textContent = t("ad.watch");
        else if (adPhase === "ready") el.btnWatchAd.textContent = t("ui.continue");
        if (adPhase === "watching") el.adSimLabel.textContent = t("ad.watching");
        if (adPhase === "ready") el.adSimLabel.textContent = t("ad.done");
      }
      if (!el.pauseModal.hidden) {
        el.btnResume.textContent = t("ui.resume");
        el.btnRestartPause.textContent = t("ui.restart");
        el.btnPauseLang.textContent = t("ui.lang");
      }
    }
  }

  el.btnStart.addEventListener("click", () => {
    if (!state.langPicked) return;
    resetRun(false);
    renderNode();
  });
  el.btnLangPlay.addEventListener("click", openLangModal);
  el.btnLangClose.addEventListener("click", () => {
    closeLangModal();
    refreshAfterLangChange();
  });
  document.getElementById("lang-modal-backdrop").addEventListener("click", closeLangModal);
  el.btnPause.addEventListener("click", openPauseModal);
  el.btnResume.addEventListener("click", closePauseModal);
  document.getElementById("pause-modal-backdrop").addEventListener("click", closePauseModal);
  el.btnRestartPause.addEventListener("click", requestRestartFromBeginning);
  el.btnPauseLang.addEventListener("click", () => {
    closePauseModal();
    openLangModal();
  });
  el.btnIapTitle.addEventListener("click", buyAdFree);
  el.btnIapPause.addEventListener("click", buyAdFree);
  el.btnHint.addEventListener("click", () => {
    if (state.hintRevealed) return;
    openAdModal("hint");
  });
  el.btnWatchAd.addEventListener("click", onAdPrimary);
  el.btnGiveUp.addEventListener("click", () => {
    if (adMode === "hint" || adMode === "restart") {
      closeAdModal();
      return;
    }
    closeAdModal();
    goTitle();
  });

  buildLangButtons();
  loadLang();
  loadAdFree();
  applyI18nStatic();
  syncLangButtons();
  syncAdFreeUi();
  showScreen("title");
})();
