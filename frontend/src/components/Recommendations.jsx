import React from 'react'

function Recommendations({ searchData }) {
  const mockProperties = [
    {
      id: 1,
      address: "425 E 58th St, Manhattan",
      price: "$1,150,000",
      bedrooms: 2,
      bathrooms: 2,
      sqft: "1,200",
      rentEstimate: "$4,800/month",
      capRate: "4.5%",
      walkScore: 98,
      highlights: ["Luxury Building", "Doorman", "Near Subway"],
      image: "🏢",
      matchScore: 95
    },
    {
      id: 2,
      address: "789 Park Ave, Upper East Side",
      price: "$950,000",
      bedrooms: 1,
      bathrooms: 1,
      sqft: "850",
      rentEstimate: "$3,600/month",
      capRate: "4.2%",
      walkScore: 92,
      highlights: ["Pre-war Charm", "High Ceilings", "Central Park Views"],
      image: "🏛️",
      matchScore: 88
    },
    {
      id: 3,
      address: "156 William St, Financial District",
      price: "$875,000",
      bedrooms: 1,
      bathrooms: 1,
      sqft: "750",
      rentEstimate: "$3,400/month",
      capRate: "4.7%",
      walkScore: 89,
      highlights: ["New Construction", "Amenities", "River Views"],
      image: "🌆",
      matchScore: 82
    }
  ]

  const investmentTips = [
    {
      icon: "💡",
      title: "Market Timing",
      description: "Current market conditions favor buyers with inventory up 15% from last year."
    },
    {
      icon: "📊",
      title: "Cash Flow Analysis",
      description: "Focus on properties with 1% rule potential - monthly rent ≥ 1% of purchase price."
    },
    {
      icon: "🎯",
      title: "Emerging Areas",
      description: "Consider Long Island City and Astoria for better cap rates and appreciation potential."
    },
    {
      icon: "🔍",
      title: "Due Diligence",
      description: "Always factor in NYC transfer taxes, maintenance fees, and property taxes in your calculations."
    }
  ]

  return (
    <div className="recommendations-container slide-up">
      <h2 className="section-title gradient-text">Property Recommendations</h2>
      
      <div className="properties-grid">
        {mockProperties.map((property) => (
          <div key={property.id} className="property-card glass">
            <div className="property-header">
              <div className="property-icon">{property.image}</div>
              <div className="match-score">
                <span className="match-percentage">{property.matchScore}%</span>
                <span className="match-label">Match</span>
              </div>
            </div>
            
            <div className="property-info">
              <h3 className="property-address">{property.address}</h3>
              <div className="property-price gradient-text-gold">{property.price}</div>
              
              <div className="property-details">
                <div className="detail-item">
                  <span className="detail-label">🛏️ {property.bedrooms} bed</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">🚿 {property.bathrooms} bath</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">📐 {property.sqft} sqft</span>
                </div>
              </div>
              
              <div className="financial-metrics">
                <div className="metric">
                  <span className="metric-label">Est. Rent</span>
                  <span className="metric-value">{property.rentEstimate}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Cap Rate</span>
                  <span className="metric-value">{property.capRate}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Walk Score</span>
                  <span className="metric-value">{property.walkScore}</span>
                </div>
              </div>
              
              <div className="property-highlights">
                {property.highlights.map((highlight, index) => (
                  <span key={index} className="highlight-tag">
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="property-actions">
              <button className="btn-secondary">View Details</button>
              <button className="btn-primary">Save Property</button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="tips-section">
        <h3 className="tips-title gradient-text">Investment Insights</h3>
        <div className="tips-grid">
          {investmentTips.map((tip, index) => (
            <div key={index} className="tip-card glass-dark">
              <div className="tip-icon">{tip.icon}</div>
              <h4 className="tip-title">{tip.title}</h4>
              <p className="tip-description">{tip.description}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .recommendations-container {
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

        .properties-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-bottom: 4rem;
        }

        .property-card {
          padding: 1.5rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .property-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .property-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .property-icon {
          font-size: 2rem;
        }

        .match-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 0.5rem;
          border-radius: 10px;
          min-width: 60px;
        }

        .match-percentage {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
        }

        .match-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .property-info {
          margin-bottom: 1.5rem;
        }

        .property-address {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin-bottom: 0.5rem;
        }

        .property-price {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .property-details {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .detail-item {
          background: rgba(255, 255, 255, 0.05);
          padding: 0.5rem 0.75rem;
          border-radius: 20px;
          font-size: 0.9rem;
        }

        .financial-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .metric-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.25rem;
        }

        .metric-value {
          font-weight: 600;
          color: #f6d365;
        }

        .property-highlights {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .highlight-tag {
          background: rgba(246, 211, 101, 0.1);
          color: #f6d365;
          padding: 0.25rem 0.75rem;
          border-radius: 15px;
          font-size: 0.8rem;
          border: 1px solid rgba(246, 211, 101, 0.2);
        }

        .property-actions {
          display: flex;
          gap: 1rem;
        }

        .property-actions .btn-secondary,
        .property-actions .btn-primary {
          flex: 1;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
        }

        .tips-section {
          margin-top: 4rem;
        }

        .tips-title {
          font-size: 2rem;
          font-weight: 600;
          text-align: center;
          margin-bottom: 2rem;
        }

        .tips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .tip-card {
          padding: 1.5rem;
          text-align: center;
        }

        .tip-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .tip-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #f6d365;
          margin-bottom: 0.75rem;
        }

        .tip-description {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .recommendations-container {
            margin: 2rem 0;
            padding: 0 1rem;
          }

          .section-title {
            font-size: 2rem;
            margin-bottom: 1.5rem;
          }

          .properties-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            margin-bottom: 3rem;
          }

          .property-card {
            padding: 1.25rem;
          }

          .property-header {
            margin-bottom: 0.75rem;
          }

          .property-address {
            font-size: 1rem;
          }

          .property-price {
            font-size: 1.3rem;
          }

          .property-details {
            gap: 0.5rem;
            margin-bottom: 0.75rem;
          }

          .detail-item {
            padding: 0.4rem 0.6rem;
            font-size: 0.85rem;
          }

          .financial-metrics {
            grid-template-columns: 1fr;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
          }

          .metric {
            flex-direction: row;
            justify-content: space-between;
            padding: 0.5rem;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 8px;
          }

          .metric-label {
            font-size: 0.85rem;
            margin-bottom: 0;
            text-align: left;
          }

          .metric-value {
            text-align: right;
          }

          .property-actions {
            flex-direction: column;
            gap: 0.75rem;
          }

          .property-actions .btn-secondary,
          .property-actions .btn-primary {
            padding: 0.875rem 1rem;
            font-size: 0.85rem;
          }

          .tips-section {
            margin-top: 3rem;
          }

          .tips-title {
            font-size: 1.75rem;
          }

          .tips-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }

          .tip-card {
            padding: 1.25rem;
          }

          .tip-icon {
            font-size: 2rem;
          }

          .tip-title {
            font-size: 1rem;
          }

          .tip-description {
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .recommendations-container {
            margin: 1.5rem 0;
          }

          .section-title {
            font-size: 1.75rem;
          }

          .property-card {
            padding: 1rem;
          }

          .property-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .match-score {
            align-self: flex-end;
            min-width: 50px;
            padding: 0.4rem;
          }

          .match-percentage {
            font-size: 1rem;
          }

          .property-details {
            flex-direction: column;
            gap: 0.5rem;
          }

          .detail-item {
            text-align: center;
            padding: 0.5rem;
          }

          .property-highlights {
            justify-content: center;
          }

          .highlight-tag {
            font-size: 0.75rem;
            padding: 0.2rem 0.6rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Recommendations
