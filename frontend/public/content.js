// Content script: on/off persisted state and product analysis with backend integration
(function () {
    'use strict';

    const STORAGE_ACTIVE_KEY = 'truthlens_active';
    const STORAGE_STATUS_KEY = 'truthlens_status';
    const STORAGE_ANALYSIS_KEY = 'truthlens_analysis';
    const API_BASE_URL = 'http://localhost:8000';
    
    let isActive = true;
    let currentStatus = 'uncertain';
    let processedProducts = new WeakSet();
    let mutationObserver = null;
    let analysisCache = new Map(); // Cache analysis results

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

    // Extract product data from different e-commerce sites
    function extractProductData(element, site) {
        const data = {
            title: '',
            description: '',
            price: '',
            seller: '',
            rating: '',
            reviews_count: '',
            url: window.location.href
        };

        try {
            switch (site) {
                case 'amazon':
                    // Amazon-specific selectors
                    const titleEl = element.querySelector('h2 a span, .s-size-mini .a-link-normal span, [data-cy="title-recipe-title"] span');
                    if (titleEl) data.title = titleEl.textContent.trim();

                    const priceEl = element.querySelector('.a-price-whole, .a-price .a-offscreen, .a-price-range');
                    if (priceEl) data.price = priceEl.textContent.trim();

                    const ratingEl = element.querySelector('.a-icon-alt, .a-star-mini .a-icon-alt');
                    if (ratingEl) data.rating = ratingEl.textContent.match(/(\d+\.?\d*)/)?.[1] || '';

                    const reviewsEl = element.querySelector('a[href*="reviews"] span, .a-size-base');
                    if (reviewsEl) data.reviews_count = reviewsEl.textContent.trim();

                    const sellerEl = element.querySelector('.a-size-base-plus, .a-color-secondary');
                    if (sellerEl) data.seller = sellerEl.textContent.trim();
                    break;

                case 'walmart':
                    const walmartTitle = element.querySelector('[data-automation-id="product-title"], .search-result-product-title');
                    if (walmartTitle) data.title = walmartTitle.textContent.trim();

                    const walmartPrice = element.querySelector('.price-current, .price-main');
                    if (walmartPrice) data.price = walmartPrice.textContent.trim();

                    const walmartRating = element.querySelector('.stars-container .stars-small');
                    if (walmartRating) data.rating = walmartRating.getAttribute('aria-label')?.match(/(\d+\.?\d*)/)?.[1] || '';

                    const walmartReviews = element.querySelector('.stars-reviews-count');
                    if (walmartReviews) data.reviews_count = walmartReviews.textContent.trim();
                    break;

                case 'ebay':
                    const ebayTitle = element.querySelector('.s-item__title, .s-item__link');
                    if (ebayTitle) data.title = ebayTitle.textContent.trim();

                    const ebayPrice = element.querySelector('.s-item__price, .notranslate');
                    if (ebayPrice) data.price = ebayPrice.textContent.trim();

                    const ebayRating = element.querySelector('.s-item__reviews .clipped');
                    if (ebayRating) data.rating = ebayRating.textContent.match(/(\d+\.?\d*)/)?.[1] || '';

                    const ebaySeller = element.querySelector('.s-item__seller-info-text');
                    if (ebaySeller) data.seller = ebaySeller.textContent.trim();
                    break;

                case 'target':
                    const targetTitle = element.querySelector('[data-test="product-title"], .styles__ProductCardTitle');
                    if (targetTitle) data.title = targetTitle.textContent.trim();

                    const targetPrice = element.querySelector('[data-test="current-price"], .styles__PriceText');
                    if (targetPrice) data.price = targetPrice.textContent.trim();

                    const targetRating = element.querySelector('[data-test="rating"], .styles__RatingText');
                    if (targetRating) data.rating = targetRating.textContent.match(/(\d+\.?\d*)/)?.[1] || '';
                    break;

                case 'bestbuy':
                    const bestbuyTitle = element.querySelector('.product-title, .sku-title');
                    if (bestbuyTitle) data.title = bestbuyTitle.textContent.trim();

                    const bestbuyPrice = element.querySelector('.price-current, .price-main');
                    if (bestbuyPrice) data.price = bestbuyPrice.textContent.trim();

                    const bestbuyRating = element.querySelector('.rating, .stars');
                    if (bestbuyRating) data.rating = bestbuyRating.textContent.match(/(\d+\.?\d*)/)?.[1] || '';
                    break;

                default:
                    // Generic fallback selectors
                    const genericTitle = element.querySelector('h1, h2, h3, .title, .product-title, [class*="title"]');
                    if (genericTitle) data.title = genericTitle.textContent.trim();

                    const genericPrice = element.querySelector('.price, [class*="price"], [class*="cost"]');
                    if (genericPrice) data.price = genericPrice.textContent.trim();
                    break;
            }
        } catch (error) {
            console.error('Error extracting product data:', error);
        }

        return data;
    }

    // Send product data to backend for analysis
    async function analyzeProductWithBackend(productData) {
        const cacheKey = `${productData.title}_${productData.price}`;
        
        // Check cache first
        if (analysisCache.has(cacheKey)) {
            return analysisCache.get(cacheKey);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/analyze-product`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Cache the result
            analysisCache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('Backend analysis failed:', error);
            // Return fallback analysis
            const fallbackResult = {
                success: false,
                error: error.message,
                analysis: {
                    status: 'uncertain',
                    confidence: 0.5,
                    reasons: ['Unable to analyze - Backend unavailable'],
                    indicators: {
                        scam_indicators: 0,
                        legit_indicators: 0
                    }
                }
            };
            
            // Cache fallback result too
            analysisCache.set(cacheKey, fallbackResult);
            return fallbackResult;
        }
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

    function createIndicator(status, analysisResult = null) {
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

        // Store analysis result for display
        indicator.analysisResult = analysisResult;

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

            // Generate detailed analysis content
            let analysisContent = '';
            if (analysisResult && analysisResult.analysis) {
                const analysis = analysisResult.analysis;
                const confidence = Math.round(analysis.confidence * 100);
                
                analysisContent = `
                    <p style="margin: 5px 0; color: #fff;"><strong>Status:</strong> ${analysis.status.toUpperCase()}</p>
                    <p style="margin: 5px 0; color: #fff;"><strong>Confidence:</strong> ${confidence}%</p>
                    ${analysis.reasons && analysis.reasons.length > 0 ? `
                        <p style="margin: 5px 0; color: #fff;"><strong>Analysis Reasons:</strong></p>
                        <ul style="margin: 5px 0; color: #fff; padding-left: 20px;">
                            ${analysis.reasons.map(reason => `<li>${reason}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${analysis.indicators ? `
                        <p style="margin: 5px 0; color: #fff;"><strong>Indicators:</strong></p>
                        <p style="margin: 2px 0; color: #fff;">• Scam indicators: ${analysis.indicators.scam_indicators}</p>
                        <p style="margin: 2px 0; color: #fff;">• Legit indicators: ${analysis.indicators.legit_indicators}</p>
                    ` : ''}
                `;
            } else {
                analysisContent = `
                    <p style="margin: 5px 0; color: #fff;"><strong>Status:</strong> ${status.toUpperCase()}</p>
                    <p style="margin: 5px 0; color: #fff;"><strong>Analysis:</strong> This product has been analyzed for potential scams.</p>
                    <p style="margin: 5px 0; color: #fff;"><strong>Confidence:</strong> ${status === 'scam' ? 'High' : status === 'legit' ? 'High' : 'Medium'}</p>
                `;
            }

            infoBox.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <img id="truthlens-logo" alt="TruthLens Logo" style="width: 40px; height: 50px; margin-right: 10px;">
                    <h3 style="margin: 0; color: #fff;">TruthLens Analysis</h3>
                </div>
                ${analysisContent}
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

    async function processProducts() {
        if (!isActive) return;
        const site = getCurrentSite();
        const config = siteConfigs[site];
        if (!config) return;

        for (const selector of config.productSelectors) {
            const products = document.querySelectorAll(selector);
            
            for (const product of products) {
                if (isProcessed(product)) continue;
                
                const style = getComputedStyle(product);
                if (style.position === 'static') {
                    product.style.position = 'relative';
                }
                
                // Extract product data
                const productData = extractProductData(product, site);
                
                // Only analyze if we have meaningful data
                if (productData.title && productData.title.length > 3) {
                    try {
                        // Analyze with backend
                        const analysisResult = await analyzeProductWithBackend(productData);
                        const status = analysisResult.analysis?.status || 'uncertain';
                        
                        // Create indicator with analysis result
                        const indicator = createIndicator(status, analysisResult);
                        product.appendChild(indicator);
                        
                        // Update stats
                        updateStats(status);
                        
                    } catch (error) {
                        console.error('Error analyzing product:', error);
                        // Fallback to uncertain status
                        const indicator = createIndicator('uncertain');
                        product.appendChild(indicator);
                    }
                } else {
                    // Fallback for products without enough data
                    const indicator = createIndicator('uncertain');
                    product.appendChild(indicator);
                }
                
                markProcessed(product);
            }
        }
    }

    // Update statistics
    function updateStats(status) {
        try {
            chrome.storage?.local?.get(['truthlens_stats'], (result) => {
                const stats = result?.truthlens_stats || { legit: 0, scam: 0, uncertain: 0 };
                stats[status] = (stats[status] || 0) + 1;
                chrome.storage?.local?.set({ truthlens_stats: stats });
            });
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    function startObserver() {
        if (mutationObserver) return;
        mutationObserver = new MutationObserver((mutations) => {
            let shouldProcess = false;
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes.length > 0) { 
                    shouldProcess = true; 
                    break; 
                }
            }
            if (shouldProcess) {
                // Use setTimeout to allow async processing
                setTimeout(() => {
                    processProducts().catch(error => {
                        console.error('Error in processProducts:', error);
                    });
                }, 400);
            }
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true });
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                processProducts().catch(error => {
                    console.error('Error in processProducts (scroll):', error);
                });
            }, 300);
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
                processProducts().catch(error => {
                    console.error('Error in initial processProducts:', error);
                });
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
                processProducts().catch(error => {
                    console.error('Error in initial processProducts:', error);
                });
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
