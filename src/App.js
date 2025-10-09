import React, { useState, useEffect } from 'react';
import Settings from './Components/Settings/Settings';
import Information from './Components/Information/Information';
import logo from './assets/logo3.png';
import './App.css';

function App() {
  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(false);
  const [stats, setStats] = useState({ legit: 0, scam: 0, uncertain: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);


  useEffect(() => {

    window.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const url = tabs[0].url || '';
      const supportedSites = [
        'amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr',
        'amazon.it', 'amazon.es', 'amazon.in', 'amazon.co.jp', 'amazon.com.au',
        'walmart.com', 'target.com', 'bestbuy.com', 'newegg.com',
        'ebay.com', 'alibaba.com', 'aliexpress.com'
      ];
      const isSupported = supportedSites.some(site => url.includes(site));
      setSupported(isSupported);

      if (!isSupported) return;

      window.chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_ACTIVE' }, (res) => {
        if (res && typeof res.active === 'boolean') setActive(res.active);
      });


      try {
        window.chrome.storage?.local?.get(['truthlens_stats'], (result) => {
          if (result && result.truthlens_stats) {
            setStats(result.truthlens_stats);
          }
        });
      } catch (_) { }
    });
  }, []);

  const setActiveOnTab = (next) => {
    window.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      window.chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_ACTIVE', active: next }, (res) => {
        if (res && typeof res.active === 'boolean') setActive(res.active);
      });
    });
  };


  // Show settings/info screens
  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />;
  }

  if (showInfo) {
    return <Information onBack={() => setShowInfo(false)} />;
  }

  if (!supported) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-content">
            <h1>TruthLens</h1>
            <img src={logo} alt="TruthLens" />
          </div>
        </div>
        <div className="content">
          <div className="unsupported">
            <p>This site is not supported yet.</p>
            <p>Supported sites:</p>
            <ul>
              <li>Amazon (all regions)</li>
              <li>Walmart</li>
              <li>eBay</li>
              <li>Target</li>
              <li>Best Buy</li>
              <li>Newegg</li>
              <li>Alibaba</li>
              <li>AliExpress</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <h1>TruthLens</h1>
          <img src={logo} alt="TruthLens" />
        </div>
        <p className="subtitle">Product Scam Detector</p>
      </div>

      <div className="content">
        <div className="status-section">
          <div className="status-indicator">
            <span className="status-dot" style={{ background: active ? '#4CAF50' : '#f44336' }}></span>
            {active ? 'On' : 'Off'}
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActiveOnTab(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="stats-section">
          <h3>Website's Analysis</h3>
          <div className="stats-grid">
            <div className="stat-item legit">
              <div className="stat-icon">✓</div>
              <div className="stat-info">
                <div className="stat-number">{stats.legit}</div>
                <div className="stat-label">Legit</div>
              </div>
            </div>
            <div className="stat-item scam">
              <div className="stat-icon">✗</div>
              <div className="stat-info">
                <div className="stat-number">{stats.scam}</div>
                <div className="stat-label">Scam</div>
              </div>
            </div>
            <div className="stat-item uncertain">
              <div className="stat-icon">...</div>
              <div className="stat-info">
                <div className="stat-number">{stats.uncertain}</div>
                <div className="stat-label">Uncertain</div>
              </div>
            </div>
          </div>
        </div>

        <div className="legend-section">
          <h3>Product's Status</h3>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-icon legit">✓</div>
              <span>Legitimate Product</span>
            </div>
            <div className="legend-item">
              <div className="legend-icon scam">✗</div>
              <span>Potential Scam</span>
            </div>
            <div className="legend-item">
              <div className="legend-icon uncertain">...</div>
              <span>Uncertain Status</span>
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="action-btn" onClick={() => setShowSettings(true)}>
            Settings
          </button>
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn secondary"
            onClick={() => setShowInfo(true)}
          >
            Information
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
