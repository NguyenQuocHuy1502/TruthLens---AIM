import React from 'react'
import './Information.css'
import logo from '../../assets/logo3.png';

function Information({ onBack }) {
  return (
    <div className="information-container">
      <div className="header">
        <button className="back-btn" onClick={onBack}>
          Back
        </button>
        <div className="header-content">
          <h1>TruthLens</h1>
          <img src={logo} alt="TruthLens" />
        </div>
        <p className="subtitle">Information</p>
      </div>
    </div>
  )
}

export default Information