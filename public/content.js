// Content script: on/off persisted state and simple per-product indicator (no analysis)
(function () {
    'use strict';

    const STORAGE_ACTIVE_KEY = 'truthlens_active';
    const STORAGE_STATUS_KEY = 'truthlens_status';
    let isActive = true;
    let currentStatus = 'scam';
    let processedProducts = new WeakSet();
    let mutationObserver = null;

    const siteConfigs = {
        'amazon': {
            productSelectors: [
                '[data-component-type="s-search-result"]',
                '[data-asin]',
                '.s-result-item',
                '.s-widget-container',
                '.s-search-result'
            ]
        },
        'walmart': {
            productSelectors: [
                '[data-item-id]',
                '.search-result-gridview-item',
                '.search-result-gridview-item-wrapper'
            ]
        },
        'ebay': {
            productSelectors: [
                "[data-viewport]",
                '.s-item',
                '.s-item__wrapper'
            ]
        },
        'target': {
            productSelectors: [
                '[data-test="product-details"]',
                '.styles__ProductCardContainer'
            ]
        },
        'bestbuy': {
            productSelectors: [
                '.product-item',
                '.sku-item'
            ]
        }
    };

    function getCurrentSite() {
        const hostname = window.location.hostname.toLowerCase();
        if (hostname.includes('amazon')) return 'amazon';
        if (hostname.includes('walmart')) return 'walmart';
        if (hostname.includes('ebay')) return 'ebay';
        if (hostname.includes('target')) return 'target';
        if (hostname.includes('bestbuy')) return 'bestbuy';
        return 'default';
    }

    function removeAllIndicators() {
        document.querySelectorAll('[data-truthlens="true"]').forEach(node => node.remove());
        document.querySelectorAll('[data-truthlens-product="true"]').forEach(node => node.removeAttribute('data-truthlens-product'));
        // Reset processed set so re-enabling can re-mark items
        processedProducts = new WeakSet();
    }

    function isProcessed(element) {
        if (processedProducts.has(element)) return true;
        if (element.closest('[data-truthlens-product="true"]')) return true;
        if (element.querySelector('[data-truthlens="true"]')) return true;
        return false;
    }

    function markProcessed(element) {
        try { element.setAttribute('data-truthlens-product', 'true'); } catch (_) { }
        processedProducts.add(element);
    }

    function getStyleForStatus(status) {
        switch (status) {
            case 'scam':
                return { bg: '#f44336', text: '✗', title: 'TruthLens: SCAM' };
            case 'uncertain':
                return { bg: '#ff9800', text: '...', title: 'TruthLens: UNCERTAIN' };
            default:
                return { bg: '#4CAF50', text: '✓', title: 'TruthLens: LEGIT' };
        }
    }

    function applyStatusToIndicator(indicator, status) {
        const s = getStyleForStatus(status);
        indicator.style.background = s.bg;
        indicator.textContent = s.text;
        indicator.title = s.title;
    }

    function createIndicator(status) {
        const indicator = document.createElement('button');
        indicator.setAttribute('data-truthlens', 'true');
        indicator.style.position = 'absolute';
        indicator.style.top = '10px';
        indicator.style.right = '10px';
        indicator.style.width = '22px';
        indicator.style.height = '22px';
        indicator.style.borderRadius = '50%';
        indicator.style.color = '#fff';
        indicator.style.display = 'flex';
        indicator.style.alignItems = 'center';
        indicator.style.justifyContent = 'center';
        indicator.style.fontWeight = 'bold';
        indicator.style.fontSize = '12px';
        indicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
        indicator.style.border = '2px solid #fff';

        indicator.style.border = 'none';
        indicator.style.outline = 'none';
        indicator.style.cursor = 'pointer';
        indicator.style.zIndex = '9999';
        indicator.style.pointerEvents = 'auto';
        indicator.style.userSelect = 'none';

        indicator.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const existingBox = document.querySelector('[data-truthlens-info]');
            if (existingBox) {
                existingBox.remove();
                return;
            }

            const infoBox = document.createElement('div');
            infoBox.setAttribute('data-truthlens-info', 'true');
            infoBox.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(88, 81, 85, 0.95);
                border: 2px solid rgb(255, 255, 255);
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 400px;
                font-family: Arial, sans-serif;
            `;

            infoBox.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <img id="truthlens-logo" alt="TruthLens Logo" style="width: 40px; height: 50px; margin-right: 10px;">
                    <h3 style="margin: 0; color: #fff;">TruthLens Analysis</h3>
                </div>
                <p style="margin: 5px 0; color: #fff;"><strong>Status:</strong> ${status.toUpperCase()}</p>
                <p style="margin: 5px 0; color: #fff;"><strong>Analysis:</strong> This product has been analyzed for potential scams.</p>
                <p style="margin: 5px 0; color: #fff;"><strong>Confidence:</strong> ${status === 'scam' ? 'High' : status === 'legit' ? 'High' : 'Medium'}</p>
                <p style="margin: 5px 0; color: #fff;"><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
                <button id="close-btn" style="align-items: center; margin-top: 15px; padding: 8px 16px; background: rgb(255, 255, 255, 0.2); color: white; border: none; border-radius: 4px; cursor: pointer; &:hover {
                    background: rgba(255, 255, 255, 0.3);
                    color: white;
                }">
                    Close
                </button>
            `;

            // Load the logo using Chrome extension API
            const logoImg = infoBox.querySelector('#truthlens-logo');
            if (chrome && chrome.runtime) {
                try {
                    const logoUrl = chrome.runtime.getURL('logo3.png');
                    logoImg.src = logoUrl;
                    logoImg.onerror = () => {
                        // Fallback to styled TL if logo fails to load
                        logoImg.style.display = 'none';
                        const tlDiv = document.createElement('div');
                        tlDiv.style.cssText = 'width: 40px; height: 50px; background: linear-gradient(45deg, #4CAF50, #2196F3); border-radius: 8px; margin-right: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;';
                        tlDiv.textContent = 'TL';
                        logoImg.parentNode.insertBefore(tlDiv, logoImg);
                    };
                } catch (e) {
                    // Fallback to styled TL if Chrome API fails
                    logoImg.style.display = 'none';
                    const tlDiv = document.createElement('div');
                    tlDiv.style.cssText = 'width: 40px; height: 50px; background: linear-gradient(45deg, #4CAF50, #2196F3); border-radius: 8px; margin-right: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;';
                    tlDiv.textContent = 'TL';
                    logoImg.parentNode.insertBefore(tlDiv, logoImg);
                }
            } else {
                // Fallback for non-Chrome environments
                logoImg.style.display = 'none';
                const tlDiv = document.createElement('div');
                tlDiv.style.cssText = 'width: 40px; height: 50px; background: linear-gradient(45deg, #4CAF50, #2196F3); border-radius: 8px; margin-right: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;';
                tlDiv.textContent = 'TL';
                logoImg.parentNode.insertBefore(tlDiv, logoImg);
            }

            document.body.appendChild(infoBox);

            // Add event listener to close button (this is the fix!)
            const closeBtn = infoBox.querySelector('#close-btn');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                infoBox.remove();
            });

            // Close on background click
            infoBox.addEventListener('click', (e) => {
                if (e.target === infoBox) {
                    infoBox.remove();
                }
            });

        });
        applyStatusToIndicator(indicator, status);
        return indicator;
    }

    function updateAllIndicators(status) {
        document.querySelectorAll('[data-truthlens="true"]').forEach(ind => applyStatusToIndicator(ind, status));
    }

    function processProducts() {
        if (!isActive) return;
        const site = getCurrentSite();
        const config = siteConfigs[site];
        if (!config) return;

        config.productSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(product => {
                if (isProcessed(product)) return;
                const style = getComputedStyle(product);
                if (style.position === 'static') {
                    product.style.position = 'relative';
                }
                const indicator = createIndicator(currentStatus);
                product.appendChild(indicator);
                markProcessed(product);
            });
        });
    }

    function startObserver() {
        if (mutationObserver) return;
        mutationObserver = new MutationObserver((mutations) => {
            let shouldProcess = false;
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes.length > 0) { shouldProcess = true; break; }
            }
            if (shouldProcess) setTimeout(processProducts, 400);
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true });
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(processProducts, 300);
        }, { passive: true });
    }

    function stopObserver() {
        try { mutationObserver?.disconnect(); } catch (_) { }
        mutationObserver = null;
    }


    try {
        chrome.storage?.local?.get([STORAGE_ACTIVE_KEY, STORAGE_STATUS_KEY], (result) => {
            if (result && typeof result[STORAGE_ACTIVE_KEY] === 'boolean') {
                isActive = result[STORAGE_ACTIVE_KEY];
            } else {
                chrome.storage?.local?.set({ [STORAGE_ACTIVE_KEY]: isActive });
            }
            chrome.storage?.local?.set({ [STORAGE_STATUS_KEY]: currentStatus });

            if (isActive) {
                processProducts();
                startObserver();
            }
        });
    } catch (_) { }

    try {
        chrome.storage?.onChanged?.addListener((changes, area) => {
            if (area !== 'local') return;
            if (changes[STORAGE_STATUS_KEY] && typeof changes[STORAGE_STATUS_KEY].newValue === 'string') {
                currentStatus = changes[STORAGE_STATUS_KEY].newValue;
                if (isActive) updateAllIndicators(currentStatus);
            }
        });
    } catch (_) { }

    // Handle messages from popup
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!message || !message.type) return;
        if (message.type === 'GET_ACTIVE') {
            sendResponse({ active: isActive });
        }
        if (message.type === 'SET_ACTIVE' && typeof message.active === 'boolean') {
            isActive = message.active;
            try { chrome.storage?.local?.set({ [STORAGE_ACTIVE_KEY]: isActive }); } catch (_) { }
            if (isActive) {
                processProducts();
                startObserver();
            } else {
                stopObserver();
                removeAllIndicators();
            }
            sendResponse({ active: isActive });
        }
        if (message.type === 'SET_STATUS' && typeof message.status === 'string') {
            currentStatus = message.status;
            try { chrome.storage?.local?.set({ [STORAGE_STATUS_KEY]: currentStatus }); } catch (_) { }
            if (isActive) updateAllIndicators(currentStatus);
            sendResponse({ status: currentStatus });
        }
        if (message.type === 'GET_STATUS') {
            sendResponse({ status: currentStatus });
        }
    });
})();
