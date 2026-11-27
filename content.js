(() => {
  const PENDING_TASK_KEY = "grh_pending_task";
  const TASK_TTL_MS = 2 * 60 * 1000;

  const US_TAX_FREE_STATES = window.GRH_PRESETS?.US_TAX_FREE || [];
  const COUNTRY_PRESETS = window.GRH_PRESETS?.COUNTRIES || [];
  const {
    getFormRoot,
    waitFor,
    selectOptionInCombobox,
    ensureDefaultReasonIfUnchecked,
    fillCountryForm,
    readListboxOptions,
    getCurrentComboboxSelection,
  } = window.GRH_FORM_FILLER;

  function createSearchDropdown({ placeholder, comboboxIndex, onPick, onCancel }) {
    const wrapper = document.createElement("div");
    wrapper.className = "grh-search-box";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "grh-search-input";
    input.placeholder = placeholder;
    input.autocomplete = "off";

    const dropdown = document.createElement("div");
    dropdown.className = "grh-search-results";
    dropdown.hidden = true;

    let currentMatches = [];

    const closeDropdown = () => {
      dropdown.hidden = true;
      if (onCancel) onCancel();
    };

    const nav = window.GRH_DROPDOWN_NAV.create({
      listEl: dropdown,
      itemSelector: ".grh-search-item",
      defaultIndex: 0,
      onClose: closeDropdown,
    });

    function render(keyword) {
      const q = keyword.trim().toLowerCase();
      const options = readListboxOptions(comboboxIndex);
      currentMatches = q
        ? options.filter(
            (opt) =>
              opt.text.toLowerCase().includes(q) ||
              opt.value.toLowerCase().includes(q)
          )
        : options;

      dropdown.replaceChildren();
      if (options.length > 0) {
        const countEl = document.createElement("div");
        countEl.className = "grh-search-count";
        countEl.textContent = window.GRH_REGION_TAGS.formatDropdownCount(
          currentMatches.length,
          options.length,
          Boolean(q)
        );
        dropdown.appendChild(countEl);
      }

      if (currentMatches.length === 0) {
        const empty = document.createElement("div");
        empty.className = "grh-search-empty";
        empty.textContent =
          comboboxIndex === 1 && options.length === 0
            ? "请先选择美国后再搜州"
            : "无匹配项";
        dropdown.appendChild(empty);
      } else {
        currentMatches.forEach((opt) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "grh-search-item";
          item.textContent = window.GRH_REGION_TAGS
            ? window.GRH_REGION_TAGS.formatRegionLabel(opt.text, opt.value)
            : `${opt.text} (${String(opt.value).toUpperCase()})`;
          item.addEventListener("click", async () => {
            dropdown.hidden = true;
            await onPick(opt.value, opt.text);
          });
          dropdown.appendChild(item);
        });
      }
      dropdown.hidden = false;
      nav.reset(currentMatches.length > 0 ? 0 : -1);
    }

    input.addEventListener("focus", () => {
      if (input.disabled) return;
      input.select();
      render("");
    });
    input.addEventListener("input", () => render(input.value));
    input.addEventListener("keydown", (e) => {
      if (input.disabled) return;
      nav.handleKeydown(e, {
        isOpen: !dropdown.hidden,
        onOpen: () => render(input.value),
        getInitialIndex: () => 0,
      });
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target) && !dropdown.hidden) {
        closeDropdown();
      }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(dropdown);
    return { wrapper, input };
  }

  function injectHelperPanel() {
    if (document.getElementById("grh-panel")) return;
    const form = getFormRoot();
    if (!form) return;

    const panel = document.createElement("div");
    panel.id = "grh-panel";
    panel.className = "grh-panel";

    const header = document.createElement("div");
    header.className = "grh-panel-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "grh-title";
    const titleText = document.createElement("span");
    titleText.textContent = "Google 地区助手";
    titleWrap.appendChild(titleText);

    const headerActions = document.createElement("div");
    headerActions.className = "grh-header-actions";
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "grh-toggle-btn";
    toggleBtn.textContent = "收起";
    toggleBtn.addEventListener("click", () => {
      const collapsed = panel.classList.toggle("is-collapsed");
      toggleBtn.textContent = collapsed ? "展开" : "收起";
    });
    headerActions.appendChild(toggleBtn);

    const pageText = document.body.innerText || "";
    const emailMatch = pageText.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    const regionMatch = pageText.match(
      /(?:您的账号关联地区为：|Your account is associated with:)\s*([^\n]+)/
    );
    const emailText = emailMatch ? emailMatch[0] : "";
    const regionText = regionMatch ? regionMatch[1].trim() : "";

    const accountBar = document.createElement("div");
    accountBar.className = "grh-account-bar";

    const emailSpan = document.createElement("span");
    emailSpan.className = "grh-account-email";
    emailSpan.textContent = emailText || "当前已登录账号";
    accountBar.appendChild(emailSpan);

    if (regionText) {
      const sepSpan = document.createElement("span");
      sepSpan.className = "grh-account-sep";
      sepSpan.textContent = " · 原地区：";
      accountBar.appendChild(sepSpan);

      const regionSpan = document.createElement("span");
      const toneClass = window.GRH_REGION_TAGS
        ? window.GRH_REGION_TAGS.getToneClass(regionText)
        : "is-default";
      regionSpan.className = `grh-account-region ${toneClass}`;
      regionSpan.textContent = regionText;
      accountBar.appendChild(regionSpan);
    }

    accountBar.title = [emailText, regionText ? `原地区：${regionText}` : ""]
      .filter(Boolean)
      .join(" · ") || "当前已登录账号";

    const statusSpan = document.createElement("div");
    statusSpan.id = "grh-panel-status";
    statusSpan.className = "grh-status is-error";

    header.appendChild(titleWrap);
    header.appendChild(headerActions);

    const setPanelError = (msg = "") => {
      const el = document.getElementById("grh-panel-status");
      if (el) el.textContent = msg;
    };

    let panelCountry = getCurrentComboboxSelection(0);
    let panelState = getCurrentComboboxSelection(1);

    const stateSectionLabel = document.createElement("div");
    stateSectionLabel.className = "grh-section-label";
    stateSectionLabel.textContent = "美国免税州";

    const usQuickRow = document.createElement("div");
    usQuickRow.id = "grh-us-preset-row";
    usQuickRow.className = "grh-quick-row";

    const countrySectionLabel = document.createElement("div");
    countrySectionLabel.className = "grh-section-label";
    countrySectionLabel.textContent = "常用国家";

    const countryQuickRow = document.createElement("div");
    countryQuickRow.id = "grh-country-preset-row";
    countryQuickRow.className = "grh-quick-row";

    const searchHeaderRow = document.createElement("div");
    searchHeaderRow.className = "grh-section-row";
    const searchSectionLabel = document.createElement("div");
    searchSectionLabel.className = "grh-section-label";
    searchSectionLabel.textContent = "全部地区搜索";
    const searchCountHint = document.createElement("span");
    searchCountHint.id = "grh-region-count-hint";
    searchCountHint.className = "grh-count-hint";
    searchHeaderRow.appendChild(searchSectionLabel);
    searchHeaderRow.appendChild(searchCountHint);

    const searchRow = document.createElement("div");
    searchRow.className = "grh-search-row";

    let countrySearchCtrl = null;
    let stateSearchCtrl = null;

    const formatLabel = (name, code) =>
      window.GRH_REGION_TAGS ? window.GRH_REGION_TAGS.formatRegionLabel(name, code) : `${name} (${String(code).toUpperCase()})`;

    function syncPanelSelectionUI() {
      if (countrySearchCtrl) {
        countrySearchCtrl.input.value = panelCountry.code
          ? formatLabel(panelCountry.text || panelCountry.code, panelCountry.code)
          : "";
      }
      if (stateSearchCtrl) {
        if (panelCountry.code === "us") {
          stateSearchCtrl.input.disabled = false;
          stateSearchCtrl.input.placeholder = "搜索州/子地区";
          stateSearchCtrl.input.value = panelState.code
            ? formatLabel(panelState.text || panelState.code, panelState.code)
            : "";
        } else {
          stateSearchCtrl.input.disabled = Boolean(panelCountry.code);
          stateSearchCtrl.input.placeholder = panelCountry.code
            ? "无需选子地区"
            : "搜索州/子地区";
          stateSearchCtrl.input.value = "";
        }
      }
      usQuickRow.querySelectorAll(".grh-chip-btn").forEach((btn) => {
        btn.classList.toggle(
          "is-active",
          panelCountry.code === "us" && btn.dataset.code === panelState.code
        );
      });
      countryQuickRow.querySelectorAll(".grh-chip-btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.code === panelCountry.code);
      });
      const countryName = panelCountry.code ? (panelCountry.text || panelCountry.code) : "";
      const stateName = panelCountry.code === "us" && panelState.code ? (panelState.text || panelState.code) : "";
      searchCountHint.textContent = window.GRH_REGION_TAGS.formatSelectedSummary(countryName, stateName);
    }

    US_TAX_FREE_STATES.forEach((st) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "grh-chip-btn";
      btn.dataset.code = st.code;
      btn.textContent = st.label;
      btn.addEventListener("click", async () => {
        setPanelError("");
        try {
          await fillCountryForm({ country: "us", state: st.code });
          panelCountry = { code: "us", text: "美国" };
          panelState = getCurrentComboboxSelection(1);
          if (!panelState.code) panelState = { code: st.code, text: st.name };
          syncPanelSelectionUI();
        } catch (err) {
          setPanelError(err.message || "设置失败");
        }
      });
      usQuickRow.appendChild(btn);
    });

    COUNTRY_PRESETS.forEach((ct) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "grh-chip-btn";
      btn.dataset.code = ct.code;
      btn.textContent = ct.label;
      btn.addEventListener("click", async () => {
        setPanelError("");
        try {
          await fillCountryForm({ country: ct.code, state: "" });
          panelCountry = { code: ct.code, text: ct.name };
          panelState = { code: "", text: "" };
          syncPanelSelectionUI();
        } catch (err) {
          setPanelError(err.message || "选择失败");
        }
      });
      countryQuickRow.appendChild(btn);
    });

    countrySearchCtrl = createSearchDropdown({
      placeholder: "搜索国家/地区",
      comboboxIndex: 0,
      onPick: async (code, label) => {
        setPanelError("");
        try {
          await selectOptionInCombobox(0, code);
          await ensureDefaultReasonIfUnchecked();
          panelCountry = { code, text: label };
          panelState = code === "us" ? getCurrentComboboxSelection(1) : { code: "", text: "" };
          syncPanelSelectionUI();
        } catch (err) {
          setPanelError(err.message || "选择失败");
        }
      },
      onCancel: syncPanelSelectionUI,
    });

    stateSearchCtrl = createSearchDropdown({
      placeholder: "搜索州/子地区",
      comboboxIndex: 1,
      onPick: async (code, label) => {
        setPanelError("");
        try {
          await selectOptionInCombobox(1, code);
          await ensureDefaultReasonIfUnchecked();
          panelState = { code, text: label };
          syncPanelSelectionUI();
        } catch (err) {
          setPanelError(err.message || "选择失败");
        }
      },
      onCancel: syncPanelSelectionUI,
    });

    searchRow.appendChild(countrySearchCtrl.wrapper);
    searchRow.appendChild(stateSearchCtrl.wrapper);

    const body = document.createElement("div");
    body.className = "grh-body";
    body.appendChild(accountBar);
    body.appendChild(stateSectionLabel);
    body.appendChild(usQuickRow);
    body.appendChild(countrySectionLabel);
    body.appendChild(countryQuickRow);
    body.appendChild(searchHeaderRow);
    body.appendChild(searchRow);
    body.appendChild(statusSpan);

    panel.appendChild(header);
    panel.appendChild(body);
    panel._syncSelectionUI = () => {
      panelCountry = getCurrentComboboxSelection(0);
      panelState = panelCountry.code === "us" ? getCurrentComboboxSelection(1) : { code: "", text: "" };
      syncPanelSelectionUI();
    };

    document.body.appendChild(panel);
    syncPanelSelectionUI();
  }

  async function runPendingTaskIfAny() {
    try {
      const data = await chrome.storage.local.get(PENDING_TASK_KEY);
      const task = data[PENDING_TASK_KEY];
      if (!task) return;
      await chrome.storage.local.remove(PENDING_TASK_KEY);

      if (Date.now() - (task.createdAt || 0) > TASK_TTL_MS) return;

      await fillCountryForm(task);
      document.getElementById("grh-panel")?._syncSelectionUI?.();
    } catch (err) {
      const statusEl = document.getElementById("grh-panel-status");
      if (statusEl) {
        statusEl.textContent = err.message || "自动填充失败";
      }
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "GRH_FILL_FORM") return false;
    const task = message.payload || {};
    fillCountryForm(task)
      .then(() => {
        const statusEl = document.getElementById("grh-panel-status");
        if (statusEl) statusEl.textContent = "";
        document.getElementById("grh-panel")?._syncSelectionUI?.();
        sendResponse({ ok: true });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  });

  async function init() {
    const form = await waitFor(getFormRoot, 8000, 150);
    if (!form) return;
    injectHelperPanel();
    await runPendingTaskIfAny();
  }

  init();
})();
