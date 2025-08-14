import React, { useEffect, useState } from 'react'
import './CompletionModal.css'

const CompletionModal = ({ isOpen, onClose, userData }) => {
  const [loadingDots, setLoadingDots] = useState('')
  const [currentMessage, setCurrentMessage] = useState(0)

  const messages = [
    "Analyzing your investment profile...",
    "Searching for optimal opportunities...",
    "Evaluating market conditions...",
    "Preparing your personalized recommendations..."
  ]

  useEffect(() => {
    if (isOpen) {
      // Animate loading dots
      const dotsInterval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev === '...') return ''
          return prev + '.'
        })
      }, 500)

      // Cycle through messages
      const messageInterval = setInterval(() => {
        setCurrentMessage(prev => (prev + 1) % messages.length)
      }, 2500)

      return () => {
        clearInterval(dotsInterval)
        clearInterval(messageInterval)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="completion-modal-overlay">
      <div className="completion-modal glass">
        {/* Success Icon Animation */}
        <div className="success-icon-container">
          <div className="success-icon">
            <div className="success-circle">
              <div className="success-checkmark">
                <svg viewBox="0 0 52 52" className="checkmark-svg">
                  <circle 
                    className="checkmark-circle" 
                    cx="26" 
                    cy="26" 
                    r="25" 
                    fill="none"
                  />
                  <path 
                    className="checkmark-check" 
                    fill="none" 
                    d="m14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="modal-content">
          <h2 className="modal-title gradient-text">
            Welcome aboard, {userData?.firstName}!
          </h2>
          
          <p className="modal-subtitle">
            Your profile has been successfully created
          </p>

          {/* Agent Working Section */}
          <div className="agent-status">
            <div className="agent-avatar">
              <div className="avatar-ring">
                <div className="avatar-inner">
                  <svg viewBox="0 0 24 24" fill="none" className="agent-icon">
                    <path 
                      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 2.82L13.5 4.32L19 8.5V9H21ZM21 10C21 11.66 19.66 13 18 13S15 11.66 15 10H9C9 11.66 7.66 13 6 13S3 11.66 3 10H21ZM8 14H16L15 15H9L8 14ZM12 17C13.1 17 14 17.9 14 19C14 20.1 13.1 21 12 21C10.9 21 10 20.1 10 19C10 17.9 10.9 17 12 17Z" 
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="status-text">
              <h3 className="status-title">Our AI agents are working</h3>
              <p className="status-message">
                {messages[currentMessage]}{loadingDots}
              </p>
            </div>
          </div>

          {/* Progress Animation */}
          <div className="progress-animation">
            <div className="progress-dots">
              <div className="dot dot-1"></div>
              <div className="dot dot-2"></div>
              <div className="dot dot-3"></div>
              <div className="dot dot-4"></div>
            </div>
          </div>

          {/* Estimated Time */}
          <div className="time-estimate">
            <div className="time-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <span>Estimated time: 2-5 minutes</span>
          </div>

          {/* Action Message */}
          <div className="action-message">
            <p>
              We'll send you an email at <strong>{userData?.email}</strong> with your 
              personalized investment opportunities and market analysis.
            </p>
          </div>

          {/* Continue Button */}
          <button 
            className="btn-primary"
            onClick={onClose}
          >
            Continue Exploring
          </button>
        </div>

        {/* Floating Particles Effect */}
        <div className="floating-particles">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default CompletionModal
