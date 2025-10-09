import React, { useState } from 'react';
import './Settings.css';
import logo from '../../assets/logo3.png';

function Settings({ onBack }) {
  return (
    <div className="settings-container">
      <div className="header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <div className="header-content">
          <h1>TruthLens</h1>
          <img src={logo} alt="TruthLens" />
        </div>
        <p className="subtitle">Settings</p>
      </div>
    </div>
  )

}

export default Settings;
