const video = document.querySelector("#video");
const coments = Array.from(document.querySelectorAll(".coment"));
const placeComent = document.querySelector(".place-coment");
const sectionForm = document.querySelector(".section-form");
const sectionVideo = document.querySelector(".section-video");
const notification = document.querySelector(".notification");
const videoWrap = document.querySelector(".div-video");

// ==========================================
// СОХРАНЕНИЕ ПОЗИЦИИ ВИДЕО (localStorage)
// ==========================================
const SAVE_KEY = 'mx_variste_saved_position';
const FORM_KEY = 'mx_variste_form_shown'; // флаг: форма уже была показана
let formTimerInterval = null; // єдиний інтервал таймера форми

// Если форма уже показывалась — сразу показываем её, скрываем видео
if (localStorage.getItem(FORM_KEY)) {
  showFormWithTimer();
  sectionVideo.style.display = 'none';
}

// Синхронизируем начальное значение счётчика в форме
const formStockInit = document.getElementById('stock-count-form');
if (formStockInit) formStockInit.textContent = getStock();
const SAVE_INTERVAL_SEC = 5;   // сохранять каждые N секунд просмотра
const MIN_SAVE_TIME = 5;       // не сохранять первые N секунд
let lastSaveAt = 0;

function saveVideoPosition(t) {
  try { localStorage.setItem(SAVE_KEY, String(t)); } catch(e) {}
}

function getSavedPosition() {
  try { return parseFloat(localStorage.getItem(SAVE_KEY)) || 0; } catch(e) { return 0; }
}

