const STORAGE_KEYS = {
  CONFIG: "grh_config",
  PENDING_TASK: "grh_pending_task",
  ACCOUNTS_CACHE: "grh_accounts_cache",
};

const US_TAX_FREE_PRESETS = window.GRH_PRESETS?.US_TAX_FREE || [];
const COUNTRY_PRESETS = window.GRH_PRESETS?.COUNTRIES || [];

const DEFAULT_CONFIG = {
  accountIndex: "",
  country: "us",
  state: "OR",
};

let cachedAccounts = [];
let selectedAccountIndex = "";
let selectedCountry = "us";
let selectedState = "OR";

function getRegionsData() {
  return window.GRH_REGIONS_DATA || { countries: [], usStates: [] };
}

function findCountryName(code) {
  return getRegionsData().countries.find((c) => c.code === code)?.name || code;
}

function findStateName(code) {
  return getRegionsData().usStates.find((s) => s.code === code)?.name || code;
}

function buildFormUrl(accountIndex) {
  const prefix = accountIndex !== "" && accountIndex !== null ? `/u/${accountIndex}` : "";
  return `https://policies.google.com${prefix}/country-association-form?hl=zh_CN&source=policies-site`;
}

function setStatus(text, isError = false) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function renderAccountsSelect(accounts, preferredIndex = "") {
  selectedAccountIndex = window.GRH_ACCOUNTS.renderDropdown({
    accounts,
    preferredIndex,
    onSelect: async (idx) => {
      selectedAccountIndex = idx;
      await saveConfig();
    },
  });
}

function syncTargetRegionUI() {
  const countryInput = document.getElementById("countrySearchInput");
  const stateInput = document.getElementById("stateSearchInput");

  const formatLabel = (name, code) =>
    window.GRH_REGION_TAGS ? window.GRH_REGION_TAGS.formatRegionLabel(name, code) : `${name} (${String(code).toUpperCase()})`;

  countryInput.value = formatLabel(findCountryName(selectedCountry), selectedCountry);

  if (selectedCountry === "us") {
    stateInput.disabled = false;
    stateInput.placeholder = "搜索州/子地区";
    stateInput.value = selectedState ? formatLabel(findStateName(selectedState), selectedState) : "";
  } else {
    selectedState = "";
    stateInput.disabled = true;
    stateInput.value = "";
    stateInput.placeholder = "无需选子地区";
    document.getElementById("stateSearchList").hidden = true;
  }

  document.querySelectorAll("#usPresetRow .chip-btn").forEach((btn) => {
    btn.classList.toggle("is-active", selectedCountry === "us" && btn.dataset.code === selectedState);
  });
  document.querySelectorAll("#countryPresetRow .chip-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.code === selectedCountry);
  });

  const countHint = document.getElementById("regionCountHint");
  if (countHint) {
    const countryName = selectedCountry ? findCountryName(selectedCountry) : "";
    const stateName = selectedCountry === "us" && selectedState ? findStateName(selectedState) : "";
    countHint.textContent = window.GRH_REGION_TAGS.formatSelectedSummary(countryName, stateName);
  }
}

function renderPresetChips() {
  const usRow = document.getElementById("usPresetRow");
  usRow.replaceChildren();
  US_TAX_FREE_PRESETS.forEach((st) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn";
    btn.dataset.code = st.code;
    btn.textContent = st.label;
    btn.addEventListener("click", async () => {
      selectedCountry = "us";
      selectedState = st.code;
      syncTargetRegionUI();
      await saveConfig();
    });
    usRow.appendChild(btn);
  });

  const countryRow = document.getElementById("countryPresetRow");
  countryRow.replaceChildren();
  COUNTRY_PRESETS.forEach((ct) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn";
    btn.dataset.code = ct.code;
    btn.textContent = ct.label;
    btn.addEventListener("click", async () => {
      selectedCountry = ct.code;
      selectedState = "";
      syncTargetRegionUI();
      await saveConfig();
    });
    countryRow.appendChild(btn);
  });
}

