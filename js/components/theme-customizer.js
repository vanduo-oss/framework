/**
 * Vanduo Framework - Theme Customizer
 * A comprehensive theme customization component for the navbar
 * Handles primary color, neutral color, radius, font, and color mode
 */

(function () {
  'use strict';

  const ThemeCustomizer = {
    // Storage keys
    STORAGE_KEYS: {
      PRIMARY: 'vanduo-primary-color',
      NEUTRAL: 'vanduo-neutral-color',
      RADIUS: 'vanduo-radius',
      FONT: 'vanduo-font-preference',
      THEME: 'vanduo-theme-preference'
    },

    // Default values
    DEFAULTS: {
      PRIMARY_LIGHT: 'black',
      PRIMARY_DARK: 'amber',
      NEUTRAL: 'neutral',
      RADIUS: '0.5',
      FONT: 'ubuntu',
      THEME: 'system'
    },

    // Primary color definitions (Open Color based)
    PRIMARY_COLORS: {
      'black': { name: 'Black', color: '#000000' },
      'red': { name: 'Red', color: '#fa5252' },
      'orange': { name: 'Orange', color: '#fd7e14' },
      'amber': { name: 'Amber', color: '#f59f00' },
      'yellow': { name: 'Yellow', color: '#fcc419' },
      'lime': { name: 'Lime', color: '#82c91e' },
      'green': { name: 'Green', color: '#40c057' },
      'emerald': { name: 'Emerald', color: '#20c997' },
      'teal': { name: 'Teal', color: '#12b886' },
      'cyan': { name: 'Cyan', color: '#22b8cf' },
      'sky': { name: 'Sky', color: '#3bc9db' },
      'blue': { name: 'Blue', color: '#228be6' },
      'indigo': { name: 'Indigo', color: '#4c6ef5' },
      'violet': { name: 'Violet', color: '#7950f2' },
      'purple': { name: 'Purple', color: '#be4bdb' },
      'fuchsia': { name: 'Fuchsia', color: '#f06595' },
      'pink': { name: 'Pink', color: '#e64980' },
      'rose': { name: 'Rose', color: '#ff8787' }
    },

    // Neutral color definitions
    NEUTRAL_COLORS: {
      'slate': { name: 'Slate', color: '#64748b' },
      'gray': { name: 'Gray', color: '#6b7280' },
      'zinc': { name: 'Zinc', color: '#71717a' },
      'neutral': { name: 'Neutral', color: '#737373' },
      'stone': { name: 'Stone', color: '#78716c' }
    },

    // Radius options
    RADIUS_OPTIONS: ['0', '0.125', '0.25', '0.375', '0.5'],

    // Font options
    FONT_OPTIONS: {
      'jetbrains-mono': { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
      'inter': { name: 'Inter', family: "'Inter', sans-serif" },
      'source-sans': { name: 'Source Sans 3', family: "'Source Sans 3', sans-serif" },
      'fira-sans': { name: 'Fira Sans', family: "'Fira Sans', sans-serif" },
      'ibm-plex': { name: 'IBM Plex Sans', family: "'IBM Plex Sans', sans-serif" },
      'system': { name: 'System Default', family: null },
      // Google Fonts Collection
      'ubuntu': { name: 'Ubuntu', family: "'Ubuntu', sans-serif" },
      'open-sans': { name: 'Open Sans', family: "'Open Sans', sans-serif" },
      'rubik': { name: 'Rubik', family: "'Rubik', sans-serif" },
      'titillium-web': { name: 'Titillium Web', family: "'Titillium Web', sans-serif" }
    },

    // Theme mode options
    THEME_MODES: ['system', 'dark', 'light'],

    // State
    state: {
      primary: null,
      neutral: null,
      radius: null,
      font: null,
      theme: null,
      isOpen: false
    },

    isInitialized: false,
    _cleanup: [],

    // DOM references
    elements: {
      customizer: null,
      trigger: null,
      panel: null,
      overlay: null
    },

    /**
     * Initialize the Theme Customizer
     */
    init: function () {
      if (this.isInitialized) {
        this.bindExistingElements();
        this.bindPanelEvents();
        this.updateUI();
        return;
      }

      this.isInitialized = true;
      this._cleanup = [];

      this.loadPreferences();
      this.applyAllPreferences();
      this.bindExistingElements();
      this.bindEvents();

      console.log('Vanduo Theme Customizer initialized');
    },

    addListener: function (target, event, handler, options) {
      if (!target) return;
      target.addEventListener(event, handler, options);
      this._cleanup.push(() => target.removeEventListener(event, handler, options));
    },

    /**
     * Get default primary color based on theme
     */
    getDefaultPrimary: function (theme) {
      if (theme === 'system') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return this.DEFAULTS.PRIMARY_DARK;
        }
        return this.DEFAULTS.PRIMARY_LIGHT;
      }
      return theme === 'dark' ? this.DEFAULTS.PRIMARY_DARK : this.DEFAULTS.PRIMARY_LIGHT;
    },

    /**
     * Load preferences from localStorage
     */
    loadPreferences: function () {
      this.state.theme = this.getStorageValue(this.STORAGE_KEYS.THEME, this.DEFAULTS.THEME);
      this.state.primary = this.getStorageValue(this.STORAGE_KEYS.PRIMARY, this.getDefaultPrimary(this.state.theme));
      this.state.neutral = this.getStorageValue(this.STORAGE_KEYS.NEUTRAL, this.DEFAULTS.NEUTRAL);
      this.state.radius = this.getStorageValue(this.STORAGE_KEYS.RADIUS, this.DEFAULTS.RADIUS);
      this.state.font = this.getStorageValue(this.STORAGE_KEYS.FONT, this.DEFAULTS.FONT);
    },

    /**
     * Save a preference to localStorage
     */
    savePreference: function (key, value) {
      this.setStorageValue(key, value);
    },

    /**
     * Apply all preferences
     */
    applyAllPreferences: function () {
      this.applyPrimary(this.state.primary);
      this.applyNeutral(this.state.neutral);
      this.applyRadius(this.state.radius);
      this.applyFont(this.state.font);
      this.applyTheme(this.state.theme);
    },

    /**
     * Apply primary color
     */
    applyPrimary: function (colorKey) {
      if (!this.PRIMARY_COLORS[colorKey]) {
        colorKey = this.getDefaultPrimary(this.state.theme);
      }

      this.state.primary = colorKey;
      document.documentElement.setAttribute('data-primary', colorKey);
      this.savePreference(this.STORAGE_KEYS.PRIMARY, colorKey);

      this.dispatchEvent('primary-change', { color: colorKey });
    },

    /**
     * Apply neutral color
     */
    applyNeutral: function (neutralKey) {
      if (!this.NEUTRAL_COLORS[neutralKey]) {
        neutralKey = this.DEFAULTS.NEUTRAL;
      }

      this.state.neutral = neutralKey;
      document.documentElement.setAttribute('data-neutral', neutralKey);
      this.savePreference(this.STORAGE_KEYS.NEUTRAL, neutralKey);

      this.dispatchEvent('neutral-change', { neutral: neutralKey });
    },

    /**
     * Apply border radius
     */
    applyRadius: function (radius) {
      if (!this.RADIUS_OPTIONS.includes(radius)) {
        radius = this.DEFAULTS.RADIUS;
      }

      this.state.radius = radius;
      document.documentElement.setAttribute('data-radius', radius);
      document.documentElement.style.setProperty('--radius-scale', radius);
      this.savePreference(this.STORAGE_KEYS.RADIUS, radius);

      this.dispatchEvent('radius-change', { radius: radius });
    },

    /**
     * Apply font family
     */
    applyFont: function (fontKey) {
      if (!this.FONT_OPTIONS[fontKey]) {
        fontKey = this.DEFAULTS.FONT;
      }

      this.state.font = fontKey;

      if (fontKey === 'system') {
        document.documentElement.removeAttribute('data-font');
      } else {
        document.documentElement.setAttribute('data-font', fontKey);
      }

      this.savePreference(this.STORAGE_KEYS.FONT, fontKey);

      // Also update the existing FontSwitcher if available
      if (window.FontSwitcher && window.FontSwitcher.setPreference) {
        window.FontSwitcher.state.preference = fontKey;
        window.FontSwitcher.applyFont();
      }

      this.dispatchEvent('font-change', { font: fontKey });
    },

    /**
     * Apply theme mode
     */
    applyTheme: function (mode) {
      if (!this.THEME_MODES.includes(mode)) {
        mode = this.DEFAULTS.THEME;
      }

      // Check if we should switch primary color (if using default)
      const oldDefault = this.getDefaultPrimary(this.state.theme);
      if (this.state.primary === oldDefault) {
        const newDefault = this.getDefaultPrimary(mode);
        if (newDefault !== this.state.primary) {
          this.applyPrimary(newDefault);
        }
      }

      this.state.theme = mode;

      if (mode === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', mode);
      }

      this.savePreference(this.STORAGE_KEYS.THEME, mode);

      // Also update the existing ThemeSwitcher if available
      if (window.Vanduo && window.Vanduo.components.themeSwitcher) {
        const themeSwitcher = window.Vanduo.components.themeSwitcher;
        if (themeSwitcher.state) {
          themeSwitcher.state.preference = mode;
        }
      }

      this.dispatchEvent('mode-change', { mode: mode });
    },

    /**
     * Dispatch custom event
     */
    dispatchEvent: function (type, detail) {
      const event = new CustomEvent('theme:' + type, {
        bubbles: true,
        detail: detail
      });
      document.dispatchEvent(event);

      // Also dispatch a general change event
      const changeEvent = new CustomEvent('theme:change', {
        bubbles: true,
        detail: {
          type: type,
          value: detail[Object.keys(detail)[0]],
          state: { ...this.state }
        }
      });
      document.dispatchEvent(changeEvent);
    },

    /**
     * Bind to existing DOM elements or create them dynamically
     */
    bindExistingElements: function () {
      // First check for existing full structure
      this.elements.customizer = document.querySelector('.vd-theme-customizer');

      if (this.elements.customizer) {
        this.elements.trigger = this.elements.customizer.querySelector('.vd-theme-customizer-trigger');
        this.elements.panel = this.elements.customizer.querySelector('.vd-theme-customizer-panel');
        this.elements.overlay = this.elements.customizer.querySelector('.vd-theme-customizer-overlay');
      } else {
        // Look for standalone trigger button with data attribute
        const standaloneTrigger = document.querySelector('[data-theme-customizer-trigger]');
        if (standaloneTrigger) {
          this.createDynamicPanel(standaloneTrigger);
        }
      }

      // Update UI to reflect current state
      this.updateUI();
    },

    /**
     * Create the panel dynamically when only a trigger button exists
     */
    createDynamicPanel: function (triggerButton) {
      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'vd-theme-customizer';

      // Move trigger into wrapper or create reference
      this.elements.trigger = triggerButton;

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'vd-theme-customizer-overlay';

      // Create panel
      const panel = document.createElement('div');
      panel.className = 'vd-theme-customizer-panel';
      panel.innerHTML = this.getPanelHTML();

      // Append to body
      document.body.appendChild(overlay);
      document.body.appendChild(panel);

      // Store references
      this.elements.panel = panel;
      this.elements.overlay = overlay;
      this.elements.customizer = { contains: (el) => panel.contains(el) || triggerButton.contains(el) };

      // Position panel below trigger on desktop
      this.positionPanel();

      // Bind panel events after creation
      this.bindPanelEvents();

      // Reposition on resize
      this.addListener(window, 'resize', () => this.positionPanel());
    },

    /**
     * Position the panel below the trigger button on desktop
     */
    positionPanel: function () {
      if (!this.elements.panel || !this.elements.trigger) return;

      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        // Mobile: full height slide-in from right - let CSS handle it
        this.elements.panel.style.top = '';
        this.elements.panel.style.right = '';
        this.elements.panel.style.left = '';
        this.elements.panel.style.height = '';
        this.elements.panel.style.maxHeight = '';
      } else {
        // Desktop: position directly below the trigger button, aligned to its right edge
        const triggerRect = this.elements.trigger.getBoundingClientRect();
        const panelWidth = 320; // --customizer-width
        const panelTop = triggerRect.bottom + 8;

        // Calculate right position: align panel's right edge with trigger's right edge
        // But ensure it doesn't overflow the viewport
        const viewportWidth = window.innerWidth;
        let panelRight = viewportWidth - triggerRect.right;

        // Ensure panel doesn't overflow left side of viewport
        const panelLeft = viewportWidth - panelRight - panelWidth;
        if (panelLeft < 8) {
          panelRight = viewportWidth - panelWidth - 8;
        }

        this.elements.panel.style.top = panelTop + 'px';
        this.elements.panel.style.right = panelRight + 'px';
        this.elements.panel.style.left = '';
        this.elements.panel.style.height = 'auto';
        this.elements.panel.style.maxHeight = 'calc(100vh - ' + panelTop + 'px)';
      }
    },

    /**
     * Bind events specifically for the panel (called after dynamic creation)
     */
    bindPanelEvents: function () {
      if (!this.elements.panel) return;
      if (this.elements.panel.getAttribute('data-customizer-initialized') === 'true') return;

      this.elements.panel.setAttribute('data-customizer-initialized', 'true');

      // Primary color swatches
      this.elements.panel.querySelectorAll('[data-color]').forEach(swatch => {
        this.addListener(swatch, 'click', () => {
          this.applyPrimary(swatch.dataset.color);
          this.updateUI();
        });
      });

      // Neutral color swatches
      this.elements.panel.querySelectorAll('[data-neutral]').forEach(swatch => {
        this.addListener(swatch, 'click', () => {
          this.applyNeutral(swatch.dataset.neutral);
          this.updateUI();
        });
      });

      // Radius buttons
      this.elements.panel.querySelectorAll('[data-radius]').forEach(btn => {
        this.addListener(btn, 'click', () => {
          this.applyRadius(btn.dataset.radius);
          this.updateUI();
        });
      });

      // Font selector
      const fontSelect = this.elements.panel.querySelector('[data-customizer-font]');
      if (fontSelect) {
        this.addListener(fontSelect, 'change', (e) => {
          this.applyFont(e.target.value);
          this.updateUI();
        });
      }

      // Mode buttons
      this.elements.panel.querySelectorAll('[data-mode]').forEach(btn => {
        this.addListener(btn, 'click', () => {
          this.applyTheme(btn.dataset.mode);
          this.updateUI();
        });
      });

      // Reset button
      const resetBtn = this.elements.panel.querySelector('.customizer-reset');
      if (resetBtn) {
        this.addListener(resetBtn, 'click', () => {
          this.reset();
        });
      }

      // Mobile close button
      const closeBtn = this.elements.panel.querySelector('.customizer-mobile-close');
      if (closeBtn) {
        this.addListener(closeBtn, 'click', () => {
          this.close();
        });
      }

      // Overlay click
      if (this.elements.overlay) {
        this.addListener(this.elements.overlay, 'click', () => {
          this.close();
        });
      }
    },

    /**
     * Generate panel HTML
     */
    getPanelHTML: function () {
      const esc = typeof escapeHtml === 'function'
        ? escapeHtml
        : function (text) {
          const div = document.createElement('div');
          div.textContent = String(text ?? '');
          return div.innerHTML;
        };
      const safeColor = function (value) {
        const normalized = String(value ?? '').trim();
        // Allow common color formats used by palette values.
        if (/^(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]{1,60}\)|hsl[a]?\([^)]{1,60}\)|var\(--[a-zA-Z0-9_-]{1,40}\))$/.test(normalized)) {
          return normalized;
        }
        return '#000000';
      };

      // Generate primary color swatches
      let primarySwatches = '';
      for (const [key, value] of Object.entries(this.PRIMARY_COLORS)) {
        primarySwatches += `<button class="tc-color-swatch${key === this.state.primary ? ' is-active' : ''}" data-color="${esc(key)}" style="--swatch-color: ${safeColor(value.color)}" title="${esc(value.name)}"></button>`;
      }

      // Generate neutral color swatches
      let neutralSwatches = '';
      for (const [key, value] of Object.entries(this.NEUTRAL_COLORS)) {
        neutralSwatches += `<button class="tc-neutral-swatch${key === this.state.neutral ? ' is-active' : ''}" data-neutral="${esc(key)}" style="--swatch-color: ${safeColor(value.color)}" title="${esc(value.name)}"><span>${esc(value.name)}</span></button>`;
      }

      // Generate radius buttons
      let radiusButtons = '';
      this.RADIUS_OPTIONS.forEach(r => {
        radiusButtons += `<button class="tc-radius-btn${r === this.state.radius ? ' is-active' : ''}" data-radius="${esc(r)}">${esc(r)}</button>`;
      });

      // Generate font options
      let fontOptions = '';
      for (const [key, value] of Object.entries(this.FONT_OPTIONS)) {
        fontOptions += `<option value="${esc(key)}"${key === this.state.font ? ' selected' : ''}>${esc(value.name)}</option>`;
      }

      // Generate mode buttons
      const modeIcons = {
        'system': 'ph-desktop',
        'dark': 'ph-moon',
        'light': 'ph-sun'
      };
      let modeButtons = '';
      this.THEME_MODES.forEach(mode => {
        modeButtons += `<button class="tc-mode-btn${mode === this.state.theme ? ' is-active' : ''}" data-mode="${mode}"><i class="ph ${modeIcons[mode]}"></i><span>${mode.charAt(0).toUpperCase() + mode.slice(1)}</span></button>`;
      });

      return `
        <div class="tc-header">
          <h3 class="tc-title">Customize Theme</h3>
          <button class="customizer-mobile-close" aria-label="Close">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="tc-body">
          <div class="tc-section">
            <label class="tc-label">Color Mode</label>
            <div class="tc-mode-group">
              ${modeButtons}
            </div>
          </div>
          <div class="tc-section">
            <label class="tc-label">Primary Color</label>
            <div class="tc-color-grid">
              ${primarySwatches}
            </div>
          </div>
          <div class="tc-section">
            <label class="tc-label">Neutral Color</label>
            <div class="tc-neutral-grid">
              ${neutralSwatches}
            </div>
          </div>
          <div class="tc-section">
            <label class="tc-label">Border Radius</label>
            <div class="tc-radius-group">
              ${radiusButtons}
            </div>
          </div>
          <div class="tc-section">
            <label class="tc-label">Font Family</label>
            <select class="tc-font-select" data-customizer-font>
              ${fontOptions}
            </select>
          </div>
        </div>
        <div class="tc-footer">
          <button class="customizer-reset btn btn-sm btn-outline">Reset to Defaults</button>
        </div>
      `;
    },

    /**
     * Bind event listeners
     */
    /**
     * Check whether the current primary color is one of the auto-defaults
     * (i.e. the user hasn't explicitly picked a non-default color).
     */
    isUsingDefaultPrimary: function () {
      return this.state.primary === this.DEFAULTS.PRIMARY_LIGHT ||
             this.state.primary === this.DEFAULTS.PRIMARY_DARK;
    },

    bindEvents: function () {
      // Trigger click - bind to any trigger button
      if (this.elements.trigger) {
        this.addListener(this.elements.trigger, 'click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        });
      }

      this.bindPanelEvents();

      // Listen for OS dark/light changes so we can swap the default primary
      if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
          if (this.state.theme === 'system' && this.isUsingDefaultPrimary()) {
            const newDefault = this.getDefaultPrimary('system');
            if (newDefault !== this.state.primary) {
              this.applyPrimary(newDefault);
              this.updateUI();
            }
          }
        };
        mq.addEventListener('change', handler);
        this._cleanup.push(() => mq.removeEventListener('change', handler));
      }

      // Close on outside click
      this.addListener(document, 'click', (e) => {
        if (this.state.isOpen && this.elements.customizer && !this.elements.customizer.contains(e.target)) {
          this.close();
        }
      });

      // Close on Escape key
      this.addListener(document, 'keydown', (e) => {
        if (e.key === 'Escape' && this.state.isOpen) {
          this.close();
        }
      });
    },

    /**
     * Toggle panel open/close
     */
    toggle: function () {
      if (this.state.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    /**
     * Open the panel
     */
    open: function () {
      this.state.isOpen = true;

      // Ensure panel is positioned correctly before opening
      this.positionPanel();

      if (this.elements.panel) {
        this.elements.panel.classList.add('is-open');
      }
      if (this.elements.trigger) {
        this.elements.trigger.setAttribute('aria-expanded', 'true');
      }
      if (this.elements.overlay) {
        this.elements.overlay.classList.add('is-active');
      }

      this.dispatchEvent('panel-open', { isOpen: true });
    },

    /**
     * Close the panel
     */
    close: function () {
      this.state.isOpen = false;

      if (this.elements.panel) {
        this.elements.panel.classList.remove('is-open');
      }
      if (this.elements.trigger) {
        this.elements.trigger.setAttribute('aria-expanded', 'false');
      }
      if (this.elements.overlay) {
        this.elements.overlay.classList.remove('is-active');
      }

      this.dispatchEvent('panel-close', { isOpen: false });
    },

    /**
     * Update UI to reflect current state
     */
    updateUI: function () {
      if (!this.elements.panel) return;

      // Update primary color swatches
      this.elements.panel.querySelectorAll('[data-color]').forEach(swatch => {
        swatch.classList.toggle('is-active', swatch.dataset.color === this.state.primary);
      });

      // Update neutral color swatches
      this.elements.panel.querySelectorAll('[data-neutral]').forEach(swatch => {
        swatch.classList.toggle('is-active', swatch.dataset.neutral === this.state.neutral);
      });

      // Update radius buttons
      this.elements.panel.querySelectorAll('[data-radius]').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.radius === this.state.radius);
      });

      // Update font selector
      const fontSelect = this.elements.panel.querySelector('[data-customizer-font]');
      if (fontSelect) {
        fontSelect.value = this.state.font;
      }

      // Update mode buttons
      this.elements.panel.querySelectorAll('[data-mode]').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.mode === this.state.theme);
      });
    },

    /**
     * Reset all preferences to defaults
     */
    reset: function () {
      this.applyTheme(this.DEFAULTS.THEME);
      this.applyPrimary(this.getDefaultPrimary(this.DEFAULTS.THEME));
      this.applyNeutral(this.DEFAULTS.NEUTRAL);
      this.applyRadius(this.DEFAULTS.RADIUS);
      this.applyFont(this.DEFAULTS.FONT);
      this.applyTheme(this.DEFAULTS.THEME);
      this.updateUI();

      this.dispatchEvent('reset', { state: { ...this.state } });
    },

    /**
     * Get current state
     */
    getState: function () {
      return { ...this.state };
    },

    /**
     * Programmatically set preferences
     */
    setPreferences: function (prefs) {
      if (prefs.primary) this.applyPrimary(prefs.primary);
      if (prefs.neutral) this.applyNeutral(prefs.neutral);
      if (prefs.radius) this.applyRadius(prefs.radius);
      if (prefs.font) this.applyFont(prefs.font);
      if (prefs.theme) this.applyTheme(prefs.theme);
      this.updateUI();
    },

    getStorageValue: function (key, fallback) {
      if (typeof window.safeStorageGet === 'function') {
        return window.safeStorageGet(key, fallback);
      }
      try {
        const value = localStorage.getItem(key);
        return value !== null ? value : fallback;
      } catch (_e) {
        return fallback;
      }
    },

    setStorageValue: function (key, value) {
      if (typeof window.safeStorageSet === 'function') {
        return window.safeStorageSet(key, value);
      }
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (_e) {
        return false;
      }
    },

    destroyAll: function () {
      this._cleanup.forEach(fn => fn());
      this._cleanup = [];

      if (this.elements.panel) {
        this.elements.panel.removeAttribute('data-customizer-initialized');
      }

      this.close();
      this.isInitialized = false;
    }
  };

  // Register component
  if (window.Vanduo) {
    window.Vanduo.register('themeCustomizer', ThemeCustomizer);
  }

  // Expose globally for convenience
  window.ThemeCustomizer = ThemeCustomizer;
})();