function fmtTime(sec) {
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// Восстанавливаем позицию когда метаданные загружены
video.addEventListener('loadedmetadata', function() {
  const saved = getSavedPosition();
  const nearEnd = video.duration && (video.duration - saved) < 30;
  if (saved > MIN_SAVE_TIME && !nearEnd && sectionForm.classList.contains('none')) {
    // Пропонуємо продовжити лише після повторного завантаження сторінки.
    // Зупиняємо autoplay, щоб відео не грало за модальним вікном.
    video.pause();
    showResumeBanner(saved);
  }
});

function showResumeBanner(savedTime) {
  // Не створюємо повторне вікно поверх уже відкритого.
  if (document.getElementById('vsl-resume-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'vsl-resume-banner';
  banner.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0;
    background:rgba(0,0,0,0.85); backdrop-filter:blur(6px);
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; z-index:9999; gap:16px;
  `;
  banner.innerHTML = `
    <p style="color:#ccc;font-size:15px;font-family:sans-serif;">Ya viste este video anteriormente</p>
    <p style="color:#fff;font-size:20px;font-family:sans-serif;">¿Continuar desde <b>${fmtTime(savedTime)}</b>?</p>
    <div style="display:flex;gap:12px;margin-top:8px;">
      <button id="btn-vsl-resume" style="padding:12px 28px;background:#e8c96a;color:#111;border:none;border-radius:3px;font-size:14px;cursor:pointer;font-weight:bold;letter-spacing:0.06em;">▶ Continuar</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('btn-vsl-resume').addEventListener('click', function() {
    banner.remove();
    notification.classList.add("none");
    notificationHidden = true;
    // Устанавливаем lastValidTime ДО currentTime, иначе seeking-защита сбросит позицию на 0
    lastValidTime = savedTime;
    lastSaveAt = savedTime;
    video.currentTime = savedTime;
    video.muted = false;
    video.volume = 1;
    window.dispatchEvent(new Event("vsl:started"));
    videoWrap.classList.add("fullscreen");
    document.body.classList.add("no-scroll");
    window.scrollTo(0, 0);
    video.play();
  });
}

// ==========================================
// ЗАЩИТА ВИДЕО ОТ ПЕРЕМОТКИ
// ==========================================
let lastValidTime = 0;

video.addEventListener('timeupdate', function() {
  // Запоминаем текущее время если оно увеличилось не более чем на 2 секунды
  if (video.currentTime - lastValidTime < 2) {
    lastValidTime = video.currentTime;
  }

  // Сохраняем позицию каждые SAVE_INTERVAL_SEC секунд
  const t = video.currentTime;
  if (t > MIN_SAVE_TIME && t - lastSaveAt >= SAVE_INTERVAL_SEC) {
    lastSaveAt = t;
    saveVideoPosition(t);
  }
});

// Если пытаются перемотать — возвращаем назад
video.addEventListener('seeking', function() {
  if (video.currentTime > lastValidTime + 2) {
    video.currentTime = lastValidTime;
  }
});

// Сохраняем при паузе и уходе со страницы
video.addEventListener('pause', function() {
  if (video.currentTime > MIN_SAVE_TIME) saveVideoPosition(video.currentTime);
});

window.addEventListener('beforeunload', function() {
  if (video.currentTime > MIN_SAVE_TIME) saveVideoPosition(video.currentTime);
});

// Сбрасываем после полного просмотра
video.addEventListener('ended', function() {
  localStorage.removeItem(SAVE_KEY);
});

// ==========================================
// НАСТРОЙКИ POPUP
// ==========================================
const POPUP_SHOW_TIME = 745; // Секунда видео, когда показать popup
// ==========================================

// Флаг: была ли плашка уже скрыта
let notificationHidden = false;
let popupShown = false;


const STOCK_KEY     = 'mx_variste_stock';
const STOCK_START   = 19;   // начальное кол-во товара
const STOCK_MIN     = 6;    // минимум (не уходит в 0)
const STOCK_INTERVAL= 10000; // уменьшать каждые N мс

function getStock() {
  try { return parseInt(localStorage.getItem(STOCK_KEY)) || STOCK_START; } catch(e) { return STOCK_START; }
}
function saveStock(n) {
  try { localStorage.setItem(STOCK_KEY, String(n)); } catch(e) {}
  // Синхронизируем с блоком в форме
  const formStock = document.getElementById('stock-count-form');
  if (formStock) formStock.textContent = n;
}

// Создаём popup кнопку
const videoPopup = document.createElement('div');
videoPopup.id = 'video-popup';
videoPopup.innerHTML = `
  <div class="video-popup-content">
    <p>Quedan <span id="stock-count" style="font-weight: bold;">${getStock()}</span> paquetes de Variste.</p>
    <p style="font-weight: bold;">¡Haz tu pedido ahora!</p>
  </div>
`;
videoPopup.style.display = 'none';
document.body.appendChild(videoPopup);

function showComent() {
  coments.forEach((elem) => {
    elem.style.display = "none";
  });

  placeComent.style.flexDirection = "column-reverse";

  let timeShow = 5000;
  coments.forEach((elem) => {
    setTimeout(() => {
      elem.style.display = "flex";
      elem.classList.add("animate-show");
      setTimeout(() => {
        elem.classList.remove("animate-show");
      }, 300);
    }, timeShow);
    timeShow = timeShow + 5000;
  });
}

showComent();

// Функция для показа формы с таймером
function showFormWithTimer() {
    // Сохраняем флаг — форма была показана
    try { localStorage.setItem(FORM_KEY, '1'); } catch(e) {}
    // Сбрасываем сохранённую позицию видео — она больше не нужна
    try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
    sectionForm.classList.remove("none");
    const formAnchor = document.querySelector(".form-anchor");
    if (formAnchor) {
        formAnchor.scrollIntoView({ behavior: "smooth" });
    }
    
    const TIMER_KEY = 'mx_variste_timer_end';
    const TIMER_DURATION = 7 * 60 + 59;
    const timerElement = document.querySelector(".timer");
    let endTime;
    try {
      const saved = parseInt(localStorage.getItem(TIMER_KEY));
      endTime = (saved && saved > Date.now()) ? saved : Date.now() + TIMER_DURATION * 1000;
      localStorage.setItem(TIMER_KEY, String(endTime));
    } catch(e) {
      endTime = Date.now() + TIMER_DURATION * 1000;
    }
 
    function updateTimer() {
      if (!timerElement) return;
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      timerElement.textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
      if (remaining <= 0 && formTimerInterval !== null) {
        clearInterval(formTimerInterval);
        formTimerInterval = null;
      }
    }
    // Не створюємо кілька інтервалів після завершення відео.
    if (formTimerInterval !== null) {
      clearInterval(formTimerInterval);
      formTimerInterval = null;
    }
    updateTimer();
    if (endTime > Date.now()) {
      formTimerInterval = setInterval(updateTimer, 500);
    }
}

// Таймінг Jira: фізичний показ форми, незалежний від event9 у video.js.
const FORM_SHOW_TIME = 393;
let formAlreadyOpened = !sectionForm.classList.contains("none");
video.addEventListener('timeupdate', function() {
  if (video.currentTime >= FORM_SHOW_TIME && !formAlreadyOpened) {
    formAlreadyOpened = true;
    videoWrap.classList.remove('fullscreen');
    document.body.classList.remove('no-scroll');
    showFormWithTimer();
  }
});

// Залишаємо оригінальну структуру pop-up, але не показуємо його після появи форми.
// Показываем popup на определённой секунде видео
video.addEventListener('timeupdate', function() {
  if (!popupShown && notificationHidden && sectionForm.classList.contains('none') && video.currentTime >= POPUP_SHOW_TIME) {
    videoPopup.style.display = 'flex';
    popupShown = true;
    // Сохраняем позицию в момент появления popup
    if (video.currentTime > MIN_SAVE_TIME) saveVideoPosition(video.currentTime);
    // Запускаем счётчик товара с задержкой чтобы DOM успел обновиться
    setTimeout(function() {
      const stockEl = document.getElementById('stock-count');
      if (!stockEl) return;
      const stockTimer = setInterval(function() {
        let current = parseInt(stockEl.textContent);
        if (current > STOCK_MIN) {
          current--;
          stockEl.textContent = current;
          saveStock(current);
        } else {
          clearInterval(stockTimer);
        }
      }, STOCK_INTERVAL);
    }, 100);
  }
});

// Клик на popup — выход из fullscreen и переход к форме
videoPopup.addEventListener('click', function(e) {
  e.stopPropagation();
  video.pause();
  videoPopup.style.display = 'none';
  videoWrap.classList.remove('fullscreen');
  document.body.classList.remove('no-scroll');
  sectionVideo.style.display = 'none';
  showFormWithTimer();
});

// Обработчик окончания видео
video.addEventListener('ended', function() {
    video.pause();
    videoPopup.style.display = 'none';
    videoWrap.classList.remove('fullscreen');
    document.body.classList.remove('no-scroll');
    sectionVideo.style.display = 'none';
    showFormWithTimer();
});

// Обработчик клика по видео/плашке
videoWrap.addEventListener("click", function () {
  if (!notificationHidden) {
    notification.classList.add("none");
    notificationHidden = true;
    video.muted = false;
    window.dispatchEvent(new Event("vsl:started"));
    video.play();
    videoWrap.classList.add("fullscreen");
    document.body.classList.add("no-scroll");
    window.scrollTo(0, 0);
  }
  else if (!popupShown) {
    if (videoWrap.classList.contains("fullscreen")) {
      videoWrap.classList.remove("fullscreen");
      document.body.classList.remove("no-scroll");
      if (video.currentTime > MIN_SAVE_TIME) saveVideoPosition(video.currentTime);
    } else {
      videoWrap.classList.add("fullscreen");
      document.body.classList.add("no-scroll");
      window.scrollTo(0, 0);
    }
  }
});

// При згортанні зберігаємо позицію перегляду та виходимо з fullscreen.
// При поверненні на вкладку НЕ показуємо вікно «Продовжити» знову.
// Вікно доступне лише після нового завантаження сторінки.
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    if (videoWrap.classList.contains('fullscreen')) {
      videoWrap.classList.remove('fullscreen');
      document.body.classList.remove('no-scroll');
    }
    if (video.currentTime > MIN_SAVE_TIME && sectionForm.classList.contains('none')) {
      saveVideoPosition(video.currentTime);
    }
  }
});


// Опционально: показать форму через определенное время, если видео не досмотрели
// setTimeout(() => {
//     showFormWithTimer();
// }, 1150000); // 19 минут как запасной вариант