function setupSearchInput({ inputId, listId, wrapId, getOptions, onSelect }) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  const wrap = document.getElementById(wrapId);
  let matches = [];

  const nav = window.GRH_DROPDOWN_NAV.create({
    listEl: list,
    itemSelector: ".search-item",
    defaultIndex: 0,
    onClose: () => {
      list.hidden = true;
      syncTargetRegionUI();
    },
  });

  function render(query) {
    const q = query.trim().toLowerCase();
    const all = getOptions();
    matches = q
      ? all.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            o.code.toLowerCase().includes(q) ||
            (o.en && o.en.toLowerCase().includes(q))
        )
      : all;

    list.replaceChildren();
    if (all.length > 0) {
      const countEl = document.createElement("div");
      countEl.className = "search-count";
      countEl.textContent = window.GRH_REGION_TAGS.formatDropdownCount(matches.length, all.length, Boolean(q));
      list.appendChild(countEl);
    }

    if (matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "search-empty";
      empty.textContent = "无匹配项";
      list.appendChild(empty);
    } else {
      matches.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "search-item";
        btn.textContent = window.GRH_REGION_TAGS
          ? window.GRH_REGION_TAGS.formatRegionLabel(opt.name, opt.code)
          : `${opt.name} (${String(opt.code).toUpperCase()})`;
        btn.addEventListener("click", async () => {
          list.hidden = true;
          await onSelect(opt.code);
        });
        list.appendChild(btn);
      });
    }
    list.hidden = false;
    nav.reset(matches.length > 0 ? 0 : -1);
  }

  input.addEventListener("focus", () => {
    input.select();
    render("");
  });

  input.addEventListener("input", () => render(input.value));

  input.addEventListener("keydown", (e) => {
    nav.handleKeydown(e, {
      isOpen: !list.hidden,
      onOpen: () => render(input.value),
      getInitialIndex: () => 0,
    });
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      list.hidden = true;
      syncTargetRegionUI();
    }
  });
}

async function saveConfig() {
  const cfg = {
    accountIndex: selectedAccountIndex,
    country: selectedCountry,
    state: selectedState,
  };
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: cfg });
  } catch {
    // ignore outside extension
  }
  return cfg;
}

async function loadConfig() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
    const cfg = { ...DEFAULT_CONFIG, ...(data[STORAGE_KEYS.CONFIG] || {}) };
    selectedCountry = cfg.country || "us";
    selectedState = cfg.country === "us" ? (cfg.state || "OR") : "";
    syncTargetRegionUI();
    return cfg;
  } catch {
    syncTargetRegionUI();
    return DEFAULT_CONFIG;
  }
}

async function refreshAccounts({ force = false, preferredIndex = "" } = {}) {
  const btn = document.getElementById("btnRefreshAccounts");
  btn.disabled = true;
  btn.textContent = "查询中...";
  try {
    if (!force) {
      const cached = await chrome.storage.local.get(STORAGE_KEYS.ACCOUNTS_CACHE);
      const cacheData = cached[STORAGE_KEYS.ACCOUNTS_CACHE];
      if (cacheData?.accounts?.length && Date.now() - cacheData.updatedAt < 5 * 60 * 1000) {
        cachedAccounts = cacheData.accounts;
        renderAccountsSelect(cachedAccounts, preferredIndex);
        setStatus("");
        return;
      }
    }
    const accounts = await window.GRH_ACCOUNTS.fetchSignedInAccounts();
    cachedAccounts = accounts;
    renderAccountsSelect(cachedAccounts, preferredIndex);
    if (accounts.length > 0) {
      setStatus("");
      await chrome.storage.local.set({ [STORAGE_KEYS.ACCOUNTS_CACHE]: { accounts, updatedAt: Date.now() } });
    } else {
      setStatus("未检测到 Google 登录态，可先登录或手动选槽位", true);
    }
  } catch {
    renderAccountsSelect([], preferredIndex);
    setStatus("账号检测失败，可先登录或手动选槽位", true);
  } finally {
    btn.disabled = false;
    btn.textContent = "刷新";
  }
}

