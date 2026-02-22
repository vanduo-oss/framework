/**
 * Vanduo Framework - Grid Layout Component
 * Toggle between standard 12-column and Fibonacci grid modes
 * via data-layout-mode attribute and toggle buttons
 */

(function () {
  'use strict';

  const supportsHas = (function () {
    try {
      return CSS.supports('selector(:has(*))');
    } catch (_e) {
      return false;
    }
  })();

  /**
   * Grid Layout Component
   */
  const GridLayout = {
    instances: new Map(),

    /**
     * Initialize all grid layout containers
     */
    init: function () {
      const containers = document.querySelectorAll('[data-layout-mode]');

      containers.forEach(function (container) {
        if (this.instances.has(container)) {
          return;
        }
        this.initContainer(container);
      }.bind(this));

      this.initToggleButtons();
    },

    /**
     * Initialize a single grid container
     * @param {HTMLElement} container - Element with data-layout-mode
     */
    initContainer: function (container) {
      const mode = container.getAttribute('data-layout-mode') || 'standard';
      const cleanupFunctions = [];

      this.applyMode(container, mode);

      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Grid layout: ' + mode + ' mode');

      this.instances.set(container, {
        cleanup: cleanupFunctions,
        mode: mode
      });
    },

    /**
     * Initialize toggle buttons that target grid containers
     */
    initToggleButtons: function () {
      const toggleButtons = document.querySelectorAll('[data-grid-toggle]');

      toggleButtons.forEach(function (button) {
        if (button.getAttribute('data-grid-initialized') === 'true') {
          return;
        }

        const clickHandler = function (e) {
          e.preventDefault();
          const targetSelector = button.getAttribute('data-grid-toggle');
          let target;

          if (targetSelector) {
            target = document.querySelector(targetSelector);
          } else {
            target = button.closest('[data-layout-mode]');
          }

          if (target) {
            this.toggle(target);
          }
        }.bind(this);

        button.addEventListener('click', clickHandler);
        button.setAttribute('data-grid-initialized', 'true');
        button.setAttribute('aria-pressed', 'false');

        button._gridCleanup = function () {
          button.removeEventListener('click', clickHandler);
          button.removeAttribute('data-grid-initialized');
          button.removeAttribute('aria-pressed');
        };
      }.bind(this));
    },

    /**
     * Apply Fibonacci grid-template-columns inline for browsers without :has()
     * @param {HTMLElement} container - Grid container
     */
    applyFibFallback: function (container) {
      if (supportsHas) return;

      const rows = container.querySelectorAll('.vd-row, .row');
      rows.forEach(function (row) {
        const cols = row.querySelectorAll(':scope > [class*="vd-col-"], :scope > [class*="col-"]');
        const count = cols.length;

        if (count === 1) {
          row.style.gridTemplateColumns = '1fr';
        } else if (count === 2) {
          row.style.gridTemplateColumns = '1fr 1.618fr';
        } else if (count === 3) {
          row.style.gridTemplateColumns = '2fr 3fr 5fr';
        } else if (count === 4) {
          row.style.gridTemplateColumns = '1fr 2fr 3fr 5fr';
        } else {
          row.style.gridTemplateColumns = 'repeat(' + count + ', 1fr)';
        }
      });
    },

    /**
     * Remove inline grid-template-columns fallback
     * @param {HTMLElement} container - Grid container
     */
    removeFibFallback: function (container) {
      const rows = container.querySelectorAll('.vd-row, .row');
      rows.forEach(function (row) {
        row.style.gridTemplateColumns = '';
      });
    },

    /**
     * Apply a layout mode to a container
     * @param {HTMLElement} container - Target container
     * @param {string} mode - 'fibonacci' or 'standard'
     */
    applyMode: function (container, mode) {
      container.classList.remove('vd-grid-standard', 'vd-grid-fibonacci');

      if (mode === 'fibonacci') {
        container.classList.add('vd-grid-fibonacci');
        this.applyFibFallback(container);
      } else {
        container.classList.add('vd-grid-standard');
        this.removeFibFallback(container);
      }

      container.setAttribute('data-layout-mode', mode);
      container.setAttribute('aria-label', 'Grid layout: ' + mode + ' mode');

      // Update associated toggle button states
      const toggleButtons = document.querySelectorAll('[data-grid-toggle]');
      toggleButtons.forEach(function (btn) {
        const targetSelector = btn.getAttribute('data-grid-toggle');
        if (targetSelector && container.matches(targetSelector)) {
          const isActive = (mode === 'fibonacci');
          if (isActive) {
            btn.classList.add('is-active');
          } else {
            btn.classList.remove('is-active');
          }
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
      });

      // Store mode in instance
      const instance = this.instances.get(container);
      if (instance) {
        instance.mode = mode;
      }

      // Dispatch custom event
      let event;
      try {
        event = new CustomEvent('grid:modechange', {
          bubbles: true,
          detail: {
            container: container,
            mode: mode
          }
        });
      } catch (_e) {
        event = document.createEvent('CustomEvent');
        event.initCustomEvent('grid:modechange', true, true, {
          container: container,
          mode: mode
        });
      }
      container.dispatchEvent(event);
    },

    /**
     * Toggle between standard and fibonacci modes
     * @param {HTMLElement|string} container - Container element or selector
     */
    toggle: function (container) {
      if (typeof container === 'string') {
        container = document.querySelector(container);
      }
      if (!container) return;

      const currentMode = container.getAttribute('data-layout-mode') || 'standard';
      const newMode = (currentMode === 'fibonacci') ? 'standard' : 'fibonacci';
      this.applyMode(container, newMode);
    },

    /**
     * Set a specific mode
     * @param {HTMLElement|string} container - Container element or selector
     * @param {string} mode - 'fibonacci' or 'standard'
     */
    setMode: function (container, mode) {
      if (typeof container === 'string') {
        container = document.querySelector(container);
      }
      if (!container) return;
      if (mode !== 'fibonacci' && mode !== 'standard') return;

      this.applyMode(container, mode);
    },

    /**
     * Get the current mode of a container
     * @param {HTMLElement|string} container - Container element or selector
     * @returns {string|null} Current mode or null
     */
    getMode: function (container) {
      if (typeof container === 'string') {
        container = document.querySelector(container);
      }
      if (!container) return null;
      return container.getAttribute('data-layout-mode') || 'standard';
    },

    /**
     * Destroy a single grid layout instance
     * @param {HTMLElement} container - Grid container
     */
    destroy: function (container) {
      const instance = this.instances.get(container);
      if (!instance) return;

      instance.cleanup.forEach(function (fn) { fn(); });
      container.classList.remove('vd-grid-standard', 'vd-grid-fibonacci');
      container.removeAttribute('aria-label');
      this.removeFibFallback(container);
      this.instances.delete(container);
    },

    /**
     * Destroy all grid layout instances and clean up toggle buttons
     */
    destroyAll: function () {
      this.instances.forEach(function (instance, container) {
        this.destroy(container);
      }.bind(this));

      const toggleButtons = document.querySelectorAll('[data-grid-initialized="true"]');
      toggleButtons.forEach(function (button) {
        if (button._gridCleanup) {
          button._gridCleanup();
          delete button._gridCleanup;
        }
      });
    }
  };

  // Register with Vanduo framework
  if (typeof window.Vanduo !== 'undefined') {
    window.Vanduo.register('gridLayout', GridLayout);
  }

  // Expose globally
  window.VanduoGridLayout = GridLayout;

})();
