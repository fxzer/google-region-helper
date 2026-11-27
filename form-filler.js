// Google 账号关联地区表单 DOM 读写与自动填充模块
window.GRH_FORM_FILLER = (() => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function getFormRoot() {
    return document.querySelector('[role="form"]');
  }

  async function waitFor(fn, timeoutMs = 6000, intervalMs = 120) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = fn();
      if (result) return result;
      await sleep(intervalMs);
    }
    return null;
  }

  async function selectOptionInCombobox(comboboxIndex, dataValue) {
    const targetBox = await waitFor(() => {
      const form = getFormRoot();
      return form ? form.querySelectorAll('[role="combobox"]')[comboboxIndex] : null;
    }, 8000, 100);
    if (!targetBox) {
      throw new Error(
        comboboxIndex === 1
          ? "未找到第 2 个下拉框（请先选择包含子地区的国家，如美国）"
          : `未找到第 ${comboboxIndex + 1} 个下拉框`
      );
    }

    targetBox.click();
    await sleep(160);

    const option = await waitFor(() => {
      const form = getFormRoot();
      if (!form) return null;
      const listboxes = form.querySelectorAll('ul[role="listbox"]');
      const searchScope = listboxes[comboboxIndex] || form;
      return searchScope.querySelector(
        `li[role="option"][data-value="${CSS.escape(dataValue)}"]`
      );
    }, 3500, 80);

    if (!option) {
      document.body.click();
      throw new Error(`未找到选项: ${dataValue}`);
    }

    option.scrollIntoView({ block: "nearest" });
    option.click();
    await sleep(220);

    // 若下拉框因 hover/焦点未自动收起，主动按 Escape 收起避免遮挡
    const latestBox = getFormRoot()?.querySelectorAll('[role="combobox"]')[comboboxIndex];
    if (latestBox && latestBox.getAttribute("aria-expanded") === "true") {
      latestBox.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true })
      );
      await sleep(120);
    }
  }

  /**
   * 仅当页面表单当前未勾选任何关联原因时，自动兜底勾选「我在过去一年内搬到了这里」（索引 1）；
   * 若用户已在页面手动勾选其他原因，则保持不变。
   */
  async function ensureDefaultReasonIfUnchecked() {
    await sleep(250);
    const checkboxes = await waitFor(() => {
      const currentForm = getFormRoot();
      if (!currentForm) return null;
      const list = currentForm.querySelectorAll('input[type="checkbox"]');
      return list.length > 1 ? list : null;
    }, 3000, 100);

    if (!checkboxes) return;
    const hasAnyChecked = Array.from(checkboxes).some((cb) => cb.checked);
    if (hasAnyChecked) return;

    const defaultCb = checkboxes[1];
    defaultCb.click();
    await sleep(80);
    if (!defaultCb.checked) {
      defaultCb.click();
      await sleep(60);
    }
  }

  async function fillCountryForm({ country = "us", state = "OR" }) {
    const initialForm = await waitFor(getFormRoot, 6000, 150);
    if (!initialForm) throw new Error("页面表单尚未加载完成");

    await selectOptionInCombobox(0, country);

    if (state) {
      await sleep(180);
      await selectOptionInCombobox(1, state);
    }

    await ensureDefaultReasonIfUnchecked();
  }

  function readListboxOptions(comboboxIndex) {
    const form = getFormRoot();
    if (!form) return [];
    const listboxes = form.querySelectorAll('ul[role="listbox"]');
    const list = listboxes[comboboxIndex];
    if (!list) return [];
    return Array.from(list.querySelectorAll('li[role="option"][data-value]')).map(
      (el) => ({
        value: el.getAttribute("data-value") || "",
        text: (el.innerText || "").trim(),
      })
    );
  }

  function getCurrentComboboxSelection(comboboxIndex) {
    const form = getFormRoot();
    const list = form?.querySelectorAll('ul[role="listbox"]')[comboboxIndex];
    const selectedOpt = list?.querySelector('li[role="option"][aria-selected="true"]');
    if (!selectedOpt) return { code: "", text: "" };
    return {
      code: selectedOpt.getAttribute("data-value") || "",
      text: (selectedOpt.innerText || "").trim(),
    };
  }

  return {
    getFormRoot,
    waitFor,
    selectOptionInCombobox,
    ensureDefaultReasonIfUnchecked,
    fillCountryForm,
    readListboxOptions,
    getCurrentComboboxSelection,
  };
})();
