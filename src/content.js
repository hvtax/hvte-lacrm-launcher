(function () {
  "use strict";
  const config = globalThis.HVTE_CONFIG;
  const lib = globalThis.HVTE_LIB;
  const { valid: actions, problems } = lib.validateActions(globalThis.HVTE_ACTIONS);
  problems.forEach(problem => console.warn(`[HVTE] ${problem}`));
  let container = null, button = null, menu = null, copyTimer = null;
  let menuHasId = false;
  let lastHref = null;
  const currentId = () => lib.extractContactId(window.location.href, config);
  const allowedHost = () => {
    const url = new URL(window.location.href);
    return url.protocol === "https:" && url.host === config.HOST;
  };
  function element(tag, suffix, text) {
    const node = document.createElement(tag);
    node.className = `hvte-lacrm-${suffix}`;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function closeMenu(returnFocus = false) {
    clearTimeout(copyTimer);
    menu?.remove();
    menu = null;
    button?.setAttribute("aria-expanded", "false");
    if (returnFocus) button?.focus();
  }
  function removeContainer() {
    closeMenu();
    container?.remove();
    container = button = null;
  }
  function checkLocation() {
    const changed = lastHref !== window.location.href;
    lastHref = window.location.href;
    if (!allowedHost() || (!currentId() && !config.SHOW_BUTTON_WITHOUT_CONTACT_ID)) {
      removeContainer();
      return;
    }
    if (container) {
      if (menu && changed && menuHasId !== Boolean(currentId())) { closeMenu(); openMenu(); }
      return;
    }
    if (!document.documentElement) return;
    container = element("div", "container");
    container.id = "hvte-lacrm-container";
    button = element("button", "button", config.BUTTON_LABEL);
    button.type = "button";
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "hvte-lacrm-menu");
    button.addEventListener("click", () => {
      // Always check again even when the poll has not noticed a navigation.
      checkLocation();
      if (!container) return;
      if (menu) closeMenu();
      else openMenu();
    });
    button.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        checkLocation();
        if (container && !menu) openMenu();
        menu?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
      }
    });
    container.append(button);
    document.documentElement.append(container);
  }
  function actionClick(action) {
    const id = currentId(); // Deliberately independent of menu-open state.
    if (!allowedHost() || (lib.requiresContactId(action) && !id)) {
      closeMenu();
      checkLocation();
      return;
    }
    try {
      const url = lib.buildActionUrl(action, id);
      if (action.openIn === "sameTab") window.location.assign(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      console.warn(`[HVTE] Cannot open action: ${action.label}`);
    }
    closeMenu();
    checkLocation();
  }
  function fallbackCopy(id) {
    const textarea = element("textarea", "clipboard");
    textarea.value = id;
    textarea.setAttribute("readonly", "");
    container.append(textarea);
    textarea.select();
    try {
      if (!document.execCommand("copy")) throw new Error("Copy unavailable");
    } finally { textarea.remove(); }
  }
  async function copyContactId(item) {
    const id = currentId();
    if (!allowedHost() || !id) { closeMenu(); checkLocation(); return; }
    const originalMenu = menu;
    try {
      try { await navigator.clipboard.writeText(id); }
      catch { fallbackCopy(id); }
      if (menu !== originalMenu) return;
      item.textContent = "Copied";
      copyTimer = setTimeout(() => closeMenu(), 650);
    } catch {
      console.warn("[HVTE] Clipboard unavailable");
      closeMenu();
    }
  }
  function menuItem(label, disabled, handler) {
    const item = element("button", "item", label);
    item.type = "button";
    item.setAttribute("role", "menuitem");
    item.disabled = disabled;
    item.setAttribute("aria-disabled", String(disabled));
    item.addEventListener("click", handler);
    menu.append(item);
    return item;
  }
  function separator() {
    const line = element("div", "separator");
    line.setAttribute("role", "separator");
    menu.append(line);
  }
  function openMenu() {
    const id = currentId(); // Re-read at menu-open time as well as action time.
    menuHasId = Boolean(id); // Only availability is retained, never an action's ID.
    menu = element("div", "menu");
    menu.id = "hvte-lacrm-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "HVTE actions");
    for (const action of actions) {
      if (action.type === "separator") separator();
      else if (action.type === "heading") menu.append(element("div", "heading", action.label));
      else menuItem(action.label, !id && lib.requiresContactId(action), () => actionClick(action));
    }
    if (id) {
      separator();
      const item = menuItem("Copy ContactId", false, () => copyContactId(item));
    }
    menu.addEventListener("keydown", event => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = Array.from(menu.querySelectorAll('[role="menuitem"]:not([disabled])'));
      if (!items.length) return;
      const at = items.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 :
        (at + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      items[next].focus();
    });
    container.append(menu);
    button.setAttribute("aria-expanded", "true");
  }
  document.addEventListener("click", event => {
    if (container && !container.contains(event.target)) closeMenu();
  }, true);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menu) { event.preventDefault(); closeMenu(true); }
    if (event.key === "Tab" && menu) closeMenu();
  });
  for (const event of ["pageshow", "popstate"]) window.addEventListener(event, checkLocation);
  document.addEventListener("DOMContentLoaded", checkLocation);
  // Deliberately no wrapping of the page's history methods: exporting a
  // wrapper into LACRM's realm (v1.0.0) broke LACRM's own link handling.
  // The poll below covers in-page navigation, and click handlers never
  // depend on monitoring because they re-read the current URL.
  setInterval(() => {
    if (window.location.href !== lastHref) checkLocation();
  }, config.POLL_INTERVAL_MS);
  checkLocation();
})();
