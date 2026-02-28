/**
 * Vanduo Framework – LazyLoad Component
 * v1.2.1
 *
 * Provides two levels of API:
 *
 *  LOW-LEVEL (generic IntersectionObserver wrapper)
 *    VanduoLazyLoad.observe(element, callback, options?)
 *    VanduoLazyLoad.unobserve(element)
 *    VanduoLazyLoad.unobserveAll()
 *
 *  HIGH-LEVEL (HTML-section fetcher, mirrors vanduo-docs SPA behaviour)
 *    VanduoLazyLoad.loadSection(url, containerEl, options?)
 *      options: { placeholder, threshold, rootMargin, onLoaded, onError }
 *      placeholder: 'skeleton' | 'spinner' | HTMLString (default: 'skeleton')
 *
 *  ATTRIBUTE-DRIVEN (zero-JS usage, wired by init())
 *    <div data-vd-lazy="./path/to/section.html"
 *         data-vd-lazy-placeholder="skeleton|spinner">…</div>
 *
 *  EVENTS dispatched on the host element:
 *    lazysection:loading  — fetch started
 *    lazysection:loaded   — content injected
 *    lazysection:error    — fetch failed
 */

(function () {
    'use strict';

    /* ── Private state ────────────────────────────────── */

    /** @type {Map<Element, IntersectionObserver>} */
    const _observerMap = new Map();

    /* ── Security helpers ─────────────────────────────── */

    /**
     * Returns true only if `url` resolves to the same origin as the page
     * (relative paths and same-origin absolute URLs are allowed).
     * Cross-origin URLs are rejected to prevent SSRF-style fetch abuse.
     * @param {string} url
     * @returns {boolean}
     */
    function _isSafeUrl(url) {
        try {
            // Relative URLs (no origin) are always safe
            const resolved = new URL(url, window.location.href);
            return resolved.origin === window.location.origin;
        } catch (_) {
            return false;
        }
    }

    /**
     * Safely inject fetched HTML into a container by parsing it with
     * DOMParser (avoids script execution) and replacing children via
     * standard DOM APIs instead of raw innerHTML assignment.
     * @param {Element} containerEl
     * @param {string} html
     */
    function _safeInjectHtml(containerEl, html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html.trim(), 'text/html');
        // Strip out scripts to prevent execution upon adoption
        const scripts = doc.querySelectorAll('script');
        for (let i = 0; i < scripts.length; i++) {
            scripts[i].parentNode.removeChild(scripts[i]);
        }
        // Collect all top-level body children
        const nodes = Array.from(doc.body.childNodes);
        // Clear container and append parsed nodes
        while (containerEl.firstChild) {
            containerEl.removeChild(containerEl.firstChild);
        }
        nodes.forEach(function (node) {
            containerEl.appendChild(document.adoptNode(node));
        });
    }

    /* ── Placeholder HTML ─────────────────────────────── */

    function _skeletonHtml() {
        return '<div class="vd-skeleton-card" style="position:relative;min-height:200px;padding:2rem;overflow:hidden;">'
            + '<div class="vd-skeleton vd-skeleton-heading-lg" style="margin-bottom:1.5rem;"></div>'
            + '<div class="vd-skeleton vd-skeleton-paragraph">'
            + '<div class="vd-skeleton vd-skeleton-text"></div>'
            + '<div class="vd-skeleton vd-skeleton-text"></div>'
            + '<div class="vd-skeleton vd-skeleton-text"></div></div>'
            + '<div class="vd-dynamic-loader" style="position:absolute;inset:0;">'
            + '<div class="vd-dynamic-loader-grid">'
            + '<div class="vd-spinner vd-spinner-sm vd-spinner-success" style="animation-delay:0s;"></div>'
            + '<div class="vd-spinner vd-spinner-sm vd-spinner-warning" style="animation-delay:-0.15s;"></div>'
            + '<div class="vd-spinner vd-spinner-sm vd-spinner-error" style="animation-delay:-0.3s;"></div>'
            + '<div class="vd-spinner vd-spinner-sm vd-spinner-info" style="animation-delay:-0.45s;"></div></div>'
            + '<span class="vd-dynamic-loader-text">Loading…</span></div></div>';
    }

    function _spinnerHtml() {
        return '<div class="vd-dynamic-loader" style="min-height:180px;display:flex;align-items:center;justify-content:center;">'
            + '<div class="vd-dynamic-loader-grid">'
            + '<div class="vd-spinner vd-spinner-sm vd-spinner-success" style="animation-delay:0s;"></div>'
            + '<div class="vd-spinner vd-spinner-sm vd-spinner-warning" style="animation-delay:-0.15s;"></div>'
            + '<div class="vd-spinner vd-spinner-sm vd-spinner-error" style="animation-delay:-0.3s;"></div>'
            + '<div class="vd-spinner vd-spinner-sm vd-spinner-info" style="animation-delay:-0.45s;"></div></div>'
            + '<span class="vd-dynamic-loader-text">Loading…</span></div>';
    }

    function _resolvePlaceholder(placeholder) {
        if (!placeholder || placeholder === 'skeleton') return _skeletonHtml();
        if (placeholder === 'spinner') return _spinnerHtml();
        // Caller-supplied HTML string
        return placeholder;
    }

    /* ── Dispatch helper ──────────────────────────────── */

    function _dispatch(el, eventName, detail) {
        el.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail: detail || {} }));
    }

    /* ── VanduoLazyLoad ──────────────────────────────── */

    const VanduoLazyLoad = {

        /* ─────────────────────────────────────────────────
         * LOW-LEVEL API
         * ───────────────────────────────────────────────── */

        /**
         * Observe an element. `callback` is invoked once when the element
         * enters the viewport, then the element is automatically unobserved.
         *
         * @param {Element} element
         * @param {function(Element): void} callback
         * @param {{ threshold?: number, rootMargin?: string }} [options]
         */
        observe: function (element, callback, options) {
            if (!(element instanceof Element)) {
                console.warn('[VanduoLazyLoad] observe() requires a DOM Element.');
                return;
            }
            if (typeof callback !== 'function') {
                console.warn('[VanduoLazyLoad] observe() requires a callback function.');
                return;
            }
            // Already observed — ignore
            if (_observerMap.has(element)) return;

            const threshold = (options && options.threshold != null) ? options.threshold : 0;
            const rootMargin = (options && options.rootMargin) ? options.rootMargin : '0px';

            const observer = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        obs.unobserve(entry.target);
                        _observerMap.delete(entry.target);
                        try {
                            callback(entry.target);
                        } catch (e) {
                            console.error('[VanduoLazyLoad] Callback threw:', e);
                        }
                    }
                });
            }, { threshold: threshold, rootMargin: rootMargin });

            _observerMap.set(element, observer);
            observer.observe(element);
        },

        /**
         * Stop observing an element that was previously passed to observe().
         * @param {Element} element
         */
        unobserve: function (element) {
            const observer = _observerMap.get(element);
            if (observer) {
                observer.unobserve(element);
                _observerMap.delete(element);
            }
        },

        /**
         * Stop observing ALL currently observed elements.
         */
        unobserveAll: function () {
            _observerMap.forEach(function (observer, element) {
                observer.unobserve(element);
            });
            _observerMap.clear();
        },

        /* ─────────────────────────────────────────────────
         * HIGH-LEVEL API
         * ───────────────────────────────────────────────── */

        /**
         * Fetch an HTML partial and inject it into `containerEl` when the
         * container enters the viewport. A placeholder is shown immediately.
         *
         * @param {string} url               URL of the HTML partial to fetch
         * @param {Element} containerEl      Target element whose content will be replaced
         * @param {{
         *   placeholder?: 'skeleton'|'spinner'|string,
         *   threshold?:   number,
         *   rootMargin?:  string,
         *   onLoaded?:    function(Element): void,
         *   onError?:     function(Error): void
         * }} [options]
         */
        loadSection: function (url, containerEl, options) {
            if (typeof url !== 'string' || !url) {
                console.warn('[VanduoLazyLoad] loadSection() requires a non-empty URL string.');
                return;
            }
            if (!(containerEl instanceof Element)) {
                console.warn('[VanduoLazyLoad] loadSection() requires a DOM Element as containerEl.');
                return;
            }
            // Reject cross-origin URLs to prevent SSRF-style fetch abuse
            if (!_isSafeUrl(url)) {
                console.error('[VanduoLazyLoad] loadSection() blocked cross-origin URL:', url);
                return;
            }

            const opts = options || {};
            // Placeholders are known-safe static HTML strings built internally
            const placeholderHtml = _resolvePlaceholder(opts.placeholder);

            // Use _safeInjectHtml instead of innerHTML to prevent XSS from caller-supplied placeholders
            _safeInjectHtml(containerEl, placeholderHtml);
            _dispatch(containerEl, 'lazysection:loading', { url: url });

            // Fetch when visible
            this.observe(containerEl, function () {
                const controller = new window.AbortController();
                const timeoutId = setTimeout(function () { controller.abort(); }, 10000);

                window.fetch(url, { signal: controller.signal })
                    .then(function (res) {
                        clearTimeout(timeoutId);
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        return res.text();
                    })
                    .then(function (html) {
                        // Use DOMParser to parse fetched content safely, avoiding
                        // raw innerHTML assignment of externally-sourced strings
                        _safeInjectHtml(containerEl, html);
                        _dispatch(containerEl, 'lazysection:loaded', { url: url });
                        // Re-init Vanduo components inside the new content
                        if (typeof window.Vanduo !== 'undefined') {
                            window.Vanduo.init();
                        }
                        if (typeof opts.onLoaded === 'function') {
                            opts.onLoaded(containerEl);
                        }
                    })
                    .catch(function (err) {
                        // Build error node via DOM APIs — no dynamic HTML strings
                        const alertEl = document.createElement('div');
                        alertEl.className = 'vd-alert vd-alert-error';
                        alertEl.setAttribute('role', 'alert');
                        const msgEl = document.createElement('span');
                        msgEl.textContent = 'Failed to load content. ';
                        const detailEl = document.createElement('small');
                        detailEl.style.opacity = '0.7';
                        detailEl.textContent = err.message;
                        alertEl.appendChild(msgEl);
                        alertEl.appendChild(detailEl);
                        while (containerEl.firstChild) {
                            containerEl.removeChild(containerEl.firstChild);
                        }
                        containerEl.appendChild(alertEl);
                        _dispatch(containerEl, 'lazysection:error', { url: url, error: err });
                        console.error('[VanduoLazyLoad] loadSection failed:', err);
                        if (typeof opts.onError === 'function') {
                            opts.onError(err);
                        }
                    });
            }, { threshold: opts.threshold, rootMargin: opts.rootMargin });
        },

        /* ─────────────────────────────────────────────────
         * ATTRIBUTE-DRIVEN INIT
         * ───────────────────────────────────────────────── */

        /**
         * Scan the DOM for [data-vd-lazy] elements and wire them up.
         * Safe to call multiple times — already-observed elements are skipped.
         */
        init: function () {
            const self = this;
            const elements = document.querySelectorAll('[data-vd-lazy]');
            elements.forEach(function (el) {
                // Skip already-observed or already-loaded elements
                if (_observerMap.has(el) || el.dataset.vdLazyState === 'loading' || el.dataset.vdLazyState === 'loaded') return;

                const url = el.getAttribute('data-vd-lazy');
                if (!url) return;

                el.dataset.vdLazyState = 'loading';
                const placeholder = el.getAttribute('data-vd-lazy-placeholder') || 'skeleton';

                self.loadSection(url, el, {
                    placeholder: placeholder,
                    onLoaded: function () {
                        el.dataset.vdLazyState = 'loaded';
                    },
                    onError: function () {
                        el.dataset.vdLazyState = 'error';
                    }
                });
            });
        }
    };

    /* ── Register with Vanduo ─────────────────────────── */
    if (typeof window.Vanduo !== 'undefined') {
        window.Vanduo.register('LazyLoad', VanduoLazyLoad);
    }

    /* ── Global convenience alias ─────────────────────── */
    window.VanduoLazyLoad = VanduoLazyLoad;

})();
