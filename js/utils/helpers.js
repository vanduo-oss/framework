'use strict';

/**
 * Vanduo Framework - Utility Helpers
 * Common utility functions used across the framework
 */

/**
 * Check if element exists
 * @param {string|HTMLElement} selector - CSS selector or element
 * @returns {HTMLElement|null}
 */
function $(selector) {
  if (typeof selector === 'string') {
    return document.querySelector(selector);
  }
  return selector;
}

/**
 * Get all elements matching selector
 * @param {string} selector - CSS selector
 * @returns {NodeList}
 */
function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Wait for DOM to be ready
 * @param {Function} callback - Function to execute when DOM is ready
 */
function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

/**
 * Safely get a value from localStorage
 * @param {string} key - Storage key
 * @param {string|null} fallback - Fallback when storage is unavailable
 * @returns {string|null}
 */
function safeStorageGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch (_e) {
    return fallback;
  }
}

/**
 * Safely set a value in localStorage
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {boolean}
 */
function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Add event listener with delegation support
 * @param {string|HTMLElement} target - Target element or selector
 * @param {string} event - Event type
 * @param {string|Function} handlerOrSelector - Event handler or selector for delegation
 * @param {Function} handler - Event handler (if using delegation)
 */
function on(target, event, handlerOrSelector, handler) {
  const element = typeof target === 'string' ? $(target) : target;

  if (!element) return;

  if (typeof handlerOrSelector === 'function') {
    // Direct event binding
    element.addEventListener(event, handlerOrSelector);
  } else {
    // Event delegation
    element.addEventListener(event, function (e) {
      const delegateTarget = e.target.closest(handlerOrSelector);
      if (delegateTarget && element.contains(delegateTarget)) {
        try {
          handler.call(delegateTarget, e);
        } catch (error) {
          console.warn('[Vanduo Helpers] Delegated handler error:', error);
        }
      }
    });
  }
}

/**
 * Remove event listener
 * @param {string|HTMLElement} target - Target element or selector
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 */
function off(target, event, handler) {
  const element = typeof target === 'string' ? $(target) : target;
  if (element) {
    element.removeEventListener(event, handler);
  }
}

/**
 * Toggle class on element
 * @param {string|HTMLElement} selector - CSS selector or element
 * @param {string} className - Class name to toggle
 */
function toggleClass(selector, className) {
  const element = typeof selector === 'string' ? $(selector) : selector;
  if (element) {
    element.classList.toggle(className);
  }
}

/**
 * Add class to element
 * @param {string|HTMLElement} selector - CSS selector or element
 * @param {string} className - Class name to add
 */
function addClass(selector, className) {
  const element = typeof selector === 'string' ? $(selector) : selector;
  if (element) {
    element.classList.add(className);
  }
}

/**
 * Remove class from element
 * @param {string|HTMLElement} selector - CSS selector or element
 * @param {string} className - Class name to remove
 */
function removeClass(selector, className) {
  const element = typeof selector === 'string' ? $(selector) : selector;
  if (element) {
    element.classList.remove(className);
  }
}

/**
 * Check if element has class
 * @param {string|HTMLElement} selector - CSS selector or element
 * @param {string} className - Class name to check
 * @returns {boolean}
 */
function hasClass(selector, className) {
  const element = typeof selector === 'string' ? $(selector) : selector;
  return element ? element.classList.contains(className) : false;
}

/**
 * Get or set data attribute
 * @param {HTMLElement} element - Element
 * @param {string} name - Data attribute name (without data- prefix)
 * @param {string} value - Value to set (optional)
 * @returns {string|undefined}
 */
function data(element, name, value) {
  if (value !== undefined) {
    element.setAttribute(`data-${name}`, value);
    return value;
  }
  return element.getAttribute(`data-${name}`);
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function}
 */
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if element is visible
 * @param {HTMLElement} element - Element to check
 * @returns {boolean}
 */
function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

/**
 * Get element position relative to viewport
 * @param {HTMLElement} element - Element
 * @returns {Object} - Object with top, left, right, bottom, width, height
 */
function getPosition(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Escape HTML special characters to prevent injection
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for insertion into HTML
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Basic HTML sanitizer (whitelist-based) — runs in the browser without external libs.
 * Keeps a small set of tags and strips disallowed tags and attributes. Safe for
 * simple rich text (use server-side or DOMPurify for stronger guarantees).
 * @param {string} input
 * @returns {string} sanitized HTML
 */
function sanitizeHtml(input) {
  if (!input) return '';
  let doc;
  try {
    doc = new DOMParser().parseFromString(input, 'text/html');
  } catch (_error) {
    // Fail closed to plain escaped text if parser is unavailable/fails.
    return escapeHtml(input);
  }
  const allowed = ['B', 'STRONG', 'I', 'EM', 'BR', 'A', 'SPAN', 'U', 'SVG', 'PATH', 'LINE', 'CIRCLE', 'POLYLINE', 'RECT', 'G'];

  const sanitizeNode = function (node) {
    const children = Array.from(node.childNodes);
    children.forEach(function (child) {
      if (child.nodeType === Node.TEXT_NODE) return;

      if (!allowed.includes(child.nodeName)) {
        const text = document.createTextNode(child.textContent);
        node.replaceChild(text, child);
        return;
      }

      if (child.nodeName === 'A') {
        const href = child.getAttribute('href') || '';
        try {
          const url = new URL(href, location.href);
          if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
            child.removeAttribute('href');
          }
        } catch (_e) {
          child.removeAttribute('href');
        }
        child.removeAttribute('target');
        child.removeAttribute('rel');
      } else if (child.nodeName === 'SVG' || child.closest && child.closest('svg')) {
        // Allow safe SVG presentation attributes only
        const safeSvgAttrs = ['xmlns', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width',
          'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points',
          'transform', 'class'];
        const attrs = Array.from(child.attributes || []);
        attrs.forEach(function (a) {
          if (!safeSvgAttrs.includes(a.name)) {
            child.removeAttribute(a.name);
          }
        });
      } else {
        const otherAttrs = Array.from(child.attributes || []);
        otherAttrs.forEach(function (a) { child.removeAttribute(a.name); });
      }

      sanitizeNode(child);
    });
  };

  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}



