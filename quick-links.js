// Google 多账号常用管理页面快捷入口模块
window.GRH_QUICK_LINKS = (() => {
  function withPathSlot(baseOrigin, pathPrefix, suffix, accountIndex) {
    const hasSlot = accountIndex !== "" && accountIndex !== null && accountIndex !== undefined;
    const slotPart = hasSlot ? `/u/${accountIndex}` : "";
    return `${baseOrigin}${pathPrefix}${slotPart}${suffix}`;
  }

  function withAuthUserQuery(url, accountIndex) {
    const hasSlot = accountIndex !== "" && accountIndex !== null && accountIndex !== undefined;
    if (!hasSlot) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}authuser=${encodeURIComponent(accountIndex)}`;
  }

  const GROUPS = [
    {
      id: "billing",
      title: "账单与订阅",
      items: [
        {
          id: "payments-home",
          title: "付款资料首页",
          desc: "管理付款方式、交易记录与账单地址",
          badge: "pay.google.com",
          buildUrl: (idx) => withPathSlot("https://pay.google.com", "/payments", "/home", idx),
        },
        {
          id: "payments-settings",
          title: "付款资料设置",
          desc: "查看付款资料地区、ID 或关闭旧付款资料",
          badge: "含关闭入口",
          buildUrl: (idx) => withPathSlot("https://pay.google.com", "/payments", "/home#settings", idx),
        },
        {
          id: "play-subscriptions",
          title: "Google Play 订阅管理",
          desc: "查看或取消 Play 商店自动续费与历史订单",
          badge: "play.google.com",
          buildUrl: (idx) => withAuthUserQuery("https://play.google.com/store/account/subscriptions", idx),
        },
        {
          id: "google-one-settings",
          title: "Google One 设置",
          desc: "管理 One 会员方案、家庭组或取消订阅",
          badge: "one.google.com",
          buildUrl: (idx) => withPathSlot("https://one.google.com", "", "/settings", idx),
        },
      ],
    },
    {
      id: "account",
      title: "优惠与账号管理",
      items: [
        {
          id: "ai-student",
          title: "学生优惠入口",
          desc: "查看 Google One / Gemini 学生认证与优惠资格",
          badge: "活动页",
          buildUrl: (idx) => withPathSlot("https://one.google.com", "", "/ai-student", idx),
        },
        {
          id: "delete-services",
          title: "删除 Google 服务",
          desc: "仅进入服务管理列表，不会自动删除；需手动点删并二次确认",
          badge: "单项管理",
          buildUrl: (idx) => withPathSlot("https://myaccount.google.com", "", "/deleteservices", idx),
        },
      ],
    },
  ];

  function render({ containerId, onOpen }) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();

    GROUPS.forEach((group) => {
      const card = document.createElement("section");
      card.className = "card quick-group-card";

      const heading = document.createElement("div");
      heading.className = "sub-label";
      heading.textContent = group.title;
      card.appendChild(heading);

      const list = document.createElement("div");
      list.className = "quick-link-list";

      group.items.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quick-link-btn";
        btn.dataset.linkId = item.id;

        const main = document.createElement("span");
        main.className = "quick-link-main";

        const titleRow = document.createElement("span");
        titleRow.className = "quick-link-title-row";

        const title = document.createElement("span");
        title.className = "quick-link-title";
        title.textContent = item.title;
        titleRow.appendChild(title);

        if (item.badge) {
          const badge = document.createElement("span");
          badge.className = "quick-link-badge";
          badge.textContent = item.badge;
          titleRow.appendChild(badge);
        }

        const desc = document.createElement("span");
        desc.className = "quick-link-desc";
        desc.textContent = item.desc;

        main.appendChild(titleRow);
        main.appendChild(desc);

        const arrow = document.createElement("span");
        arrow.className = "quick-link-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↗";

        btn.appendChild(main);
        btn.appendChild(arrow);

        btn.addEventListener("click", () => {
          if (onOpen) onOpen(item);
        });

        list.appendChild(btn);
      });

      card.appendChild(list);
      container.appendChild(card);
    });
  }

  return { GROUPS, render };
})();
