/**
 * AI Chat Navigator - Premium Edition
 * Navigate conversations in ChatGPT, Claude, and Gemini
 */

(function () {
    'use strict';

    let navigatorContainer = null;
    let isVisible = true;
    let messages = [];
    let currentActiveIndex = -1;
    let currentFilter = 'all';
    let currentPlatform = null;
    let lastMessageCount = 0; // Track message count to avoid unnecessary refreshes

    // Platform detection and selectors
    const PLATFORMS = {
        chatgpt: {
            name: 'ChatGPT',
            hostPatterns: ['chat.openai.com', 'chatgpt.com'],
            messageWrapper: '[data-message-author-role]',
            getRole: (el) => el.getAttribute('data-message-author-role')
        },
        claude: {
            name: 'Claude',
            hostPatterns: ['claude.ai'],
            // Claude conversation structure - detect message containers
            messageWrapper: '[data-testid*="human"], [data-testid*="assistant"], [data-testid*="user"], [class*="human"], [class*="claude-message"], .prose, [data-is-streaming]',
            getRole: (el) => {
                // Check element and parents for role indicators
                const checkForRole = (element) => {
                    if (!element) return null;
                    const testId = element.getAttribute('data-testid') || '';
                    const className = element.className || '';

                    if (testId.includes('human') || testId.includes('user') ||
                        className.includes('human') || className.includes('User')) {
                        return 'user';
                    }
                    if (testId.includes('assistant') || testId.includes('claude') ||
                        className.includes('assistant') || className.includes('claude')) {
                        return 'assistant';
                    }
                    return null;
                };

                // Check self
                let role = checkForRole(el);
                if (role) return role;

                // Check up to 5 parent levels
                let parent = el.parentElement;
                for (let i = 0; i < 5 && parent; i++) {
                    role = checkForRole(parent);
                    if (role) return role;
                    parent = parent.parentElement;
                }

                // Default based on position or content
                return 'assistant';
            }
        },
        gemini: {
            name: 'Gemini',
            hostPatterns: ['gemini.google.com'],
            messageWrapper: '[data-message-author], .query-content, .response-content',
            getRole: (el) => {
                const author = el.getAttribute('data-message-author');
                if (author === 'user') return 'user';
                if (author === 'model') return 'assistant';
                if (el.matches('[class*="query"], [class*="user"]')) return 'user';
                return 'assistant';
            }
        }
    };

    // Icons
    const ICONS = {
        nav: `<svg viewBox="0 0 24 24"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>`,
        user: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
        assistant: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
        empty: `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`,
        both: `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>`
    };

    /**
     * Detect which platform we're on
     */
    function detectPlatform() {
        const hostname = window.location.hostname;

        for (const [key, platform] of Object.entries(PLATFORMS)) {
            if (platform.hostPatterns.some(pattern => hostname.includes(pattern))) {
                console.log(`AI Navigator: Detected platform - ${platform.name}`);
                return { key, ...platform };
            }
        }

        console.log('AI Navigator: Unknown platform, using ChatGPT selectors');
        return { key: 'chatgpt', ...PLATFORMS.chatgpt };
    }

    /**
     * Initialize the navigator
     */
    function init() {
        console.log('AI Chat Navigator: Initializing...');

        currentPlatform = detectPlatform();

        // Create UI immediately with loading state
        createNavigator();
        showLoadingState();

        // Start scanning after a short delay
        setTimeout(() => {
            scanMessages(true); // Force initial scan
            setupObserver();
            setupKeyboardShortcuts();
            console.log(`AI Chat Navigator: Ready on ${currentPlatform.name}!`);

            // Keep trying to find messages for first 10 seconds
            let retries = 0;
            const retryInterval = setInterval(() => {
                if (messages.length === 0 && retries < 10) {
                    console.log('AI Navigator: Retrying scan...');
                    lastMessageCount = 0;
                    scanMessages(true);
                    retries++;
                } else {
                    clearInterval(retryInterval);
                }
            }, 1000);

            // Periodic check for empty messages that now have content (every 3 seconds)
            setInterval(() => {
                const hasEmpty = messages.some(m => !m.preview || m.preview === 'Empty message');
                if (hasEmpty) {
                    scanMessages(); // Will only update if shouldRescan returns true
                }
            }, 3000);
        }, 500);
    }

    /**
     * Show loading state in the panel
     */
    function showLoadingState() {
        const markersWrapper = navigatorContainer?.querySelector('.nav-markers-wrapper');
        if (!markersWrapper) return;

        markersWrapper.innerHTML = `
            <div class="nav-empty-state">
                ${ICONS.empty}
                <p>Loading messages...</p>
            </div>
        `;
    }

    /**
     * Create the navigator UI
     */
    function createNavigator() {
        const existing = document.getElementById('chatgpt-navigator-container');
        if (existing) existing.remove();
        const existingBtn = document.getElementById('chatgpt-nav-toggle');
        if (existingBtn) existingBtn.remove();

        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'chatgpt-nav-toggle';
        toggleBtn.title = 'Toggle Navigator (Alt+N)';
        toggleBtn.innerHTML = ICONS.nav;
        toggleBtn.addEventListener('click', toggleNavigator);
        document.body.appendChild(toggleBtn);

        // Create main container
        navigatorContainer = document.createElement('div');
        navigatorContainer.id = 'chatgpt-navigator-container';

        // Header
        const header = document.createElement('div');
        header.className = 'nav-header';
        header.innerHTML = `
      <div class="nav-header-title">
        ${ICONS.nav}
        <h3>AI Chat Navigator</h3>
      </div>
      <div class="nav-header-stats">
        <div class="nav-stat">
          <span class="nav-stat-dot user"></span>
          <span class="nav-stat-count user-count">0</span> queries
        </div>
        <div class="nav-stat">
          <span class="nav-stat-dot assistant"></span>
          <span class="nav-stat-count assistant-count">0</span> responses
        </div>
      </div>
    `;
        navigatorContainer.appendChild(header);

        // Filter Tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'nav-tabs';
        tabsContainer.innerHTML = `
      <button class="nav-tab active" data-filter="all">
        ${ICONS.both}
        <span>All</span>
      </button>
      <button class="nav-tab" data-filter="user">
        ${ICONS.user}
        <span>Queries</span>
      </button>
      <button class="nav-tab" data-filter="assistant">
        ${ICONS.assistant}
        <span>Responses</span>
      </button>
    `;
        navigatorContainer.appendChild(tabsContainer);

        tabsContainer.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                tabsContainer.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderFilteredMessages();
            });
        });

        // Markers wrapper
        const markersWrapper = document.createElement('div');
        markersWrapper.className = 'nav-markers-wrapper';
        navigatorContainer.appendChild(markersWrapper);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'nav-footer';
        footer.innerHTML = `
      <div class="nav-shortcut-row">
        <span>Toggle panel</span>
        <div class="nav-shortcut-keys">
          <span class="nav-shortcut-key">Alt</span>
          <span class="nav-shortcut-key">N</span>
        </div>
      </div>
      <div class="nav-shortcut-row">
        <span>Prev/Next query</span>
        <div class="nav-shortcut-keys">
          <span class="nav-shortcut-key">Alt</span>
          <span class="nav-shortcut-key">↑↓</span>
        </div>
      </div>
    `;
        navigatorContainer.appendChild(footer);

        document.body.appendChild(navigatorContainer);
    }

    /**
     * Toggle navigator visibility
     */
    function toggleNavigator() {
        isVisible = !isVisible;
        if (navigatorContainer) {
            navigatorContainer.style.display = isVisible ? 'flex' : 'none';
        }
    }

    function shouldRescan() {
        const currentElements = document.querySelectorAll(currentPlatform.messageWrapper);
        const currentCount = currentElements.length;

        // Rescan if message count changed
        if (currentCount !== lastMessageCount) {
            lastMessageCount = currentCount;
            return true;
        }

        // Check if any stored elements are detached from DOM (React replaced them)
        const hasStaleElements = messages.some(msg => !msg.element.isConnected);
        if (hasStaleElements) {
            console.log('AI Navigator: Found stale elements (React update), rescanning...');
            return true;
        }

        // Also rescan if we have any messages with empty previews that now have content
        // We have to re-find the element by index if it's stale, but if we caught stale above, 
        // this is just for existing connected elements that got text update (rare in React, usually replaced)
        const hasEmptyMessages = messages.some((msg, idx) => {
            if (!msg.preview || msg.preview === 'Empty message') {
                // If element is connected, check its text
                if (msg.element.isConnected) {
                    const currentText = msg.element.textContent?.trim() || '';
                    return currentText.length > 10;
                }
                // If disconnected, we effectively have "new content" somewhere, handled by stale check
                return true;
            }
            return false;
        });

        if (hasEmptyMessages) {
            console.log('AI Navigator: Found empty messages with new content, rescanning...');
            return true;
        }

        return false;
    }

    /**
     * Scan all messages in the current chat
     */
    function scanMessages(forceRefresh = false) {
        // Skip if message count hasn't changed (prevents flickering during streaming)
        if (!forceRefresh && !shouldRescan()) {
            return;
        }

        messages = [];
        const messageElements = document.querySelectorAll(currentPlatform.messageWrapper);

        let userCount = 0;
        let assistantCount = 0;

        messageElements.forEach((el, index) => {
            let role = currentPlatform.getRole(el);

            if (!role) {
                const classList = (el.className || '').toLowerCase();
                if (classList.includes('human') || classList.includes('user')) {
                    role = 'user';
                } else {
                    role = 'assistant';
                }
            }

            const textContent = el.textContent?.trim() || '';
            const preview = textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');

            if (role === 'user') userCount++;
            else if (role === 'assistant') assistantCount++;

            messages.push({
                element: el,
                role: role,
                preview: preview,
                index: index
            });
        });

        // Update stats
        const userCountEl = navigatorContainer?.querySelector('.user-count');
        const assistantCountEl = navigatorContainer?.querySelector('.assistant-count');
        if (userCountEl) userCountEl.textContent = userCount;
        if (assistantCountEl) assistantCountEl.textContent = assistantCount;

        renderFilteredMessages();
        console.log(`AI Navigator: Found ${messages.length} messages`);
    }

    /**
     * Render messages based on current filter
     */
    function renderFilteredMessages() {
        const markersWrapper = navigatorContainer?.querySelector('.nav-markers-wrapper');
        if (!markersWrapper) return;

        markersWrapper.innerHTML = '';

        const filteredMessages = currentFilter === 'all'
            ? messages
            : messages.filter(m => m.role === currentFilter);

        if (filteredMessages.length === 0) {
            const emptyText = currentFilter === 'user'
                ? 'No queries found'
                : currentFilter === 'assistant'
                    ? 'No responses found'
                    : 'No messages yet.<br>Start a conversation!';

            markersWrapper.innerHTML = `
        <div class="nav-empty-state">
          ${ICONS.empty}
          <p>${emptyText}</p>
        </div>
      `;
            return;
        }

        filteredMessages.forEach((msg, displayIndex) => {
            const marker = document.createElement('div');
            marker.className = `nav-marker ${msg.role}`;
            marker.dataset.index = msg.index;

            marker.innerHTML = `
        <div class="nav-marker-icon">
          ${msg.role === 'user' ? ICONS.user : ICONS.assistant}
        </div>
        <div class="nav-marker-content">
          <div class="nav-marker-type">${msg.role === 'user' ? 'Your Query' : 'AI Response'}</div>
          <div class="nav-marker-preview">${msg.preview || 'Empty message'}</div>
        </div>
        <span class="nav-marker-number">#${msg.index + 1}</span>
      `;

            marker.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollToMessage(msg.index);
            });

            markersWrapper.appendChild(marker);
        });

        updateActiveMarker();
    }

    /**
     * Scroll to a specific message with proper positioning
     */
    function scrollToMessage(index) {
        const message = messages[index];
        if (!message || !message.element) {
            console.log('AI Navigator: Message not found at index', index);
            return;
        }

        console.log('AI Navigator: Scrolling to message', index, 'role:', message.role);
        console.log('AI Navigator: Element rect before scroll:', message.element.getBoundingClientRect());

        const targetElement = message.element;

        // Find the parent message container (ChatGPT wraps messages in containers)
        let scrollTarget = targetElement;
        let parent = targetElement.parentElement;

        // Try to find a parent container that's a "turn" or "group"
        while (parent && parent.tagName !== 'MAIN') {
            if (parent.getAttribute('data-testid')?.includes('conversation-turn') ||
                parent.classList.contains('group') ||
                parent.classList.contains('w-full')) {
                scrollTarget = parent;
                console.log('AI Navigator: Found parent container:', parent.className);
                break;
            }
            parent = parent.parentElement;
        }

        // Scroll to the START of the element/container
        scrollTarget.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // After scroll, adjust position to add padding above
        setTimeout(() => {
            const scrollContainer = document.querySelector('[class*="react-scroll-to-bottom"]')
                || document.querySelector('[class*="overflow-y-auto"]')
                || document.querySelector('main');

            if (scrollContainer && scrollContainer.scrollTop > 50) {
                // Scroll up 150px to add generous padding above (more breathing room)
                scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - 150);
                console.log('AI Navigator: Adjusted scroll by -150px');
            }
        }, 400);

        // Highlight effect
        const originalOutline = targetElement.style.outline;
        const originalOutlineOffset = targetElement.style.outlineOffset;
        const originalTransition = targetElement.style.transition;

        targetElement.style.transition = 'outline 0.3s ease, outline-offset 0.3s ease';
        targetElement.style.outline = message.role === 'user'
            ? '3px solid #10a37f'
            : '3px solid #8b5cf6';
        targetElement.style.outlineOffset = '4px';

        setTimeout(() => {
            targetElement.style.outline = originalOutline;
            targetElement.style.outlineOffset = originalOutlineOffset;
            targetElement.style.transition = originalTransition;
        }, 2000);

        currentActiveIndex = index;
        updateActiveMarker();
    }

    /**
     * Navigate to previous user query
     */
    function goToPrevUserQuery() {
        if (!messages.length) return;

        let startIndex = currentActiveIndex > 0 ? currentActiveIndex - 1 : messages.length - 1;

        for (let i = startIndex; i >= 0; i--) {
            if (messages[i].role === 'user') {
                scrollToMessage(i);
                return;
            }
        }

        for (let i = messages.length - 1; i > startIndex; i--) {
            if (messages[i].role === 'user') {
                scrollToMessage(i);
                return;
            }
        }
    }

    /**
     * Navigate to next user query
     */
    function goToNextUserQuery() {
        if (!messages.length) return;

        let startIndex = currentActiveIndex < messages.length - 1 ? currentActiveIndex + 1 : 0;

        for (let i = startIndex; i < messages.length; i++) {
            if (messages[i].role === 'user') {
                scrollToMessage(i);
                return;
            }
        }

        for (let i = 0; i < startIndex; i++) {
            if (messages[i].role === 'user') {
                scrollToMessage(i);
                return;
            }
        }
    }

    /**
     * Update which marker is currently active
     */
    function updateActiveMarker() {
        const markers = navigatorContainer?.querySelectorAll('.nav-marker');
        if (!markers) return;

        markers.forEach((marker) => {
            const markerIndex = parseInt(marker.dataset.index);
            marker.classList.remove('active');
            if (markerIndex === currentActiveIndex) {
                marker.classList.add('active');
                marker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    /**
     * Setup MutationObserver - with longer debounce to prevent flickering
     */
    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            // Clear any pending rescan
            clearTimeout(window.navRescanTimeout);

            // Long debounce (2 seconds) to wait for streaming to finish
            window.navRescanTimeout = setTimeout(() => {
                scanMessages();
            }, 2000);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: false, // Don't watch text changes
            attributes: false     // Don't watch attribute changes
        });

        // Watch for URL changes
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                lastMessageCount = 0; // Reset count for new chat
                setTimeout(() => {
                    scanMessages(true); // Force refresh on URL change
                }, 1500);
            }
        }, 1000);
    }

    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                toggleNavigator();
            }

            if (e.altKey && e.key === 'ArrowUp') {
                e.preventDefault();
                goToPrevUserQuery();
            }

            if (e.altKey && e.key === 'ArrowDown') {
                e.preventDefault();
                goToNextUserQuery();
            }

            if (e.altKey && e.key.toLowerCase() === 't') {
                e.preventDefault();
                if (messages.length > 0) scrollToMessage(0);
            }

            if (e.altKey && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                if (messages.length > 0) scrollToMessage(messages.length - 1);
            }

            if (e.altKey && e.key === '1') {
                e.preventDefault();
                setFilter('all');
            }

            if (e.altKey && e.key === '2') {
                e.preventDefault();
                setFilter('user');
            }

            if (e.altKey && e.key === '3') {
                e.preventDefault();
                setFilter('assistant');
            }

            // Alt+R: Manual refresh
            if (e.altKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                lastMessageCount = 0;
                scanMessages(true);
            }
        });
    }

    /**
     * Set filter programmatically
     */
    function setFilter(filter) {
        currentFilter = filter;
        const tabs = navigatorContainer?.querySelectorAll('.nav-tab');
        tabs?.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        renderFilteredMessages();
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
