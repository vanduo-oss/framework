/**
 * Vanduo Framework - Draggable Component
 * JavaScript functionality for draggable elements and drop zones
 */

(function () {
  'use strict';

  /**
   * Draggable Component
   */
  const Draggable = {
    // Store initialized draggables and their cleanup functions
    instances: new Map(),
    // Store current drag state
    currentDrag: null,
    // Store touch state
    touchState: null,
    // Feedback element
    feedbackElement: null,

    /**
     * Initialize draggable components
     */
    init: function () {
      const draggables = document.querySelectorAll('.vd-draggable, [data-draggable]');

      draggables.forEach(element => {
        if (this.instances.has(element)) {
          return;
        }
        this.initDraggable(element);
      });

      const containers = document.querySelectorAll('.vd-draggable-container, .vd-draggable-container-vertical');
      containers.forEach(container => {
        if (!this.instances.has(container)) {
          this.initContainer(container);
        }
      });

      const dropZones = document.querySelectorAll('.vd-drop-zone');
      dropZones.forEach(zone => {
        if (!this.instances.has(zone)) {
          this.initDropZone(zone);
        }
      });

      this.createFeedbackElement();
    },

    /**
     * Initialize a single draggable element
     * @param {HTMLElement} element - Draggable element
     */
    initDraggable: function (element) {
      const cleanupFunctions = [];

      // Make element draggable if not already
      if (!element.hasAttribute('draggable')) {
        element.setAttribute('draggable', 'true');
      }

      // Accessibility: add ARIA attributes
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
      element.setAttribute('role', 'option');
      element.setAttribute('aria-roledescription', 'draggable item');
      element.setAttribute('aria-grabbed', 'false');

      // Handle drag start
      const dragStartHandler = (e) => {
        this.handleDragStart(e, element);
      };
      element.addEventListener('dragstart', dragStartHandler);
      cleanupFunctions.push(() => element.removeEventListener('dragstart', dragStartHandler));

      // Handle drag
      const dragHandler = (e) => {
        this.handleDrag(e, element);
      };
      element.addEventListener('drag', dragHandler);
      cleanupFunctions.push(() => element.removeEventListener('drag', dragHandler));

      // Handle drag end
      const dragEndHandler = (e) => {
        this.handleDragEnd(e, element);
      };
      element.addEventListener('dragend', dragEndHandler);
      cleanupFunctions.push(() => element.removeEventListener('dragend', dragEndHandler));

      // Handle touch start (for mobile)
      const touchStartHandler = (e) => {
        this.handleTouchStart(e, element);
      };
      element.addEventListener('touchstart', touchStartHandler);
      cleanupFunctions.push(() => element.removeEventListener('touchstart', touchStartHandler));

      // Handle touch move (for mobile)
      // { passive: false } is required so that e.preventDefault() works
      // once the drag threshold is reached — without it, modern browsers
      // treat the listener as passive and silently ignore preventDefault().
      const touchMoveHandler = (e) => {
        this.handleTouchMove(e, element);
      };
      element.addEventListener('touchmove', touchMoveHandler, { passive: false });
      cleanupFunctions.push(() => element.removeEventListener('touchmove', touchMoveHandler));

      // Handle touch end (for mobile)
      const touchEndHandler = (e) => {
        this.handleTouchEnd(e, element);
      };
      element.addEventListener('touchend', touchEndHandler, { passive: false });
      cleanupFunctions.push(() => element.removeEventListener('touchend', touchEndHandler));

      // Handle touch cancel (for mobile)
      const touchCancelHandler = (e) => {
        this.handleTouchEnd(e, element);
      };
      element.addEventListener('touchcancel', touchCancelHandler);
      cleanupFunctions.push(() => element.removeEventListener('touchcancel', touchCancelHandler));

      // Keyboard navigation
      const keydownHandler = (e) => {
        this.handleKeydown(e, element);
      };
      element.addEventListener('keydown', keydownHandler);
      cleanupFunctions.push(() => element.removeEventListener('keydown', keydownHandler));

      this.instances.set(element, { cleanup: cleanupFunctions });
    },

    /**
     * Initialize a draggable container
     * @param {HTMLElement} container - Draggable container
     */
    initContainer: function (container) {
      // Accessibility: add ARIA role to container
      container.setAttribute('role', 'listbox');
      container.setAttribute('aria-label', container.getAttribute('aria-label') || 'Draggable items');

      const items = container.querySelectorAll('.vd-draggable-item');
      items.forEach(item => {
        if (!this.instances.has(item)) {
          this.initDraggable(item);
        }
      });

      const cleanupFunctions = [];

      // Handle drag enter
      const dragEnterHandler = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      };

      // Handle drag over for auto-sorting
      const dragOverHandler = (e) => {
        e.preventDefault(); // Necessary to allow drop
        e.dataTransfer.dropEffect = 'move';

        if (!this.currentDrag) return;
        const draggingEl = this.currentDrag.element;

        // Only reorder if dragging an item that belongs to this container (or if we support cross-container drag, but keep simple)
        if (!container.contains(draggingEl)) return;

        // Prevent jumps when the dragging finalizes with 0,0 coordinates near the end
        if (e.clientX === 0 && e.clientY === 0) return;

        this.handleReorder(container, draggingEl, e.clientX, e.clientY);
      };

      // Handle drop
      const dropHandler = (e) => {
        e.preventDefault(); // crucial to prevent the browser's default handling and snapping back
      };

      container.addEventListener('dragenter', dragEnterHandler);
      container.addEventListener('dragover', dragOverHandler);
      container.addEventListener('drop', dropHandler);

      cleanupFunctions.push(() => {
        container.removeEventListener('dragenter', dragEnterHandler);
        container.removeEventListener('dragover', dragOverHandler);
        container.removeEventListener('drop', dropHandler);
      });

      this.instances.set(container, { cleanup: cleanupFunctions });
    },

    /**
     * Initialize a drop zone
     * @param {HTMLElement} zone - Drop zone element
     */
    initDropZone: function (zone) {
      const cleanupFunctions = [];

      // Accessibility: add ARIA role to drop zone
      zone.setAttribute('role', 'region');
      zone.setAttribute('aria-dropeffect', 'move');
      if (!zone.hasAttribute('aria-label')) {
        zone.setAttribute('aria-label', 'Drop zone');
      }

      // Handle drag over
      const dragOverHandler = (e) => {
        e.preventDefault();
        this.handleDragOver(e, zone);
      };
      zone.addEventListener('dragover', dragOverHandler);
      cleanupFunctions.push(() => zone.removeEventListener('dragover', dragOverHandler));

      // Handle drag enter
      const dragEnterHandler = (e) => {
        e.preventDefault();
        this.handleDragEnter(e, zone);
      };
      zone.addEventListener('dragenter', dragEnterHandler);
      cleanupFunctions.push(() => zone.removeEventListener('dragenter', dragEnterHandler));

      // Handle drag leave
      const dragLeaveHandler = (e) => {
        this.handleDragLeave(e, zone);
      };
      zone.addEventListener('dragleave', dragLeaveHandler);
      cleanupFunctions.push(() => zone.removeEventListener('dragleave', dragLeaveHandler));

      // Handle drop
      const dropHandler = (e) => {
        e.preventDefault();
        this.handleDrop(e, zone);
      };
      zone.addEventListener('drop', dropHandler);
      cleanupFunctions.push(() => zone.removeEventListener('drop', dropHandler));

      this.instances.set(zone, { cleanup: cleanupFunctions });
    },

    /**
     * Create feedback element for drag operations
     */
    createFeedbackElement: function () {
      if (!this.feedbackElement) {
        // Reuse existing element if present
        const existing = document.querySelector('.vd-drag-feedback');
        if (existing) {
          this.feedbackElement = existing;
          return;
        }

        this.feedbackElement = document.createElement('div');
        this.feedbackElement.className = 'vd-drag-feedback hidden';
        this.feedbackElement.setAttribute('role', 'presentation');
        document.body.appendChild(this.feedbackElement);
      }
    },

    /**
     * Handle drag start event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} element - Draggable element
     */
    handleDragStart: function (e, element) {
      // Add dragging class
      element.classList.add('is-dragging');

      // Accessibility: update aria-grabbed
      element.setAttribute('aria-grabbed', 'true');

      // Store drag state
      this.currentDrag = {
        element: element,
        initialPosition: { x: e.clientX, y: e.clientY },
        initialBounds: element.getBoundingClientRect(),
        data: this.getData(element)
      };

      // Set drag data
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.currentDrag.data);

      // We no longer suppress the native ghost image or manually update feedback
      // for mouse drags, relying on the browser's native rendering instead.

      // Dispatch event
      element.dispatchEvent(new CustomEvent('draggable:start', {
        bubbles: true,
        detail: {
          element: element,
          data: this.currentDrag.data,
          position: { x: e.clientX, y: e.clientY }
        }
      }));
    },

    /**
     * Handle drag event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} element - Draggable element
     */
    handleDrag: function (e, element) {
      // Guard against null state (race condition on fast interactions)
      if (!this.currentDrag) return;

      // Dispatch event
      element.dispatchEvent(new CustomEvent('draggable:drag', {
        bubbles: true,
        detail: {
          element: element,
          data: this.currentDrag.data,
          position: { x: e.clientX, y: e.clientY },
          delta: {
            x: e.clientX - this.currentDrag.initialPosition.x,
            y: e.clientY - this.currentDrag.initialPosition.y
          }
        }
      }));
    },

    /**
     * Handle drag end event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} element - Draggable element
     */
    handleDragEnd: function (e, element) {
      // Remove dragging class
      element.classList.remove('is-dragging');
      element.classList.add('is-dropped');
      setTimeout(() => element.classList.remove('is-dropped'), 300);

      // Accessibility: update aria-grabbed
      element.setAttribute('aria-grabbed', 'false');

      // Hide feedback
      if (this.feedbackElement) {
        this.feedbackElement.classList.add('hidden');
      }

      // Guard against null state
      const data = this.currentDrag?.data || this.getData(element);
      const initialPos = this.currentDrag?.initialPosition || { x: 0, y: 0 };

      // Dispatch event
      element.dispatchEvent(new CustomEvent('draggable:end', {
        bubbles: true,
        detail: {
          element: element,
          data: data,
          position: { x: e.clientX, y: e.clientY },
          delta: {
            x: e.clientX - initialPos.x,
            y: e.clientY - initialPos.y
          }
        }
      }));

      // Reset drag state
      this.currentDrag = null;
    },

    /**
     * Handle touch start event (for mobile)
     * @param {TouchEvent} e - Touch event
     * @param {HTMLElement} element - Draggable element
     */
    handleTouchStart: function (e, element) {
      // Don't prevent default here — it blocks scrolling.
      // We only prevent default in touchmove once drag threshold is reached.
      const touch = e.touches[0];
      this.touchState = {
        element: element,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isDragging: false
      };
    },

    /**
     * Handle touch move event (for mobile)
     * @param {TouchEvent} e - Touch event
     * @param {HTMLElement} element - Draggable element
     */
    handleTouchMove: function (e, element) {
      if (!this.touchState) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchState.startX;
      const deltaY = touch.clientY - this.touchState.startY;

      // Only start dragging if moved a minimum distance
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        // Now we know it's a drag, not a scroll — prevent default
        if (e.cancelable) e.preventDefault();

        if (!this.touchState.isDragging) {
          this.touchState.isDragging = true;
          element.classList.add('is-dragging');
          element.setAttribute('aria-grabbed', 'true');

          // Store drag state
          this.currentDrag = {
            element: element,
            initialPosition: { x: this.touchState.startX, y: this.touchState.startY },
            initialBounds: element.getBoundingClientRect(),
            data: this.getData(element)
          };

          // Dispatch event
          element.dispatchEvent(new CustomEvent('draggable:start', {
            bubbles: true,
            detail: {
              element: element,
              data: this.currentDrag.data,
              position: { x: touch.clientX, y: touch.clientY }
            }
          }));
        }

        // Update feedback
        this.updateFeedback(touch.clientX, touch.clientY);

        // Dispatch event
        if (this.currentDrag) {
          element.dispatchEvent(new CustomEvent('draggable:drag', {
            bubbles: true,
            detail: {
              element: element,
              data: this.currentDrag.data,
              position: { x: touch.clientX, y: touch.clientY },
              delta: { x: deltaX, y: deltaY }
            }
          }));

          // Reorder for touch
          const container = element.closest('.vd-draggable-container');
          if (container && container.contains(element)) {
            this.handleReorder(container, element, touch.clientX, touch.clientY);
          }
        }
      }
    },

    /**
     * Handle touch end event (for mobile)
     * @param {TouchEvent} e - Touch event
     * @param {HTMLElement} element - Draggable element
     */
    handleTouchEnd: function (e, element) {
      if (this.touchState && this.touchState.isDragging) {
        if (e.cancelable) e.preventDefault();

        element.classList.remove('is-dragging');
        element.classList.add('is-dropped');
        element.setAttribute('aria-grabbed', 'false');
        setTimeout(() => element.classList.remove('is-dropped'), 300);

        // Hide feedback
        if (this.feedbackElement) {
          this.feedbackElement.classList.add('hidden');
        }

        // Dispatch event
        const endTouch = e.changedTouches[0];
        const data = this.currentDrag?.data || this.getData(element);
        const startX = this.touchState?.startX || 0;
        const startY = this.touchState?.startY || 0;

        element.dispatchEvent(new CustomEvent('draggable:end', {
          bubbles: true,
          detail: {
            element: element,
            data: data,
            position: { x: endTouch.clientX, y: endTouch.clientY },
            delta: {
              x: endTouch.clientX - startX,
              y: endTouch.clientY - startY
            }
          }
        }));
      }

      // Reset states
      this.touchState = null;
      this.currentDrag = null;
    },

    /**
     * Handle drag over event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} _zone - Drop zone element
     */
    handleDragOver: function (e, _zone) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },

    /**
     * Handle drag enter event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} zone - Drop zone element
     */
    handleDragEnter: function (e, zone) {
      e.preventDefault();
      zone.classList.add('is-drag-over');
    },

    /**
     * Handle drag leave event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} zone - Drop zone element
     */
    handleDragLeave: function (e, zone) {
      zone.classList.remove('is-drag-over');
    },

    /**
     * Handle drop event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} zone - Drop zone element
     */
    handleDrop: function (e, zone) {
      e.preventDefault();
      zone.classList.remove('is-drag-over');

      // Dispatch event
      zone.dispatchEvent(new CustomEvent('draggable:drop', {
        bubbles: true,
        detail: {
          zone: zone,
          element: this.currentDrag?.element,
          data: this.currentDrag?.data,
          position: { x: e.clientX, y: e.clientY }
        }
      }));
    },

    /**
     * Reorder elements in container based on cursor position
     * @param {HTMLElement} container 
     * @param {HTMLElement} element 
     * @param {number} clientX 
     * @param {number} clientY 
     */
    handleReorder: function (container, element, clientX, clientY) {
      const isVertical = container.classList.contains('vd-draggable-container-vertical');
      const siblings = [...container.querySelectorAll('.vd-draggable-item:not(.is-dragging), .vd-draggable:not(.is-dragging)')];

      const nextSibling = siblings.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = isVertical
          ? clientY - box.top - box.height / 2
          : clientX - box.left - box.width / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;

      if (nextSibling == null) {
        container.appendChild(element);
      } else {
        container.insertBefore(element, nextSibling);
      }
    },

    /**
     * Handle keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLElement} element - Draggable element
     */
    handleKeydown: function (e, element) {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          // Trigger click or custom action
          element.click();
          break;
        case 'Escape':
          // Cancel drag if in progress
          if (element.classList.contains('is-dragging')) {
            element.classList.remove('is-dragging');
            element.setAttribute('aria-grabbed', 'false');
            if (this.feedbackElement) {
              this.feedbackElement.classList.add('hidden');
            }
            this.currentDrag = null;
          }
          break;
        case 'ArrowUp':
        case 'ArrowLeft': {
          e.preventDefault();
          const prev = element.previousElementSibling;
          if (prev && (prev.classList.contains('vd-draggable') || prev.classList.contains('vd-draggable-item'))) {
            element.parentNode.insertBefore(element, prev);
            element.focus();
            element.dispatchEvent(new CustomEvent('draggable:reorder', {
              bubbles: true,
              detail: { element: element, direction: 'up' }
            }));
          }
          break;
        }
        case 'ArrowDown':
        case 'ArrowRight': {
          e.preventDefault();
          const next = element.nextElementSibling;
          if (next && (next.classList.contains('vd-draggable') || next.classList.contains('vd-draggable-item'))) {
            element.parentNode.insertBefore(next, element);
            element.focus();
            element.dispatchEvent(new CustomEvent('draggable:reorder', {
              bubbles: true,
              detail: { element: element, direction: 'down' }
            }));
          }
          break;
        }
      }
    },

    /**
     * Get data from draggable element
     * @param {HTMLElement} element - Draggable element
     * @returns {string} Data associated with the element
     */
    getData: function (element) {
      return element.dataset.draggable || element.textContent.trim();
    },

    /**
     * Update drag feedback element
     * @param {number} x - Current X coordinate
     * @param {number} y - Current Y coordinate
     */
    updateFeedback: function (x, y) {
      if (!this.currentDrag) return;

      // Show feedback
      this.feedbackElement.classList.remove('hidden');

      // Update feedback content
      const rect = this.currentDrag.initialBounds;
      this.feedbackElement.innerHTML = '';
      const clone = this.currentDrag.element.cloneNode(true);
      this.feedbackElement.appendChild(clone);

      // Set styles
      Object.assign(this.feedbackElement.style, {
        left: (x - 20) + 'px',
        top: (y - 20) + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px'
      });
    },

    /**
     * Make an element draggable programmatically
     * @param {HTMLElement|string} element - Element or selector
     * @param {Object} options - Configuration options
     */
    makeDraggable: function (element, options = {}) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;

      if (el && !this.instances.has(el)) {
        // Add classes and attributes
        el.classList.add('vd-draggable');
        el.setAttribute('draggable', 'true');

        // Set options
        if (options.data) {
          el.dataset.draggable = options.data;
        }

        // Initialize
        this.initDraggable(el);
      }
    },

    /**
     * Remove draggable functionality from an element
     * @param {HTMLElement|string} element - Element or selector
     */
    removeDraggable: function (element) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;

      if (el && this.instances.has(el)) {
        // Clean up
        const instance = this.instances.get(el);
        instance.cleanup.forEach(fn => fn());
        this.instances.delete(el);

        // Remove classes and attributes
        el.classList.remove('vd-draggable');
        el.removeAttribute('draggable');
        el.removeAttribute('data-draggable');
      }
    },

    /**
     * Destroy a draggable instance and clean up event listeners
     * @param {HTMLElement} element - Draggable element
     */
    destroy: function (element) {
      this.removeDraggable(element);
    },

    /**
     * Destroy all draggable instances
     */
    destroyAll: function () {
      const instances = Array.from(this.instances.keys());
      instances.forEach(element => this.destroy(element));
    }
  };

  // Register with Vanduo framework if available
  if (typeof window.Vanduo !== 'undefined') {
    window.Vanduo.register('draggable', Draggable);
  }

  // Expose globally
  window.VanduoDraggable = Draggable;
})();
