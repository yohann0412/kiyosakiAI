import React from 'react'

function Header() {
  return (
    <header className="header fade-in">
      <div className="header-content">
        <h1 className="header-title gradient-text-gold floating">
          Kiyosaki
        </h1>
        <p className="header-subtitle fade-in stagger-delay-1">
          Smart Real Estate Investment Research Platform
        </p>
        <div className="header-tagline fade-in stagger-delay-2">
          <span className="gradient-text">Discover • Analyze • Invest</span>
        </div>
        <div className="header-accent fade-in stagger-delay-3">
          <div className="accent-dot pulse"></div>
          <div className="accent-line shimmer"></div>
          <div className="accent-dot pulse" style={{ animationDelay: '1s' }}></div>
        </div>
      </div>
      <style jsx>{`
        .header {
          text-align: center;
          padding: 4rem 0 2rem 0;
          max-width: 800px;
          width: 100%;
        }
        
        .header-content {
          position: relative;
        }
        
        .header-title {
          font-size: 4.5rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          letter-spacing: -0.02em;
          text-shadow: 
            0 0 30px rgba(246, 211, 101, 0.4),
            0 0 60px rgba(246, 211, 101, 0.2);
          position: relative;
        }
        
        .header-subtitle {
          font-size: 1.3rem;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 1.5rem;
          font-weight: 300;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }
        
        .header-tagline {
          font-size: 1rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          margin-bottom: 2rem;
        }
        
        .header-accent {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          margin-top: 2rem;
        }
        
        .accent-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--gold-gradient);
          box-shadow: 0 0 20px rgba(246, 211, 101, 0.6);
        }
        
        .accent-line {
          width: 80px;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(246, 211, 101, 0.5),
            transparent
          );
          border-radius: 1px;
        }
        
        @media (max-width: 768px) {
          .header {
            padding: 2rem 0 1.5rem 0;
          }

          .header-title {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          
          .header-subtitle {
            font-size: 1.1rem;
            margin-bottom: 1rem;
            padding: 0 1rem;
          }

          .header-tagline {
            font-size: 0.9rem;
            letter-spacing: 0.1em;
            margin-bottom: 1.5rem;
          }

          .header-accent {
            gap: 1.5rem;
            margin-top: 1.5rem;
          }

          .accent-line {
            width: 60px;
          }
        }

        @media (max-width: 480px) {
          .header {
            padding: 1.5rem 0 1rem 0;
          }

          .header-title {
            font-size: 2.2rem;
            margin-bottom: 0.75rem;
          }
          
          .header-subtitle {
            font-size: 1rem;
            padding: 0 0.5rem;
            line-height: 1.5;
          }

          .header-tagline {
            font-size: 0.8rem;
            letter-spacing: 0.05em;
          }

          .header-accent {
            gap: 1rem;
            margin-top: 1rem;
          }

          .accent-dot {
            width: 6px;
            height: 6px;
          }

          .accent-line {
            width: 40px;
            height: 1px;
          }
        }
      `}</style>
    </header>
  )
}

export default Header
