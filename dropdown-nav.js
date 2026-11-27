// 下拉选项键盘导航辅助（方向键上下移动、回车确认、Esc 收起、鼠标同步）
window.GRH_DROPDOWN_NAV = (() => {
  function create({ listEl, itemSelector, defaultIndex = 0, onClose }) {
    let activeIndex = -1;

    function getItems() {
      return Array.from(listEl.querySelectorAll(itemSelector));
    }

    function applyHighlight(items) {
      items.forEach((el, i) => {
        el.classList.toggle("is-highlighted", i === activeIndex);
      });
    }

    function setActive(idx, { scroll = true } = {}) {
      const items = getItems();
      if (!items.length) {
        activeIndex = -1;
        return;
      }
      activeIndex = ((idx % items.length) + items.length) % items.length;
      applyHighlight(items);
      if (scroll) {
        items[activeIndex].scrollIntoView({ block: "nearest" });
      }
    }

    function reset(idx = defaultIndex) {
      const items = getItems();
      if (!items.length || idx < 0) {
        activeIndex = -1;
        applyHighlight(items);
        return;
      }
      activeIndex = Math.min(idx, items.length - 1);
      applyHighlight(items);
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }

    listEl.addEventListener("mousemove", (e) => {
      const item = e.target.closest(itemSelector);
      if (!item || !listEl.contains(item)) return;
      const items = getItems();
      const idx = items.indexOf(item);
      if (idx >= 0 && idx !== activeIndex) {
        activeIndex = idx;
        applyHighlight(items);
      }
    });

    function handleKeydown(e, { isOpen, onOpen, getInitialIndex } = {}) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen && onOpen) {
          onOpen();
          const init = getInitialIndex ? getInitialIndex() : defaultIndex;
          setActive(init >= 0 ? init : 0);
          return true;
        }
        setActive(activeIndex < 0 ? 0 : activeIndex + 1);
        return true;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen && onOpen) {
          onOpen();
          const items = getItems();
          const init = getInitialIndex ? getInitialIndex() : items.length - 1;
          setActive(init >= 0 ? init : items.length - 1);
          return true;
        }
        setActive(activeIndex <= 0 ? getItems().length - 1 : activeIndex - 1);
        return true;
      }

      if (e.key === "Enter" && isOpen) {
        const items = getItems();
        if (!items.length) return false;
        e.preventDefault();
        const target = items[activeIndex >= 0 ? activeIndex : 0];
        if (target) target.click();
        return true;
      }

      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        if (onClose) onClose();
        return true;
      }

      return false;
    }

    return { reset, setActive, handleKeydown };
  }

  return { create };
})();
