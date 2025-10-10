(() => {
  "use strict";

  if (window.__importDepHelperInitialized) {
    return;
  }
  window.__importDepHelperInitialized = true;

  const EXTENSION_ID = "import-dep-extension-ui";
  const DOM_CHECK_INTERVAL = 4000;
  const TURNSTILE_SELECTOR = "input[name=\"cf-turnstile-response\"]";
  const FALLBACK_TURNSTILE_SELECTOR = "input[name=\"cf-chl-widget-f5s01_response\"]";
  const REGISTRATION_URL = "https://import-dep.mega-sy.com/registration";
  const IMPORT_DEP_ACTIVATION_SECRET = "IMPORTDEP2024";
  const NOISE_INDEXES = [2, 5, 9, 14];

  const STORAGE_KEYS = {
    overlayState: "importDepExtensionState",
    overlayPosition: "importDepExtensionPosition",
    savedFormData: "importDepSavedData",
    buttonStates: "importDepButtonStates",
    redirect: "importDepExtensionRedirectEnabled",
    monitoring: "importDepExtensionMonitoringEnabled",
    sound: "importDepExtensionSoundEnabled",
    activation: "importdep_activated",
    activationLogs: "importDepExtensionLogs",
    deviceId: "importdep_device_id"
  };

  const SELECTORS = {
    overlay: `#${EXTENSION_ID}`,
    sellerField: "#seller_name",
    buyerField: "#buyer_name",
    plateField: "#plate_number",
    fieldset: "#formFields",
    submitButton: "#submitBtn",
    orderForm: "#orderForm",
    token: "input[name=\"_token\"]",
    startedAt: "input[name=\"started_at\"]",
    hmac: "input[name=\"hmac\"]",
    availabilityText: "#openText",
    availabilityDot: "#openDot",
    openModal: "#openModal",
    captchaContainer: "#cf-content, [data-translate=\"challenge_page\"], .cf-browser-verification"
  };

  const CLASSES = {
    toastContainer: "ext-toast-container",
    toast: "ext-toast",
    toastInfo: "ext-toast-info",
    toastSuccess: "ext-toast-success",
    toastError: "ext-toast-error",
    toastWarning: "ext-toast-warning",
    btnActive: "btn-active",
    availabilityAvailable: "availability-dot available",
    availabilityUnavailable: "availability-dot unavailable",
    availabilityStopped: "availability-dot stopped",
    minimized: "minimized"
  };

  const UI_TEMPLATE = `
    <div class="extension-header">
      <div class="header-title">
        <span>🔄لوحة التحكم</span>
        <div id="header-expiry-info" class="header-expiry-info" style="display: none;"></div>
      </div>
      <div class="header-controls">
        <button id="ext-reset-btn" class="header-btn" title="إعادة تعيين الموضع">↻</button>
        <button id="ext-minimize-btn" class="header-btn">−</button>
        <button id="ext-close-btn" class="header-btn">×</button>
      </div>
    </div>
    <div class="extension-content">
      <div id="activation-panel" class="activation-panel hidden-when-minimized">
        <div class="activation-message">
          <h4>🔒 تفعيل الإضافة</h4>
          <div id="activation-content">
            <div class="input-group">
              <label for="ext-activation-code">رمز التفعيل:</label>
              <input type="text" id="ext-activation-code" placeholder="أدخل رمز التفعيل">
            </div>
            <div class="button-row">
              <button id="ext-activate-btn" class="btn btn-success">تفعيل</button>
            </div>
            <div class="device-id-display">
              <span id="device-id-text">جاري تحميل معرف الجهاز...</span>
            </div>
            <div class="generator-panel">
              <div class="input-group inline">
                <label for="ext-generator-days">عدد الأيام:</label>
                <input type="number" id="ext-generator-days" min="1" max="365" value="30">
              </div>
              <button id="ext-generate-code" class="btn btn-secondary" title="إنشاء رمز تفعيل جديد">توليد رمز</button>
            </div>
          </div>
        </div>
      </div>
      <div id="main-controls-panel" class="main-controls-panel" style="display: none;">
        <div class="input-panel hidden-when-minimized">
          <div class="panel-header">
            <h4>📝 تفاصيل الطلب</h4>
            <div class="header-buttons">
              <button id="ext-save-data" class="btn-small btn-success" title="حفظ البيانات">💾</button>
              <button id="ext-clear-data" class="btn-small btn-secondary" title="مسح البيانات">🗑️</button>
            </div>
          </div>
          <div class="input-group">
            <input type="text" id="ext-seller-name" maxlength="40" placeholder="أدخل اسم البائع">
            <label for="ext-seller-name">اسم البائع</label>
          </div>
          <div class="input-group">
            <input type="text" id="ext-buyer-name" maxlength="40" placeholder="أدخل اسم المشتري">
            <label for="ext-buyer-name">اسم المشتري</label>
          </div>
          <div class="input-group">
            <input type="text" id="ext-plate-number" maxlength="20" placeholder="أدخل رقم اللوحة">
            <label for="ext-plate-number">رقم اللوحة</label>
          </div>
        </div>
        <div class="control-panel">
          <div class="panel-header">
            <h4>⚙️ أوامر الإرسال</h4>
            <div class="header-buttons">
              <input type="checkbox" id="ext-redirect-toggle" class="redirect-checkbox" checked>
              <label for="ext-redirect-toggle" class="redirect-label" title="تفعيل/تعطيل إعادة التوجيه بعد الإرسال">
                <span class="redirect-icon-enabled">🔄</span>
                <span class="redirect-icon-disabled">⏹️</span>
              </label>
              <input type="checkbox" id="ext-sound-toggle" class="sound-checkbox">
              <label for="ext-sound-toggle" class="sound-label" title="تفعيل/تعطيل الصوت">
                <span class="sound-icon-on">🔊</span>
                <span class="sound-icon-off">🔇</span>
              </label>
              <input type="checkbox" id="ext-monitoring-toggle" class="monitoring-checkbox">
              <label for="ext-monitoring-toggle" class="monitoring-label" title="تفعيل/تعطيل المراقبة">
                <span class="monitoring-icon">👁️</span>
              </label>
            </div>
            <div class="availability-indicator">
              <span class="availability-dot" id="availability-dot"></span>
              <span class="availability-text" id="availability-text">جاري الفحص...</span>
            </div>
          </div>
          <div class="button-grid">
            <div class="button-row">
              <button id="ext-submit-once" class="btn btn-purple">📤 إرسال مرة واحدة</button>
              <button id="ext-trigger-submit" class="btn btn-primary">🚀 تسجيل الطلب</button>
              <button id="ext-auto-submit" class="btn btn-orange toggle-btn">🤖 إرسال تلقائي</button>
            </div>
            <div class="button-row">
              <button id="ext-submit-loop" class="btn btn-warning toggle-btn compact-btn">🔁 إرسال متكرر (ثانية)</button>
              <div class="interval-container">
                <div class="input-group inline">
                  <input type="number" id="ext-interval" min="1" max="9999" value="5">
                </div>
              </div>
            </div>
            <div class="button-row">
              <button id="ext-auto-refresh" class="btn btn-teal toggle-btn compact-btn">🔄 تحديث تلقائي (ثانية)</button>
              <div class="interval-container">
                <div class="input-group inline">
                  <input type="number" id="ext-refresh-interval" min="1" max="9999" value="5">
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="response-panel hidden-when-minimized">
          <div class="response-header">
            <h4>📋 الردود</h4>
            <button id="ext-clear-logs" class="btn-small btn-danger" title="مسح السجل">🗑️</button>
          </div>
          <div id="ext-response-log"></div>
        </div>
      </div>
    </div>
  `;

  function isRegistrationPage() {
    if (!location.href.startsWith(REGISTRATION_URL)) {
      return false;
    }
    const orderForm = document.querySelector(SELECTORS.orderForm);
    const seller = document.querySelector(SELECTORS.sellerField);
    return Boolean(orderForm && seller);
  }

  const html = String.raw;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  class PersistentStore {
    constructor(storage) {
      this.storage = storage;
    }

    get(key, fallback = null) {
      try {
        const raw = this.storage.getItem(key);
        if (!raw) {
          return fallback;
        }
        return JSON.parse(raw);
      } catch (error) {
        console.error("Failed to read storage", key, error);
        return fallback;
      }
    }

    set(key, value) {
      try {
        this.storage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error("Failed to store value", key, error);
      }
    }

    remove(key) {
      try {
        this.storage.removeItem(key);
      } catch (error) {
        console.error("Failed to remove key", key, error);
      }
    }
  }

  class ToastManager {
    constructor(root = document.body) {
      this.root = root;
      this.container = document.createElement("div");
      this.container.className = CLASSES.toastContainer;
      root.appendChild(this.container);
    }

    show(message, type = "info", timeout = 4000) {
      const toast = document.createElement("div");
      toast.className = [CLASSES.toast, this.#typeToClass(type)].join(" ");
      toast.textContent = message;
      this.container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 300);
      }, timeout);
    }

    #typeToClass(type) {
      switch (type) {
        case "success":
          return CLASSES.toastSuccess;
        case "error":
          return CLASSES.toastError;
        case "warning":
          return CLASSES.toastWarning;
        default:
          return CLASSES.toastInfo;
      }
    }
  }

  class Logger {
    constructor(root) {
      this.root = root;
    }

    log(message, status = "info") {
      if (!this.root) {
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = `log-entry log-${status}`;
      const time = new Date().toLocaleTimeString();
      wrapper.innerHTML = `<span class="log-time">${time}</span><span class="log-text">${message}</span>`;
      this.root.prepend(wrapper);
      const maxEntries = 50;
      while (this.root.children.length > maxEntries) {
        this.root.lastElementChild?.remove();
      }
    }

    clear() {
      if (this.root) {
        this.root.innerHTML = "";
      }
    }
  }

  class SoundPlayer {
    constructor() {
      this.context = null;
    }

    async playSuccessTone() {
      try {
        if (!window.AudioContext && !window.webkitAudioContext) {
          throw new Error("AudioContext unavailable");
        }
        if (!this.context) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          this.context = new Ctx();
        }
        const ctx = this.context;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
        oscillator.start(now);
        oscillator.stop(now + 1.1);
      } catch (error) {
        console.warn("Cannot play sound", error);
      }
    }
  }

  class DeviceIdService {
    constructor(store) {
      this.store = store;
      this.cachedId = null;
    }

    async getDeviceId() {
      if (this.cachedId) {
        return this.cachedId;
      }
      const stored = this.store.get(STORAGE_KEYS.deviceId, null);
      if (stored) {
        this.cachedId = stored;
        return stored;
      }
      const generated = await this.#generateFingerprint();
      this.store.set(STORAGE_KEYS.deviceId, generated);
      this.cachedId = generated;
      return generated;
    }

    async #generateFingerprint() {
      try {
        const ua = navigator.userAgent;
        const lang = navigator.language;
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const screenInfo = `${screen.width}x${screen.height}-${screen.colorDepth}`;
        const canvasFingerprint = await this.#getCanvasFingerprint();
        const payload = `${ua}|${lang}|${timeZone}|${screenInfo}|${canvasFingerprint}`;
        let hash = 0;
        for (let i = 0; i < payload.length; i += 1) {
          hash = (hash << 5) - hash + payload.charCodeAt(i);
          hash |= 0;
        }
        return Math.abs(hash).toString(16).substring(0, 12);
      } catch (error) {
        console.warn("Unable to build fingerprint", error);
        return `importdep-${Math.random().toString(24).substring(2, 12)}`;
      }
    }

    async #getCanvasFingerprint() {
      return new Promise((resolve) => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 200;
          canvas.height = 50;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("noctx");
            return;
          }
          ctx.textBaseline = "top";
          ctx.font = "14px 'Arial'";
          ctx.fillStyle = "#f60";
          ctx.fillRect(0, 0, 200, 50);
          ctx.fillStyle = "#069";
          ctx.fillText("IMPORTDEP2024", 2, 2);
          const data = canvas.toDataURL();
          resolve(data);
        } catch (error) {
          resolve("nocanvas");
        }
      });
    }
  }

  class ActivationService {
    constructor(store, toast) {
      this.store = store;
      this.toast = toast;
      this.deviceIdService = new DeviceIdService(store);
      this.state = null;
    }

    async initialize() {
      const activation = this.store.get(STORAGE_KEYS.activation, null);
      if (!activation) {
        this.state = null;
        return false;
      }
      const deviceId = await this.deviceIdService.getDeviceId();
      if (activation.deviceId !== deviceId) {
        this.store.remove(STORAGE_KEYS.activation);
        this.state = null;
        return false;
      }
      if (activation.expiry && new Date(activation.expiry) < new Date()) {
        this.store.remove(STORAGE_KEYS.activation);
        this.state = null;
        return false;
      }
      this.state = activation;
      return true;
    }

    async getDeviceId() {
      return this.deviceIdService.getDeviceId();
    }

    isActivated() {
      return Boolean(this.state);
    }

    getExpiryDate() {
      return this.state?.expiry ?? null;
    }

    async activateWithCode(code) {
      const deviceId = await this.deviceIdService.getDeviceId();
      const payload = this.#decodeActivationCode(code.trim());
      if (!payload) {
        this.toast.show("رمز التفعيل غير صالح", "error");
        return false;
      }
      if (payload.deviceId !== deviceId) {
        this.toast.show("معرف الجهاز غير مطابق", "error");
        return false;
      }
      const expiryDate = new Date(payload.expiryDateTime);
      if (Number.isNaN(expiryDate.getTime())) {
        this.toast.show("صيغة التاريخ غير صحيحة", "error");
        return false;
      }
      if (expiryDate < new Date()) {
        this.toast.show("انتهت صلاحية الرمز", "error");
        return false;
      }
      const state = {
        deviceId,
        expiry: expiryDate.toISOString()
      };
      this.store.set(STORAGE_KEYS.activation, state);
      this.state = state;
      this.toast.show("تم التفعيل بنجاح!", "success");
      return true;
    }

    async generateActivationCode(days = 30) {
      const deviceId = await this.deviceIdService.getDeviceId();
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const formatted = this.#formatDateTime(expiry);
      const reversed = `${deviceId}|${formatted}`.split("").reverse().join("");
      const chars = [];
      let payloadIndex = 0;
      let noiseIndex = 0;
      const noiseChars = IMPORT_DEP_ACTIVATION_SECRET.split("");
      const totalLength = reversed.length + NOISE_INDEXES.length;
      for (let i = 0; i < totalLength; i += 1) {
        if (NOISE_INDEXES.includes(i)) {
          chars.push(noiseChars[noiseIndex % noiseChars.length]);
          noiseIndex += 1;
        } else {
          chars.push(reversed[payloadIndex]);
          payloadIndex += 1;
        }
      }
      return btoa(chars.join(""));
    }

    #decodeActivationCode(code) {
      try {
        const decoded = atob(code);
        let cleaned = "";
        for (let i = 0; i < decoded.length; i += 1) {
          if (!NOISE_INDEXES.includes(i)) {
            cleaned += decoded[i];
          }
        }
        const normalized = cleaned.split("").reverse().join("");
        const [deviceId, expiryDateTime] = normalized.split("|");
        if (!deviceId || !expiryDateTime) {
          return null;
        }
        return { deviceId, expiryDateTime };
      } catch (error) {
        console.error("Error decoding activation code", error);
        return null;
      }
    }

    #formatDateTime(date) {
      const pad = (value) => value.toString().padStart(2, "0");
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  }

  class OverlayController {
    constructor(store, toast, activationService) {
      this.store = store;
      this.toast = toast;
      this.activationService = activationService;
      this.overlay = null;
      this.dragState = null;
    }

    mount() {
      if (document.querySelector(SELECTORS.overlay)) {
        this.overlay = document.querySelector(SELECTORS.overlay);
        return this.overlay;
      }
      const wrapper = document.createElement("div");
      wrapper.id = EXTENSION_ID;
      wrapper.innerHTML = UI_TEMPLATE;
      document.body.appendChild(wrapper);
      this.overlay = wrapper;
      this.#restorePosition();
      this.#restoreMinimizedState();
      this.#bindDragHandlers();
      this.#bindMinimizeControls();
      return wrapper;
    }

    #restorePosition() {
      const position = this.store.get(STORAGE_KEYS.overlayPosition, {
        top: 50,
        right: 50
      });
      this.overlay.style.top = `${position.top}px`;
      this.overlay.style.right = `${position.right}px`;
    }

    #restoreMinimizedState() {
      const state = this.store.get(STORAGE_KEYS.overlayState, { minimized: false });
      if (state.minimized) {
        this.overlay.classList.add(CLASSES.minimized);
      }
      this.#updatePanelVisibility();
    }

    toggleMinimize() {
      this.overlay.classList.toggle(CLASSES.minimized);
      this.#updatePanelVisibility();
      this.store.set(STORAGE_KEYS.overlayState, {
        minimized: this.overlay.classList.contains(CLASSES.minimized)
      });
    }

    showMainPanel() {
      const mainPanel = this.overlay.querySelector("#main-controls-panel");
      const activationPanel = this.overlay.querySelector("#activation-panel");
      if (mainPanel && activationPanel) {
        mainPanel.style.display = "block";
        activationPanel.style.display = "none";
      }
    }

    showActivationPanel() {
      const mainPanel = this.overlay.querySelector("#main-controls-panel");
      const activationPanel = this.overlay.querySelector("#activation-panel");
      if (mainPanel && activationPanel) {
        mainPanel.style.display = "none";
        activationPanel.style.display = "block";
      }
    }

    updateExpiryLabel(expiryIso) {
      const headerExpiry = this.overlay.querySelector("#header-expiry-info");
      if (!headerExpiry) {
        return;
      }
      if (!expiryIso) {
        headerExpiry.style.display = "none";
        headerExpiry.textContent = "";
        return;
      }
      const expiryDate = new Date(expiryIso);
      const now = new Date();
      const remainingMs = expiryDate - now;
      const remainingDays = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60 * 24)));
      headerExpiry.style.display = "block";
      headerExpiry.textContent = `صلاحية الإضافة حتى: ${expiryDate.toLocaleString()} (متبقي: ${remainingDays} يوم)`;
    }

    resetPosition() {
      this.overlay.style.top = "50px";
      this.overlay.style.right = "50px";
      this.store.set(STORAGE_KEYS.overlayPosition, { top: 50, right: 50 });
      this.toast.show("تمت إعادة تعيين موضع اللوحة", "success");
    }

    close() {
      this.overlay.remove();
      window.__importDepHelperInitialized = false;
    }

    #bindDragHandlers() {
      const header = this.overlay.querySelector(".extension-header");
      if (!header) {
        return;
      }
      header.addEventListener("mousedown", (event) => {
        if (event.target.closest("button")) {
          return;
        }
        this.dragState = {
          startX: event.clientX,
          startY: event.clientY,
          initialTop: parseInt(this.overlay.style.top, 10) || 50,
          initialRight: parseInt(this.overlay.style.right, 10) || 50
        };
        document.addEventListener("mousemove", this.#handleDragMove);
        document.addEventListener("mouseup", this.#handleDragEnd, { once: true });
      });
    }

    #handleDragMove = (event) => {
      if (!this.dragState) {
        return;
      }
      const deltaX = event.clientX - this.dragState.startX;
      const deltaY = event.clientY - this.dragState.startY;
      const newTop = clamp(this.dragState.initialTop + deltaY, 10, window.innerHeight - 120);
      const newRight = clamp(this.dragState.initialRight - deltaX, 10, window.innerWidth - 260);
      this.overlay.style.top = `${newTop}px`;
      this.overlay.style.right = `${newRight}px`;
    };

    #handleDragEnd = () => {
      document.removeEventListener("mousemove", this.#handleDragMove);
      const top = parseInt(this.overlay.style.top, 10) || 50;
      const right = parseInt(this.overlay.style.right, 10) || 50;
      this.store.set(STORAGE_KEYS.overlayPosition, { top, right });
      this.dragState = null;
    };

    #bindMinimizeControls() {
      const minimizeButton = this.overlay.querySelector("#ext-minimize-btn");
      const closeButton = this.overlay.querySelector("#ext-close-btn");
      const resetButton = this.overlay.querySelector("#ext-reset-btn");
      minimizeButton?.addEventListener("click", () => this.toggleMinimize());
      closeButton?.addEventListener("click", () => this.close());
      resetButton?.addEventListener("click", () => this.resetPosition());
    }

    #updatePanelVisibility() {
      const minimized = this.overlay.classList.contains(CLASSES.minimized);
      const toToggle = this.overlay.querySelectorAll(".hidden-when-minimized");
      toToggle.forEach((element) => {
        element.style.display = minimized ? "none" : "";
      });
    }
  }

  class ButtonStateManager {
    constructor(store) {
      this.store = store;
    }

    save(state) {
      this.store.set(STORAGE_KEYS.buttonStates, state);
    }

    load(defaults) {
      return this.store.get(STORAGE_KEYS.buttonStates, defaults);
    }
  }

  class FormBridge {
    constructor(toast, logger, store, activationService, overlayRoot = null) {
      this.toast = toast;
      this.logger = logger;
      this.store = store;
      this.activationService = activationService;
      this.overlayRoot = overlayRoot;
    }

    get form() {
      return document.querySelector(SELECTORS.orderForm);
    }

    get sellerField() {
      return document.querySelector(SELECTORS.sellerField);
    }

    get buyerField() {
      return document.querySelector(SELECTORS.buyerField);
    }

    get plateField() {
      return document.querySelector(SELECTORS.plateField);
    }

    get submitButton() {
      return document.querySelector(SELECTORS.submitButton);
    }

    get overlaySellerField() {
      return this.overlayRoot?.querySelector("#ext-seller-name") ?? null;
    }

    get overlayBuyerField() {
      return this.overlayRoot?.querySelector("#ext-buyer-name") ?? null;
    }

    get overlayPlateField() {
      return this.overlayRoot?.querySelector("#ext-plate-number") ?? null;
    }

    enableFields() {
      [this.fieldset(), this.sellerField, this.buyerField, this.plateField, this.submitButton]
        .filter(Boolean)
        .forEach((element) => {
          element.disabled = false;
          element.removeAttribute("readonly");
          element.style.opacity = "1";
          element.style.pointerEvents = "auto";
        });
    }

    fieldset() {
      return document.querySelector(SELECTORS.fieldset);
    }

    fillFromStorage() {
      const saved = this.store.get(STORAGE_KEYS.savedFormData, null);
      if (!saved) {
        return;
      }
      const { sellerName, buyerName, plateNumber } = saved;
      if (sellerName) {
        this.sellerField.value = sellerName;
      }
      if (buyerName) {
        this.buyerField.value = buyerName;
      }
      if (plateNumber) {
        this.plateField.value = plateNumber;
      }
      this.toast.show("تم تحميل البيانات المحفوظة", "success");
    }

    readFormDataFromInputs() {
      const sellerName = this.overlaySellerField?.value?.trim() || this.sellerField?.value?.trim() || "";
      const buyerName = this.overlayBuyerField?.value?.trim() || this.buyerField?.value?.trim() || "";
      const plateNumber = this.overlayPlateField?.value?.trim() || this.plateField?.value?.trim() || "";
      return {
        sellerName,
        buyerName,
        plateNumber
      };
    }

    saveFormData(data) {
      if (!data.sellerName || !data.buyerName || !data.plateNumber) {
        this.toast.show("جميع الحقول مطلوبة للحفظ", "error");
        return false;
      }
      this.store.set(STORAGE_KEYS.savedFormData, data);
      this.toast.show("تم حفظ البيانات بنجاح", "success");
      return true;
    }

    clearFormData() {
      this.store.remove(STORAGE_KEYS.savedFormData);
      if (this.sellerField) this.sellerField.value = "";
      if (this.buyerField) this.buyerField.value = "";
      if (this.plateField) this.plateField.value = "";
      if (this.overlaySellerField) this.overlaySellerField.value = "";
      if (this.overlayBuyerField) this.overlayBuyerField.value = "";
      if (this.overlayPlateField) this.overlayPlateField.value = "";
      this.toast.show("تم مسح البيانات", "success");
    }

    fillWebsiteFields(data) {
      if (this.sellerField && data.sellerName) {
        this.sellerField.value = data.sellerName;
      }
      if (this.buyerField && data.buyerName) {
        this.buyerField.value = data.buyerName;
      }
      if (this.plateField && data.plateNumber) {
        this.plateField.value = data.plateNumber;
      }
      this.enableFields();
      [this.sellerField, this.buyerField, this.plateField]
        .filter(Boolean)
        .forEach((input) => {
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    async submitOrder(data) {
      if (!this.activationService.isActivated()) {
        const activated = await this.activationService.initialize();
        if (!activated) {
          this.toast.show("الرجاء تفعيل الإضافة أولاً", "error");
          return null;
        }
      }

      const form = this.form;
      const seller = this.sellerField;
      const buyer = this.buyerField;
      const plate = this.plateField;
      if (!form || !seller || !buyer || !plate) {
        this.toast.show("لا يمكن العثور على عناصر النموذج", "error");
        return null;
      }

      const turnstileValue = document.querySelector(TURNSTILE_SELECTOR)?.value ||
        document.querySelector(FALLBACK_TURNSTILE_SELECTOR)?.value ||
        "";
      if (!turnstileValue) {
        this.toast.show("CAPTCHA مطلوب", "error");
        return null;
      }

      const payload = new FormData();
      const values = {
        _token: document.querySelector(SELECTORS.token)?.value || "",
        started_at: document.querySelector(SELECTORS.startedAt)?.value || "",
        hmac: document.querySelector(SELECTORS.hmac)?.value || "",
        seller_name: data.sellerName,
        buyer_name: data.buyerName,
        plate_number: data.plateNumber,
        "cf-turnstile-response": turnstileValue
      };

      for (const [key, value] of Object.entries(values)) {
        if (value) {
          payload.append(key, value);
        }
      }

      form.querySelectorAll("input, select, textarea").forEach((field) => {
        const name = field.name;
        if (name && !values[name] && !field.disabled) {
          payload.append(name, field.value);
        }
      });

      this.logger.log(`جاري إرسال الطلب: البائع: ${data.sellerName}, المشتري: ${data.buyerName}, اللوحة: ${data.plateNumber}`, "info");

      try {
        const response = await fetch(REGISTRATION_URL, {
          method: "POST",
          body: payload,
          credentials: "include",
          headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Cache-Control": "no-cache"
          }
        });
        const text = await response.text();
        this.logger.log("تم إرسال الطلب - جاري تحليل النتيجة", "success");
        this.#handleSubmissionResponse(text);
        return true;
      } catch (error) {
        this.logger.log(`خطأ في الاتصال: ${error.message}`, "error");
        this.toast.show("حدث خطأ أثناء الاتصال", "error");
        return false;
      }
    }

    #handleSubmissionResponse(responseText) {
      if (!responseText) {
        this.logger.log("لم يتم تلقي رد من الخادم", "warning");
        return;
      }
      if (responseText.includes("تم تسجيل طلبك بنجاح")) {
        this.logger.log("تم تسجيل الطلب بنجاح!", "success");
      } else if (responseText.includes("تم رفض الطلب")) {
        this.logger.log("تم رفض الطلب، سيتم تحديث الصفحة", "error");
      } else {
        this.logger.log("تم إرسال الطلب - جاري التحقق من النتيجة...", "info");
      }
    }
  }

  class AvailabilityMonitor {
    constructor(toast, soundPlayer) {
      this.toast = toast;
      this.soundPlayer = soundPlayer;
      this.dot = null;
      this.label = null;
      this.monitoringEnabled = false;
      this.intervalHandle = null;
      this.lastAvailability = null;
      this.callbacks = new Set();
      this.soundEnabled = false;
    }

    initialize(dot, label) {
      this.dot = dot;
      this.label = label;
    }

    onChange(callback) {
      this.callbacks.add(callback);
    }

    setSoundEnabled(enabled) {
      this.soundEnabled = enabled;
    }

    setEnabled(enabled) {
      this.monitoringEnabled = enabled;
      if (!enabled) {
        this.#updateUI(false, "مراقبة متوقفة", true);
        this.stop();
      } else {
        this.start();
      }
    }

    start() {
      this.stop();
      this.checkAvailability();
      this.intervalHandle = setInterval(() => this.checkAvailability(), DOM_CHECK_INTERVAL);
    }

    stop() {
      if (this.intervalHandle) {
        clearInterval(this.intervalHandle);
        this.intervalHandle = null;
      }
    }

    checkAvailability() {
      if (!this.monitoringEnabled) {
        return;
      }
      const textNode = document.querySelector(SELECTORS.availabilityText);
      const dotNode = document.querySelector(SELECTORS.availabilityDot);
      let available = false;
      let message = "جاري الفحص...";
      if (textNode && textNode.textContent) {
        if (textNode.textContent.includes("التسجيل متاح الآن")) {
          available = true;
          message = "النظام متاح ✅";
        } else if (textNode.textContent.includes("التسجيل غير متاح")) {
          available = false;
          message = "النظام غير متاح ❌";
        }
      }
      if (dotNode) {
        if (dotNode.classList.contains("bg-green-400")) {
          available = true;
          message = "النظام متاح ✅";
        } else if (dotNode.classList.contains("bg-red-400")) {
          available = false;
          message = "النظام غير متاح ❌";
        }
      }
      this.#updateAvailability(available, message);
    }

    #updateAvailability(available, message) {
      if (available === this.lastAvailability) {
        this.#updateUI(available, message);
        return;
      }
      this.lastAvailability = available;
      this.#updateUI(available, message);
      this.callbacks.forEach((callback) => {
        try {
          callback(available, message);
        } catch (error) {
          console.error("Availability callback failed", error);
        }
      });
      if (available && this.soundEnabled) {
        this.soundPlayer.playSuccessTone();
      }
    }

    #updateUI(available, message, stopped = false) {
      if (!this.dot || !this.label) {
        return;
      }
      this.label.textContent = message;
      if (stopped) {
        this.dot.className = "availability-dot stopped";
      } else {
        this.dot.className = available ? CLASSES.availabilityAvailable : CLASSES.availabilityUnavailable;
      }
    }
  }

  class AutomationController {
    constructor(formBridge, toast) {
      this.formBridge = formBridge;
      this.toast = toast;
      this.submitLoopHandle = null;
      this.autoRefreshHandle = null;
      this.autoSubmitHandle = null;
      this.redirectEnabled = true;
      this.autoSubmitEnabled = false;
      this.availabilityMonitor = null;
      this.formDataProvider = () => this.formBridge.readFormDataFromInputs();
    }

    attachAvailabilityMonitor(monitor) {
      this.availabilityMonitor = monitor;
      monitor.onChange((available) => {
        if (available && this.autoSubmitEnabled) {
          const data = this.formDataProvider();
          if (data.sellerName && data.buyerName && data.plateNumber) {
            this.formBridge.fillWebsiteFields(data);
            setTimeout(() => this.formBridge.submitOrder(data), 500);
          } else {
            this.toast.show("البيانات غير مكتملة للإرسال التلقائي", "error");
          }
        }
      });
    }

    setRedirectEnabled(enabled) {
      this.redirectEnabled = enabled;
    }

    startSubmitLoop(intervalSeconds) {
      this.stopSubmitLoop();
      const intervalMs = Math.max(1, intervalSeconds) * 1000;
      this.submitLoopHandle = setInterval(() => {
        const data = this.formDataProvider();
        this.formBridge.fillWebsiteFields(data);
        this.formBridge.submitOrder(data);
      }, intervalMs);
      this.toast.show(`بدأ الإرسال المتكرر بفاصل ${intervalSeconds} ثانية`, "success");
    }

    stopSubmitLoop() {
      if (this.submitLoopHandle) {
        clearInterval(this.submitLoopHandle);
        this.submitLoopHandle = null;
        this.toast.show("تم إيقاف الإرسال المتكرر", "info");
      }
    }

    toggleAutoSubmit(enabled) {
      this.autoSubmitEnabled = enabled;
      if (enabled) {
        this.toast.show("تم تفعيل الإرسال التلقائي", "success");
        if (this.availabilityMonitor?.lastAvailability) {
          const data = this.formDataProvider();
          if (data.sellerName && data.buyerName && data.plateNumber) {
            this.formBridge.fillWebsiteFields(data);
            this.formBridge.submitOrder(data);
          }
        }
      } else {
        this.toast.show("تم تعطيل الإرسال التلقائي", "info");
      }
    }

    startAutoRefresh(intervalSeconds) {
      this.stopAutoRefresh();
      const intervalMs = Math.max(1, intervalSeconds) * 1000;
      this.autoRefreshHandle = setInterval(() => {
        if (this.redirectEnabled) {
          this.toast.show("جاري إعادة التوجيه...", "info");
          window.location.href = REGISTRATION_URL;
        } else {
          this.toast.show("التحديث التلقائي موقوف لأن إعادة التوجيه معطلة", "warning");
        }
      }, intervalMs);
      this.toast.show(`تم تفعيل التحديث التلقائي كل ${intervalSeconds} ثانية`, "success");
    }

    stopAutoRefresh() {
      if (this.autoRefreshHandle) {
        clearInterval(this.autoRefreshHandle);
        this.autoRefreshHandle = null;
        this.toast.show("تم إيقاف التحديث التلقائي", "info");
      }
    }
  }

  async function initialize() {
    if (!isRegistrationPage()) {
      return;
    }

    const store = new PersistentStore(localStorage);
    const toast = new ToastManager();
    const activationService = new ActivationService(store, toast);
    await activationService.initialize();

    const overlayController = new OverlayController(store, toast, activationService);
    const overlay = overlayController.mount();

    const logRoot = overlay.querySelector("#ext-response-log");
    const logger = new Logger(logRoot);
    const formBridge = new FormBridge(toast, logger, store, activationService, overlay);
    formBridge.enableFields();

    const availabilityDot = overlay.querySelector("#availability-dot");
    const availabilityText = overlay.querySelector("#availability-text");
    const soundPlayer = new SoundPlayer();
    const availabilityMonitor = new AvailabilityMonitor(toast, soundPlayer);
    availabilityMonitor.initialize(availabilityDot, availabilityText);

    const automation = new AutomationController(formBridge, toast);
    automation.attachAvailabilityMonitor(availabilityMonitor);

    const buttonStateManager = new ButtonStateManager(store);
    const savedStates = buttonStateManager.load({
      redirectEnabled: store.get(STORAGE_KEYS.redirect, true),
      soundEnabled: store.get(STORAGE_KEYS.sound, false),
      monitoringEnabled: store.get(STORAGE_KEYS.monitoring, false)
    });

    const redirectToggle = overlay.querySelector("#ext-redirect-toggle");
    const soundToggle = overlay.querySelector("#ext-sound-toggle");
    const monitoringToggle = overlay.querySelector("#ext-monitoring-toggle");

    redirectToggle.checked = savedStates.redirectEnabled;
    soundToggle.checked = savedStates.soundEnabled;
    monitoringToggle.checked = savedStates.monitoringEnabled;

    automation.setRedirectEnabled(savedStates.redirectEnabled);
    availabilityMonitor.setEnabled(savedStates.monitoringEnabled);
    availabilityMonitor.setSoundEnabled(savedStates.soundEnabled);

    const deviceIdText = overlay.querySelector("#device-id-text");
    activationService.getDeviceId().then((id) => {
      if (deviceIdText) {
        deviceIdText.textContent = `معرف الجهاز: ${id}`;
      }
    });

    function refreshActivationState() {
      if (activationService.isActivated()) {
        overlayController.showMainPanel();
        overlayController.updateExpiryLabel(activationService.getExpiryDate());
      } else {
        overlayController.showActivationPanel();
        overlayController.updateExpiryLabel(null);
      }
    }

    refreshActivationState();

    overlay.querySelector("#ext-generate-code")?.addEventListener("click", async () => {
      const days = Number(overlay.querySelector("#ext-generator-days")?.value || "30");
      const activationCode = await activationService.generateActivationCode(days);
      navigator.clipboard.writeText(activationCode).then(() => {
        toast.show("تم نسخ رمز التفعيل", "success");
      }).catch(() => {
        toast.show("رمز التفعيل: " + activationCode, "info");
      });
    });

    overlay.querySelector("#ext-activate-btn")?.addEventListener("click", async () => {
      const input = overlay.querySelector("#ext-activation-code");
      const code = input?.value || "";
      if (!code.trim()) {
        toast.show("يرجى إدخال رمز التفعيل", "error");
        return;
      }
      const success = await activationService.activateWithCode(code);
      if (success) {
        refreshActivationState();
      }
    });

    overlay.querySelector("#ext-save-data")?.addEventListener("click", () => {
      const data = formBridge.readFormDataFromInputs();
      formBridge.saveFormData(data);
    });

    overlay.querySelector("#ext-clear-data")?.addEventListener("click", () => {
      formBridge.clearFormData();
    });

    overlay.querySelector("#ext-clear-logs")?.addEventListener("click", () => {
      logger.clear();
    });

    overlay.querySelector("#ext-submit-once")?.addEventListener("click", () => {
      const data = formBridge.readFormDataFromInputs();
      if (!data.sellerName || !data.buyerName || !data.plateNumber) {
        toast.show("جميع الحقول مطلوبة", "error");
        return;
      }
      formBridge.fillWebsiteFields(data);
      formBridge.submitOrder(data);
    });

    overlay.querySelector("#ext-trigger-submit")?.addEventListener("click", () => {
      const saved = store.get(STORAGE_KEYS.savedFormData, null);
      if (!saved) {
        toast.show("لا يوجد بيانات محفوظة", "error");
        return;
      }
      formBridge.fillWebsiteFields(saved);
      formBridge.submitOrder(saved);
    });

    const autoSubmitButton = overlay.querySelector("#ext-auto-submit");
    autoSubmitButton?.addEventListener("click", () => {
      const enabled = !autoSubmitButton.classList.contains(CLASSES.btnActive);
      automation.toggleAutoSubmit(enabled);
      autoSubmitButton.classList.toggle(CLASSES.btnActive, enabled);
    });

    overlay.querySelector("#ext-submit-loop")?.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const intervalInput = overlay.querySelector("#ext-interval");
      const interval = Number(intervalInput?.value || "5");
      if (button.classList.contains(CLASSES.btnActive)) {
        automation.stopSubmitLoop();
        button.classList.remove(CLASSES.btnActive);
      } else {
        const data = formBridge.readFormDataFromInputs();
        if (!data.sellerName || !data.buyerName || !data.plateNumber) {
          toast.show("جميع الحقول مطلوبة", "error");
          return;
        }
        automation.startSubmitLoop(interval);
        button.classList.add(CLASSES.btnActive);
      }
    });

    overlay.querySelector("#ext-auto-refresh")?.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const intervalInput = overlay.querySelector("#ext-refresh-interval");
      const interval = Number(intervalInput?.value || "5");
      if (button.classList.contains(CLASSES.btnActive)) {
        automation.stopAutoRefresh();
        button.classList.remove(CLASSES.btnActive);
      } else {
        automation.startAutoRefresh(interval);
        button.classList.add(CLASSES.btnActive);
      }
    });

    redirectToggle.addEventListener("change", () => {
      automation.setRedirectEnabled(redirectToggle.checked);
      store.set(STORAGE_KEYS.redirect, redirectToggle.checked);
      buttonStateManager.save({
        redirectEnabled: redirectToggle.checked,
        soundEnabled: soundToggle.checked,
        monitoringEnabled: monitoringToggle.checked
      });
    });

    soundToggle.addEventListener("change", () => {
      store.set(STORAGE_KEYS.sound, soundToggle.checked);
      availabilityMonitor.setSoundEnabled(soundToggle.checked);
      buttonStateManager.save({
        redirectEnabled: redirectToggle.checked,
        soundEnabled: soundToggle.checked,
        monitoringEnabled: monitoringToggle.checked
      });
    });

    monitoringToggle.addEventListener("change", () => {
      availabilityMonitor.setEnabled(monitoringToggle.checked);
      store.set(STORAGE_KEYS.monitoring, monitoringToggle.checked);
      buttonStateManager.save({
        redirectEnabled: redirectToggle.checked,
        soundEnabled: soundToggle.checked,
        monitoringEnabled: monitoringToggle.checked
      });
    });

    const savedData = store.get(STORAGE_KEYS.savedFormData, null);
    if (savedData) {
      overlay.querySelector("#ext-seller-name").value = savedData.sellerName || "";
      overlay.querySelector("#ext-buyer-name").value = savedData.buyerName || "";
      overlay.querySelector("#ext-plate-number").value = savedData.plateNumber || "";
    }

    formBridge.fillFromStorage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
