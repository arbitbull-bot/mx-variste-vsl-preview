/**
 * Back -> ./back2/
 * Локальна реалізація навігації за History API.
 * У робочому сетапі перевірити разом із бекендом/актуальним back.js.
 */
(function () {
  "use strict";

  function getClickId() {
    var qs = new URLSearchParams(location.search);
    return String(window.VSL_CLICK_ID ||
      qs.get("clickid") || qs.get("binom_click_id") || "");
  }

  var installed = false;
  var leaving = false;

  function vitBack(url, useInternalBack2) {
    if (installed || !useInternalBack2) return;
    installed = true;

    // Додаємо проміжну history-запис, щоб натискання «Назад» оброблялося тут.
    try {
      history.replaceState({ vslStart: true }, "", location.href);
      history.pushState({ vslGate: true }, "", location.href);
    } catch (error) {
      console.warn("VSL: браузер заборонив history.pushState", error);
    }

    window.addEventListener("popstate", function () {
      if (leaving) return;
      leaving = true;
      window.dispatchEvent(new Event("vsl:back"));
      var target = new URL("./back2/", location.href);
      target.searchParams.set("clickid", getClickId());
      location.replace(target.href);
    });
  }

  // Виклик window.vitBack() здійснюється у index.php за стандартом VSL WhoCPA.
  window.vitBack = vitBack;
})();