function isTargetFormUrl(url = "", targetAccountIndex = "") {
  if (!url.includes("policies.google.com") || !url.includes("country-association-form")) return false;
  if (targetAccountIndex === "") return true;
  if (Number(targetAccountIndex) === 0 && !/\/u\/\d+\//.test(url)) return true;
  return url.includes(`/u/${targetAccountIndex}/country-association-form`);
}

async function handleGoAndFill() {
  const cfg = await saveConfig();
  const task = {
    country: cfg.country,
    state: cfg.country === "us" ? cfg.state : "",
    createdAt: Date.now(),
  };

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (activeTab?.id && isTargetFormUrl(activeTab.url, cfg.accountIndex)) {
    try {
      const resp = await chrome.tabs.sendMessage(activeTab.id, {
        type: "GRH_FILL_FORM",
        payload: task,
      });
      if (resp?.ok) {
        const label = task.state ? `${findCountryName(task.country)} · ${findStateName(task.state)}` : findCountryName(task.country);
        setStatus(`已填充：${label}（请核对后点击页面提交）`);
        return;
      }
    } catch {
      // fallback to navigation
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.PENDING_TASK]: task });
  const targetUrl = buildFormUrl(cfg.accountIndex);

  if (activeTab?.id && activeTab.url?.startsWith("https://policies.google.com/")) {
    await chrome.tabs.update(activeTab.id, { url: targetUrl });
  } else {
    await chrome.tabs.create({ url: targetUrl });
  }
  setStatus("已打开页面，加载完成后将自动填充");
}

async function handleOpenPageOnly() {
  const cfg = await saveConfig();
  await chrome.storage.local.remove(STORAGE_KEYS.PENDING_TASK);
  const targetUrl = buildFormUrl(cfg.accountIndex);
  await chrome.tabs.create({ url: targetUrl });
  setStatus("已打开修改地区页面");
}

document.addEventListener("DOMContentLoaded", async () => {
  renderPresetChips();

  setupSearchInput({
    inputId: "countrySearchInput",
    listId: "countrySearchList",
    wrapId: "countrySearchWrap",
    getOptions: () => getRegionsData().countries,
    onSelect: async (code) => {
      selectedCountry = code;
      selectedState = code === "us" ? (selectedState || "OR") : "";
      syncTargetRegionUI();
      await saveConfig();
    },
  });

  setupSearchInput({
    inputId: "stateSearchInput",
    listId: "stateSearchList",
    wrapId: "stateSearchWrap",
    getOptions: () => (selectedCountry === "us" ? getRegionsData().usStates : []),
    onSelect: async (code) => {
      selectedState = code;
      syncTargetRegionUI();
      await saveConfig();
    },
  });

  const accountTrigger = document.getElementById("accountTrigger");
  const accountMenu = document.getElementById("accountMenu");
  const accountDropdown = document.getElementById("accountDropdown");

  const closeAccountMenu = () => {
    accountMenu.hidden = true;
    accountTrigger.setAttribute("aria-expanded", "false");
  };

  const getSelectedOptionIndex = () => {
    const opts = Array.from(accountMenu.querySelectorAll(".account-option"));
    const idx = opts.findIndex((el) => el.classList.contains("is-selected"));
    return idx >= 0 ? idx : 0;
  };

  const accountNav = window.GRH_DROPDOWN_NAV.create({
    listEl: accountMenu,
    itemSelector: ".account-option",
    defaultIndex: 0,
    onClose: () => {
      closeAccountMenu();
      accountTrigger.focus();
    },
  });

  const openAccountMenu = () => {
    accountMenu.hidden = false;
    accountTrigger.setAttribute("aria-expanded", "true");
    accountNav.reset(getSelectedOptionIndex());
  };

  accountTrigger.addEventListener("click", () => {
    if (accountMenu.hidden) {
      openAccountMenu();
    } else {
      closeAccountMenu();
    }
  });

  accountTrigger.addEventListener("keydown", (e) => {
    accountNav.handleKeydown(e, {
      isOpen: !accountMenu.hidden,
      onOpen: openAccountMenu,
      getInitialIndex: getSelectedOptionIndex,
    });
  });

  document.addEventListener("click", (e) => {
    if (!accountDropdown.contains(e.target)) {
      closeAccountMenu();
    }
  });

  document.getElementById("btnRefreshAccounts").addEventListener("click", () => {
    refreshAccounts({ force: true, preferredIndex: selectedAccountIndex });
  });

  document.getElementById("btnGoAndFill").addEventListener("click", handleGoAndFill);
  document.getElementById("btnOpenPageOnly").addEventListener("click", handleOpenPageOnly);

  const cfg = await loadConfig();
  await refreshAccounts({ force: false, preferredIndex: cfg.accountIndex });
});
