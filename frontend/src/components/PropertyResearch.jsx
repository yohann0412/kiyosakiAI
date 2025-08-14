import React from 'react'

function PropertyResearch({ searchData }) {
  const mockResearchData = {
    location: {
      neighborhood: searchData.location || "Manhattan",
      medianPrice: "$1,250,000",
      pricePerSqFt: "$1,450",
      rentYield: "4.2%",
      appreciation: "+8.5% (5yr avg)",
      walkScore: 95,
      transitScore: 88
    },
    marketTrends: [
      { metric: "Price Growth", value: "+12.3%", period: "YoY", trend: "up" },
      { metric: "Inventory", value: "2.1 months", period: "Current", trend: "down" },
      { metric: "Days on Market", value: "32 days", period: "Avg", trend: "down" },
      { metric: "Cash Sales", value: "28%", period: "Current", trend: "up" }
    ],
    demographics: {
      medianIncome: "$89,500",
      population: "1.6M",
      ageRange: "25-44 (35%)",
      education: "College+ (68%)"
    }
  }

  return (
    <div className="research-container slide-up">
      <h2 className="section-title gradient-text">Market Research</h2>
      
      <div className="research-grid">
        {/* Location Overview */}
        <div className="research-card glass">
          <h3 className="card-title">📍 Location Overview</h3>
          <div className="location-stats">
            <div className="stat-item">
              <span className="stat-label">Median Price</span>
              <span className="stat-value gradient-text-gold">{mockResearchData.location.medianPrice}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Price per Sq Ft</span>
              <span className="stat-value">{mockResearchData.location.pricePerSqFt}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Rental Yield</span>
              <span className="stat-value">{mockResearchData.location.rentYield}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">5yr Appreciation</span>
              <span className="stat-value">{mockResearchData.location.appreciation}</span>
            </div>
          </div>
          
          <div className="scores-container">
            <div className="score-item">
              <div className="score-circle">
                <span className="score-number">{mockResearchData.location.walkScore}</span>
              </div>
              <span className="score-label">Walk Score</span>
            </div>
            <div className="score-item">
              <div className="score-circle">
                <span className="score-number">{mockResearchData.location.transitScore}</span>
              </div>
              <span className="score-label">Transit Score</span>
            </div>
          </div>
        </div>

        {/* Market Trends */}
        <div className="research-card glass">
          <h3 className="card-title">📈 Market Trends</h3>
          <div className="trends-list">
            {mockResearchData.marketTrends.map((trend, index) => (
              <div key={index} className="trend-item">
                <div className="trend-info">
                  <span className="trend-metric">{trend.metric}</span>
                  <span className="trend-period">{trend.period}</span>
                </div>
                <div className="trend-value-container">
                  <span className="trend-value">{trend.value}</span>
                  <span className={`trend-indicator ${trend.trend}`}>
                    {trend.trend === 'up' ? '↗️' : '↘️'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demographics */}
        <div className="research-card glass">
          <h3 className="card-title">👥 Demographics</h3>
          <div className="demo-stats">
            <div className="demo-item">
              <span className="demo-label">Median Income</span>
              <span className="demo-value">{mockResearchData.demographics.medianIncome}</span>
            </div>
            <div className="demo-item">
              <span className="demo-label">Population</span>
              <span className="demo-value">{mockResearchData.demographics.population}</span>
            </div>
            <div className="demo-item">
              <span className="demo-label">Primary Age</span>
              <span className="demo-value">{mockResearchData.demographics.ageRange}</span>
            </div>
            <div className="demo-item">
              <span className="demo-label">Education</span>
              <span className="demo-value">{mockResearchData.demographics.education}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .research-container {
          width: 100%;
          max-width: 1200px;
          margin: 3rem 0;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 2rem;
        }

        .research-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .research-card {
          padding: 2rem;
          height: fit-content;
        }

        .card-title {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: #f6d365;
        }

        .location-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .stat-value {
          font-size: 1.2rem;
          font-weight: 600;
          color: white;
        }

        .scores-container {
          display: flex;
          justify-content: space-around;
          gap: 2rem;
        }

        .score-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .score-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .score-number {
          font-size: 1.2rem;
          font-weight: 700;
          color: white;
        }

        .score-label {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .trends-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .trend-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .trend-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .trend-metric {
          font-weight: 600;
          color: white;
        }

        .trend-period {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .trend-value-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .trend-value {
          font-weight: 600;
          color: #f6d365;
        }

        .demo-stats {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .demo-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .demo-item:last-child {
          border-bottom: none;
        }

        .demo-label {
          color: rgba(255, 255, 255, 0.7);
        }

        .demo-value {
          font-weight: 600;
          color: white;
        }

        @media (max-width: 768px) {
          .research-container {
            margin: 2rem 0;
            padding: 0 1rem;
          }

          .section-title {
            font-size: 2rem;
            margin-bottom: 1.5rem;
          }

          .research-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .research-card {
            padding: 1.5rem;
          }

          .card-title {
            font-size: 1.2rem;
            margin-bottom: 1rem;
          }

          .location-stats {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .stat-item {
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }

          .stat-value {
            font-size: 1.1rem;
          }

          .scores-container {
            gap: 1.5rem;
            margin-top: 1rem;
          }

          .score-circle {
            width: 50px;
            height: 50px;
          }

          .score-number {
            font-size: 1rem;
          }

          .trend-item {
            padding: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .research-container {
            margin: 1.5rem 0;
          }

          .section-title {
            font-size: 1.75rem;
          }

          .research-card {
            padding: 1.25rem;
          }

          .scores-container {
            flex-direction: column;
            gap: 1rem;
          }

          .score-item {
            flex-direction: row;
            align-items: center;
            gap: 1rem;
          }

          .trend-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .trend-value-container {
            align-self: stretch;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  )
}

export default PropertyResearch
