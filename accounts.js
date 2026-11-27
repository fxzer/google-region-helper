// Google 已登录账号识别与自定义下拉组件模块
window.GRH_ACCOUNTS = (() => {
  async function fetchAccountSlot(index) {
    try {
      const url = `https://policies.google.com/u/${index}/country-association-form?hl=zh_CN`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok || !res.url.includes("policies.google.com")) return null;
      if (index > 0 && !res.url.includes(`/u/${index}/`)) return null;

      const html = await res.text();
      const emailMatch = html.match(
        /您目前登录的账号为[\s\S]{0,160}?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
      );
      const regionMatch = html.match(/您的账号关联地区为：<div[^>]*>([^<]+)<\/div>/);
      if (!emailMatch) return null;

      return {
        index,
        email: emailMatch[1],
        isDefault: index === 0,
        region: regionMatch ? regionMatch[1].trim() : "",
      };
    } catch {
      return null;
    }
  }

  async function fetchSignedInAccounts() {
    const slots = await Promise.all(Array.from({ length: 10 }, (_, i) => fetchAccountSlot(i)));
    const seen = new Set();
    return slots.filter((item) => item && !seen.has(item.email) && seen.add(item.email));
  }

  function getTagMeta(acc) {
    if (!acc?.region) return null;
    const cls = window.GRH_REGION_TAGS
      ? window.GRH_REGION_TAGS.getToneClass(acc.region)
      : "is-default";
    return {
      text: acc.region,
      className: cls,
    };
  }

  function updateTriggerUI(items, selectedIndex) {
    const acc = items.find((a) => String(a.index) === String(selectedIndex));
    const emailEl = document.getElementById("accountSelectedEmail");
    const defTagEl = document.getElementById("accountDefaultTag");
    const regionTagEl = document.getElementById("accountSelectedTag");

    if (!acc) {
      emailEl.textContent = "默认当前登录账号";
      defTagEl.hidden = true;
      regionTagEl.hidden = true;
    } else {
      emailEl.textContent = acc.email;
      defTagEl.hidden = !acc.isDefault;
      const tagMeta = getTagMeta(acc);
      if (tagMeta) {
        regionTagEl.textContent = tagMeta.text;
        regionTagEl.className = `tag-pill ${tagMeta.className}`;
        regionTagEl.hidden = false;
      } else {
        regionTagEl.hidden = true;
      }
    }

    document.querySelectorAll("#accountMenu .account-option").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.index === String(selectedIndex));
    });
  }

  function renderDropdown({ accounts, preferredIndex = "", onSelect }) {
    const menu = document.getElementById("accountMenu");
    menu.replaceChildren();

    let items;
    let selectedIndex;
    if (!accounts.length) {
      items = [
        { index: "", email: "默认当前登录账号", region: "", isDefault: false },
        ...Array.from({ length: 8 }, (_, i) => ({
          index: String(i),
          email: `账号槽位 /u/${i}`,
          region: "",
          isDefault: i === 0,
        })),
      ];
      selectedIndex = items.some((a) => String(a.index) === String(preferredIndex))
        ? String(preferredIndex)
        : "";
    } else {
      items = [...accounts].sort((a, b) => a.index - b.index);
      const hasPreferred = items.some((a) => String(a.index) === String(preferredIndex));
      selectedIndex =
        hasPreferred && preferredIndex !== ""
          ? String(preferredIndex)
          : String(items[0].index);
    }

    items.forEach((acc) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "account-option";
      btn.dataset.index = String(acc.index);

      const left = document.createElement("span");
      left.className = "account-option-left";
      const emailSpan = document.createElement("span");
      emailSpan.className = "account-option-email";
      emailSpan.textContent = acc.email;
      left.appendChild(emailSpan);
      if (acc.isDefault) {
        const def = document.createElement("span");
        def.className = "tag-pill is-default";
        def.textContent = "默认";
        left.appendChild(def);
      }
      btn.appendChild(left);

      const tagMeta = getTagMeta(acc);
      if (tagMeta) {
        const tag = document.createElement("span");
        tag.className = `tag-pill ${tagMeta.className}`;
        tag.textContent = tagMeta.text;
        btn.appendChild(tag);
      }

      btn.addEventListener("click", async () => {
        menu.hidden = true;
        document.getElementById("accountTrigger").setAttribute("aria-expanded", "false");
        updateTriggerUI(items, String(acc.index));
        if (onSelect) await onSelect(String(acc.index));
      });

      menu.appendChild(btn);
    });

    updateTriggerUI(items, selectedIndex);
    return selectedIndex;
  }

  return { fetchSignedInAccounts, renderDropdown };
})();
