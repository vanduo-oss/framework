/**
 * Vanduo Framework - Tooltips Component
 * JavaScript functionality for tooltips
 */

(function () {
  'use strict';

  /**
   * Tooltips Component
   */
  const Tooltips = {
    tooltips: new Map(),
    delayTimers: new Map(),

    /**
     * Sanitize HTML — delegates to shared sanitizeHtml from helpers.js
     * @param {string} input
     * @returns {string} sanitized HTML
     */
    sanitizeHtml: function (input) {
      if (typeof sanitizeHtml === 'function') {
        return sanitizeHtml(input);
      }
      // Fallback: strip all HTML
      const div = document.createElement('div');
      div.textContent = input || '';
      return div.innerHTML;
    },

    /**
     * Initialize tooltips
     */
    init: function () {
      const elements = document.querySelectorAll('[data-tooltip], [data-tooltip-html]');

      elements.forEach(element => {
        if (this.tooltips.has(element)) {
          return;
        }
        this.initTooltip(element);
      });
    },

    /**
     * Initialize a single tooltip
     * @param {HTMLElement} element - Element with tooltip
     */
    initTooltip: function (element) {
      const tooltip = this.createTooltip(element);
      const cleanupFunctions = [];

      // Show on hover/focus
      const enterHandler = () => { this.showTooltip(element, tooltip); };
      const leaveHandler = () => { this.hideTooltip(element, tooltip); };
      const focusHandler = () => { this.showTooltip(element, tooltip); };
      const blurHandler = () => { this.hideTooltip(element, tooltip); };

      element.addEventListener('mouseenter', enterHandler);
      element.addEventListener('mouseleave', leaveHandler);
      element.addEventListener('focus', focusHandler);
      element.addEventListener('blur', blurHandler);

      cleanupFunctions.push(
        () => element.removeEventListener('mouseenter', enterHandler),
        () => element.removeEventListener('mouseleave', leaveHandler),
        () => element.removeEventListener('focus', focusHandler),
        () => element.removeEventListener('blur', blurHandler)
      );

      this.tooltips.set(element, { tooltip, cleanup: cleanupFunctions });
    },

    /**
     * Create tooltip element
     * @param {HTMLElement} element - Target element
     * @returns {HTMLElement} Tooltip element
     */
    createTooltip: function (element) {
      const tooltip = document.createElement('div');
      tooltip.className = 'vd-tooltip';
      tooltip.setAttribute('role', 'tooltip');
      tooltip.setAttribute('aria-hidden', 'true');

      // Generate unique ID and link via aria-describedby
      const tooltipId = 'tooltip-' + Math.random().toString(36).substr(2, 9);
      tooltip.id = tooltipId;
      element.setAttribute('aria-describedby', tooltipId);

      // Get content
      const htmlContent = element.dataset.tooltipHtml;
      const textContent = element.dataset.tooltip;

      if (htmlContent) {
        tooltip.innerHTML = this.sanitizeHtml(htmlContent);
        tooltip.classList.add('vd-tooltip-html');
      } else if (textContent) {
        tooltip.textContent = textContent;
      }

      // Get placement
      const placement = element.dataset.tooltipPlacement || element.dataset.placement || 'top';
      tooltip.setAttribute('data-placement', placement);
      tooltip.classList.add(`vd-tooltip-${placement}`);

      // Get variant
      if (element.dataset.tooltipVariant) {
        tooltip.classList.add(`vd-tooltip-${element.dataset.tooltipVariant}`);
      }

      // Get size
      if (element.dataset.tooltipSize) {
        tooltip.classList.add(`vd-tooltip-${element.dataset.tooltipSize}`);
      }

      // Get delay
      const delay = parseInt(element.dataset.tooltipDelay) || 0;
      tooltip.dataset.delay = delay;

      document.body.appendChild(tooltip);

      return tooltip;
    },

    /**
     * Show tooltip
     * @param {HTMLElement} element - Target element
     * @param {HTMLElement} tooltip - Tooltip element
     */
    showTooltip: function (element, tooltip) {
      const delay = parseInt(tooltip.dataset.delay) || 0;

      if (delay > 0) {
        const timer = setTimeout(() => {
          this.positionTooltip(element, tooltip);
          tooltip.classList.add('is-visible');
          tooltip.setAttribute('aria-hidden', 'false');
        }, delay);
        this.delayTimers.set(element, timer);
      } else {
        this.positionTooltip(element, tooltip);
        tooltip.classList.add('is-visible');
        tooltip.setAttribute('aria-hidden', 'false');
      }
    },

    /**
     * Hide tooltip
     * @param {HTMLElement} element - Target element
     * @param {HTMLElement} tooltip - Tooltip element
     */
    hideTooltip: function (element, tooltip) {
      // Clear delay timer if exists
      const timer = this.delayTimers.get(element);
      if (timer) {
        clearTimeout(timer);
        this.delayTimers.delete(element);
      }

      tooltip.classList.remove('is-visible');
      tooltip.setAttribute('aria-hidden', 'true');
    },

    /**
     * Position tooltip relative to element
     * @param {HTMLElement} element - Target element
     * @param {HTMLElement} tooltip - Tooltip element
     */
    positionTooltip: function (element, tooltip) {
      const placement = tooltip.dataset.placement || 'top';
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = rect.top + scrollTop - tooltipRect.height - 8;
          left = rect.left + scrollLeft + (rect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          top = rect.bottom + scrollTop + 8;
          left = rect.left + scrollLeft + (rect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          top = rect.top + scrollTop + (rect.height / 2) - (tooltipRect.height / 2);
          left = rect.left + scrollLeft - tooltipRect.width - 8;
          break;
        case 'right':
          top = rect.top + scrollTop + (rect.height / 2) - (tooltipRect.height / 2);
          left = rect.right + scrollLeft + 8;
          break;
      }

      // Prevent overflow
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;

      if (left < padding) {
        left = padding;
      } else if (left + tooltipRect.width > viewportWidth - padding) {
        left = viewportWidth - tooltipRect.width - padding;
      }

      if (top < scrollTop + padding) {
        top = scrollTop + padding;
      } else if (top + tooltipRect.height > scrollTop + viewportHeight - padding) {
        top = scrollTop + viewportHeight - tooltipRect.height - padding;
      }

      // Use single style assignment with transform for better performance
      tooltip.style.cssText = `position: absolute; top: 0; left: 0; transform: translate(${left}px, ${top}px);`;
    },

    /**
     * Show tooltip programmatically
     * @param {HTMLElement|string} element - Target element or selector
     */
    show: function (element) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (el && this.tooltips.has(el)) {
        const { tooltip } = this.tooltips.get(el);
        this.showTooltip(el, tooltip);
      }
    },

    /**
     * Hide tooltip programmatically
     * @param {HTMLElement|string} element - Target element or selector
     */
    hide: function (element) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (el && this.tooltips.has(el)) {
        const { tooltip } = this.tooltips.get(el);
        this.hideTooltip(el, tooltip);
      }
    },

    /**
     * Update tooltip content
     * @param {HTMLElement|string} element - Target element or selector
     * @param {string} content - New content
     * @param {boolean} isHtml - Whether content is HTML
     */
    update: function (element, content, isHtml = false) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (el && this.tooltips.has(el)) {
        const { tooltip } = this.tooltips.get(el);
        if (isHtml) {
          tooltip.innerHTML = this.sanitizeHtml(content);
          tooltip.classList.add('vd-tooltip-html');
        } else {
          tooltip.textContent = content;
          tooltip.classList.remove('vd-tooltip-html');
        }
      }
    },

    /**
     * Destroy a tooltip instance and clean up
     * @param {HTMLElement} element - Element with tooltip
     */
    destroy: function (element) {
      const data = this.tooltips.get(element);
      if (!data) return;

      // Clear any pending timer
      const timer = this.delayTimers.get(element);
      if (timer) {
        clearTimeout(timer);
        this.delayTimers.delete(element);
      }

      data.cleanup.forEach(fn => fn());

      // Remove tooltip element from DOM
      if (data.tooltip && data.tooltip.parentNode) {
        data.tooltip.parentNode.removeChild(data.tooltip);
      }

      this.tooltips.delete(element);
    },

    /**
     * Destroy all tooltip instances
     */
    destroyAll: function () {
      this.tooltips.forEach((data, element) => {
        this.destroy(element);
      });
    }
  };

  // Register with Vanduo framework if available
  if (typeof window.Vanduo !== 'undefined') {
    window.Vanduo.register('tooltips', Tooltips);
  }

  // Expose globally
  window.VanduoTooltips = Tooltips;

})();
