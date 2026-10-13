/**
 * VSL WPD-18028 — таймінги з Jira.
 * Не замінювати час показу форми лише через event9: це ДВА незалежні місця.
 * URL трекінг-проксі треба отримати з актуального робочого шаблону.
 */
(function () {
  "use strict";

  // 1) Події трекера, секунди з ТЗ Jira
  var videoEvents = [
    { time: 99,  event: 3 }, // початок блоку 2
    { time: 197, event: 4 }, // початок блоку 3
    { time: 296, event: 5 }, // початок блоку 4
    { time: 393, event: 9 }, // момент показу форми
    { time: 395, event: 6 }, // початок блоку 5
    { time: 493, event: 7 }, // початок блоку 6
    { time: 592, event: 8 }, // початок блоку 7
    { time: 690, event: 10 } // початок останнього блоку, як у ТЗ
  ];

  // 2) ОКРЕМО визначаємо фізичний показ форми
  var FORM_SHOW_TIME = 393;
  var FALLBACK_DURATION = 791.252;

  var video = document.getElementById("video");
  var orderElement = document.getElementById("form-wrap");
  var waitingElement = null;
  var progressBar = null;
  var videoTimeText = null;
  if (!video) return;

  var triggeredEvents = new Set();
  var formShown = false;
  var started = false;
  var active = false;
  var event1Timer = null;
  var event1Elapsed = 0;

  function formatTime(seconds) {
    var s = Math.max(0, Math.floor(seconds || 0));
    return String(Math.floor(s / 60)).padStart(2, "0") +
      ":" + String(s % 60).padStart(2, "0");
  }

  function sendBinomEvent(eventNumber, value) {
    // Спроба роботи зі стандартною схемою проксі подій.
    // Якщо URL не задано — нічого нікуди не надсилаємо.
    var payload = {
      clickid: String(window.VSL_CLICK_ID || new URLSearchParams(location.search).get("clickid") || new URLSearchParams(location.search).get("binom_click_id") || ""),
      event: eventNumber,
      value: value
    };

    // Для тестування можна слухати window.addEventListener("vsl:event", ...)
    window.dispatchEvent(new CustomEvent("vsl:event", { detail: payload }));

    var proxy = window.EVENT_PROXY_URL;
    if (!proxy) return;
    try {
      var url = new URL(proxy, window.location.href);
      url.searchParams.set("clickid", payload.clickid);
      url.searchParams.set("event", String(eventNumber));
      url.searchParams.set("value", String(value));
      var img = new Image();
      img.src = url.toString();
    } catch (err) {
      console.warn("VSL: неправильний URL трекінг-проксі", err);
    }
  }

  // Показ форми виконується у main.js, який зберігає оригінальну поведінку.
  function showForm() {
    if (formShown) return;
    formShown = true;
    // Страховка, якщо під час відтворення не виконався основний обробник.
    if (orderElement && orderElement.classList.contains("none")) {
      orderElement.classList.remove("none");
    }
  }

  function timeupdateHandler() {
    var videoTime = Number(video.currentTime) || 0;
    var total = Number(video.duration) || FALLBACK_DURATION;
    if (progressBar) {
      var first = Math.min(50, (videoTime / FORM_SHOW_TIME) * 50);
      var second = videoTime <= FORM_SHOW_TIME ? 0 :
        ((videoTime - FORM_SHOW_TIME) / Math.max(1, total - FORM_SHOW_TIME)) * 50;
      progressBar.style.width = Math.max(0, Math.min(100, first + second)) + "%";
    }
    if (videoTimeText) videoTimeText.textContent =
      formatTime(videoTime) + " / " + formatTime(total);

    if (active) {
      videoEvents.forEach(function (evt) {
        if (videoTime >= evt.time && !triggeredEvents.has(evt.event)) {
          sendBinomEvent(evt.event, 1);
          triggeredEvents.add(evt.event);
        }
      });
    }
    // Ніколи не прив'язуємо реальний показ форми тільки до event9
    if (videoTime >= FORM_SHOW_TIME) showForm();
  }

  // В оригінальному шаблоні відео стартує автоматично БЕЗ звуку.
  // event2 та лічильник перегляду запускаємо після дії глядача,
  // коли він вмикає звук / відновлює перегляд, а не на фоновому autoplay.
  function startTracking() {
    if (started) return;
    started = true;
    active = true;
    sendBinomEvent(2, 1);
    event1Timer = window.setInterval(function () {
      if (!active || video.paused || video.ended) return;
      event1Elapsed += 5;
      sendBinomEvent(1, event1Elapsed);
    }, 5000);
    timeupdateHandler();
  }
  window.addEventListener("vsl:started", startTracking);
  video.addEventListener("play", function () {
    if (!video.muted) startTracking();
  });
  video.addEventListener("timeupdate", timeupdateHandler);
  video.addEventListener("seeked", timeupdateHandler);
  video.addEventListener("loadedmetadata", timeupdateHandler);

  // Зупиняємо відстеження при виході або завершенні перегляду.
  function stopTracking() {
    active = false;
    if (event1Timer !== null) {
      window.clearInterval(event1Timer);
      event1Timer = null;
    }
  }
  window.addEventListener("vsl:back", stopTracking);
  video.addEventListener("ended", stopTracking);
  window.addEventListener("pagehide", stopTracking);

  // Для локальної перевірки через DevTools
  window.VSL_DEBUG = {
    videoEvents: videoEvents,
    formShowTime: FORM_SHOW_TIME,
    getTriggered: function () { return Array.from(triggeredEvents); }
  };
})();
