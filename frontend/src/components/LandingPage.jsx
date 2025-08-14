import React from 'react'

function LandingPage({ onStartOnboarding }) {
  return (
    <div className="landing-page-container slide-up">
      <div className="landing-content glass">
        <div className="landing-header">
          <h2 className="landing-title gradient-text">
            The FINAL Intelligence Platform for Your Investing
          </h2>
          <p className="landing-subtitle">
            We pull data from every source you don't think to - zoning and planning data, weather patterns, school districts, social media sentiment, satellite imagery, and more. Our AI agents synthesize it all to find investment opportunities others miss.
          </p>
        </div>

        <button 
          onClick={onStartOnboarding}
          className="btn-primary cta-button"
        >
           Get Started
        </button>

        <div className="landing-hint">
          Share your investment criteria and unlock insights from data sources others ignore
        </div>
      </div>

      <style jsx>{`
        .landing-page-container {
          width: 100%;
          max-width: 600px;
          margin: 2rem 0;
        }

        .landing-content {
          padding: 3rem 2rem;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }

        .landing-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 500px;
        }

        .landing-title {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 0;
        }

        .landing-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin: 0;
        }

        .landing-features {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
          margin: 1rem 0;
        }

        .feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          min-width: 140px;
        }

        .feature-icon {
          font-size: 2rem;
          margin-bottom: 0.25rem;
        }

        .feature-text {
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          text-align: center;
        }

        .cta-button {
          font-size: 1.2rem;
          padding: 18px 48px;
          margin: 1rem 0;
          position: relative;
          overflow: hidden;
        }

        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: left 0.6s;
        }

        .cta-button:hover::before {
          left: 100%;
        }

        .landing-hint {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          font-style: italic;
          max-width: 400px;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .landing-page-container {
            margin: 1rem 0;
            padding: 0 1rem;
          }

          .landing-content {
            padding: 2rem 1.5rem;
            border-radius: 20px;
          }

          .landing-title {
            font-size: 2rem;
          }

          .landing-subtitle {
            font-size: 1rem;
          }

          .landing-features {
            gap: 1.5rem;
          }

          .feature-item {
            min-width: 120px;
          }

          .feature-icon {
            font-size: 1.75rem;
          }

          .feature-text {
            font-size: 0.85rem;
          }

          .cta-button {
            width: 100%;
            font-size: 1.1rem;
            padding: 18px 24px;
          }
        }

        @media (max-width: 480px) {
          .landing-content {
            padding: 1.5rem 1rem;
          }

          .landing-title {
            font-size: 1.75rem;
          }

          .landing-subtitle {
            font-size: 0.95rem;
          }

          .landing-features {
            gap: 1rem;
            flex-direction: column;
          }

          .feature-item {
            flex-direction: row;
            justify-content: center;
            min-width: unset;
            gap: 0.75rem;
          }

          .feature-icon {
            font-size: 1.5rem;
          }

          .feature-text {
            font-size: 0.8rem;
          }

          .cta-button {
            font-size: 1rem;
            padding: 16px 20px;
          }

          .landing-hint {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  )
}

export default LandingPage
