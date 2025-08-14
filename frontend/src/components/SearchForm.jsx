import React, { useState } from 'react'

function SearchForm({ onSearch }) {
  const [searchType, setSearchType] = useState('location')
  const [location, setLocation] = useState('')
  const [investmentThesis, setInvestmentThesis] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch({
      searchType,
      location: searchType === 'location' ? location : '',
      investmentThesis: searchType === 'thesis' ? investmentThesis : ''
    })
  }

  return (
    <div className="search-form-container slide-up">
      <div className="search-form glass">
        <div className="search-tabs">
          <button
            className={`tab-button ${searchType === 'location' ? 'active' : ''}`}
            onClick={() => setSearchType('location')}
          >
            📍 Location Search
          </button>
          <button
            className={`tab-button ${searchType === 'thesis' ? 'active' : ''}`}
            onClick={() => setSearchType('thesis')}
          >
            💡 Investment Thesis
          </button>
        </div>

        <form onSubmit={handleSubmit} className="search-form-content">
          {searchType === 'location' ? (
            <div className="input-group">
              <label className="input-label">NYC Location or Neighborhood</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Manhattan, Brooklyn Heights, Upper East Side..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
              <div className="input-hint">
                Enter a specific NYC neighborhood, borough, or address
              </div>
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Investment Strategy & Criteria</label>
              <textarea
                className="input-field textarea-field"
                placeholder="e.g., Looking for cash-flowing rental properties under $1M in emerging neighborhoods with good transit access and potential for appreciation..."
                value={investmentThesis}
                onChange={(e) => setInvestmentThesis(e.target.value)}
                rows={4}
                required
              />
              <div className="input-hint">
                Describe your investment goals, budget, timeline, and preferences
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary search-button">
            🔍 Start Research
          </button>
        </form>
      </div>

      <style jsx>{`
        .search-form-container {
          width: 100%;
          max-width: 600px;
          margin: 2rem 0;
        }

        .search-form {
          padding: 2rem;
          width: 100%;
        }

        .search-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tab-button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 1rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
          position: relative;
        }

        .tab-button:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .tab-button.active {
          color: #f6d365;
          border-bottom-color: #f6d365;
        }

        .search-form-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-label {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          font-size: 1rem;
        }

        .textarea-field {
          min-height: 120px;
          resize: vertical;
          font-family: inherit;
        }

        .input-hint {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
        }

        .search-button {
          margin-top: 1rem;
          font-size: 1.1rem;
          padding: 16px 40px;
          align-self: center;
        }

        @media (max-width: 768px) {
          .search-form-container {
            margin: 1rem 0;
            padding: 0 1rem;
          }

          .search-tabs {
            flex-direction: column;
            gap: 0;
            margin-bottom: 1.5rem;
          }

          .tab-button {
            padding: 1rem;
            text-align: center;
            font-size: 0.9rem;
            border-radius: 12px;
            margin-bottom: 0.5rem;
          }

          .tab-button.active {
            background: rgba(246, 211, 101, 0.1);
          }

          .search-form {
            padding: 1.5rem;
            border-radius: 20px;
          }

          .input-field {
            padding: 16px 20px;
            font-size: 16px;
          }

          .textarea-field {
            min-height: 100px;
          }

          .search-button {
            width: 100%;
            margin-top: 1.5rem;
            padding: 18px;
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .search-form {
            padding: 1rem;
          }

          .input-label {
            font-size: 0.9rem;
          }

          .input-hint {
            font-size: 0.8rem;
          }

          .tab-button {
            padding: 0.875rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  )
}

export default SearchForm
