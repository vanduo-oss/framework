/**
 * Vanduo Framework - Main JavaScript File
 * v1.2.0
 */

(function() {
  'use strict';

  /**
   * Vanduo Framework Object
   */
  const Vanduo = {
    version: '1.2.0',
    components: {},

    /**
     * Initialize framework
     * Call this after DOM is ready and all components are loaded
     */
    init: function() {
      // Initialize components when DOM is ready
      if (typeof ready !== 'undefined') {
        ready(() => {
          this.initComponents();
        });
      } else {
        // Fallback if helpers.js is not loaded
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this.initComponents();
          });
        } else {
          this.initComponents();
        }
      }
    },

    /**
     * Initialize all components
     */
    initComponents: function() {
      // Initialize all registered components
      Object.keys(this.components).forEach((name) => {
        const component = this.components[name];
        if (component.init && typeof component.init === 'function') {
          try {
            component.init();
          } catch (e) {
            console.warn('[Vanduo] Failed to initialize component "' + name + '":', e);
          }
        }
      });

      console.log('Vanduo Framework v1.2.0 initialized');
    },

    /**
     * Register a component
     * @param {string} name - Component name
     * @param {Object} component - Component object with init method
     */
    register: function(name, component) {
      this.components[name] = component;
      // Note: Components are NOT auto-initialized on registration
      // Call Vanduo.init() explicitly after all components are registered
    },

    /**
     * Re-initialize a component (useful after dynamic DOM changes)
     * @param {string} name - Component name
     */
    reinit: function(name) {
      const component = this.components[name];
      if (component && component.init && typeof component.init === 'function') {
        try {
          component.init();
        } catch (e) {
          console.warn('[Vanduo] Failed to reinitialize component "' + name + '":', e);
        }
      }
    },

    /**
     * Destroy all component instances and clean up event listeners
     * Uses lifecycle manager for memory leak prevention
     */
    destroyAll: function() {
      // First, destroy components that have their own destroyAll
      const names = Object.keys(this.components);
      for (let i = 0; i < names.length; i++) {
        const component = this.components[names[i]];
        if (component && component.destroyAll && typeof component.destroyAll === 'function') {
          try {
            component.destroyAll();
          } catch (e) {
            console.warn('[Vanduo] Failed to destroy component "' + names[i] + '":', e);
          }
        }
      }

      // Then, cleanup any remaining registered elements via lifecycle manager
      if (typeof window.VanduoLifecycle !== 'undefined') {
        window.VanduoLifecycle.destroyAll();
      }
    },

    /**
     * Get component instance
     * @param {string} name - Component name
     * @returns {Object|null}
     */
    getComponent: function(name) {
      return this.components[name] || null;
    }
  };

  // Expose to global scope
  window.Vanduo = Vanduo;

})();
