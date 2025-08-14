from .schemas import ReasoningInput, ReasoningOutput
from .tools import (
    geocode,
    amenities,
    permits,
    comps,
    zoning,
    climate,
    infra_context,
    schools,
    crime,
    llm_reasoner,
)
from .engines.market_intelligence import MarketIntelligenceEngine, SentimentAnalysisEngine, RiskAssessmentEngine
from .engines.scoring_models import PropertyScoringEngine, ComparableAnalysisEngine
from .engines.data_processor import DataProcessingEngine
from .engines.report_generator import ExecutiveReportGenerator, ReportConfiguration
from .engines.ml_predictor import MLPredictionEngine
from .central_agent import CentralReasoningAgent

def run(address: str, radius_m: int = 800, include_long_context: bool = True) -> ReasoningOutput:
    """
    Runs the comprehensive multi-stage analysis for a given address.
    """
    print(f"🚀 Starting Comprehensive Real Estate Analysis for: {address}")
    print(f"📍 Analysis Radius: {radius_m}m | Long Context: {include_long_context}")
    print("=" * 80)
    
    # Initialize Central Agentic Reasoning System
    central_agent = CentralReasoningAgent()
    
    # Initialize Advanced Analysis Engines
    market_intelligence = MarketIntelligenceEngine()
    sentiment_engine = SentimentAnalysisEngine()
    risk_engine = RiskAssessmentEngine()
    scoring_engine = PropertyScoringEngine()
    comparable_engine = ComparableAnalysisEngine()
    data_processor = DataProcessingEngine()
    report_generator = ExecutiveReportGenerator()
    ml_predictor = MLPredictionEngine()
    
    # Central Agent begins reasoning process
    agent_reasoning = central_agent.engage_reasoning_process({
        'address': address,
        'radius_m': radius_m,
        'include_long_context': include_long_context,
        'analysis_type': 'real_estate_investment'
    })
    
    # Stage 1: Advanced Data Processing Pipeline
    print("🔄 STAGE 1: ADVANCED DATA PROCESSING PIPELINE")
    processing_results = data_processor.process_comprehensive_dataset(lat=40.7831, lon=-73.9712, radius_m=radius_m)
    
    # Stage 2: Geocoding and Validation
    print("\n📍 STAGE 2: GEOCODING & COORDINATE VALIDATION")
    geo_info = geocode.geocode(address)
    if not geo_info:
        return ReasoningOutput(memo_markdown="Could not geocode address.", verdict="Error")

    lat, lon = geo_info["lat"], geo_info["lon"]
    bbl = geo_info.get("bbl")
    print(f"✅ Geocoded to: {lat:.6f}, {lon:.6f}")

    # Stage 3: Fundamental Data Collection
    print("\n📊 STAGE 3: FUNDAMENTAL DATA COLLECTION")
    amenities_data = amenities.nearby_amenities(lat, lon, radius_m)
    permits_data = permits.permits_summary(lat, lon, radius_m)
    comps_data = comps.comps_summary(lat, lon, radius_m)
    zoning_data = zoning.zoning_summary(bbl) if bbl else {"error": "BBL not found for zoning analysis."}
    climate_data = climate.flood_flag(lat, lon)
    schools_data = schools.schools_summary(lat, lon)
    crime_data = crime.crime_summary(lat, lon)
    print("✅ Fundamental data collection completed")

    # Stage 4: Market Intelligence Analysis
    print("\n🧠 STAGE 4: MARKET INTELLIGENCE & TREND ANALYSIS")
    market_trends = market_intelligence.analyze_market_trends(lat, lon, radius_m)
    market_sentiment = sentiment_engine.analyze_market_sentiment(lat, lon)
    print("✅ Market intelligence analysis completed")

    # Stage 5: Advanced Risk Assessment
    print("\n⚠️  STAGE 5: COMPREHENSIVE RISK ASSESSMENT")
    risk_assessment = risk_engine.assess_investment_risks(lat, lon, market_trends)
    print("✅ Risk assessment completed")

    # Stage 6: Property Scoring & Ranking
    print("\n🎯 STAGE 6: ADVANCED PROPERTY SCORING")
    property_data = {
        'location': {'lat': lat, 'lon': lon},
        'market_data': market_trends,
        'fundamentals': {'amenities': amenities_data, 'permits': permits_data, 'comps': comps_data},
        'risk_profile': risk_assessment
    }
    scoring_results = scoring_engine.calculate_comprehensive_score(property_data)
    print("✅ Property scoring completed")

    # Stage 7: Comparable Analysis
    print("\n🔍 STAGE 7: COMPARABLE PROPERTIES ANALYSIS")
    comparable_analysis = comparable_engine.analyze_comparables(property_data, [])
    print("✅ Comparable analysis completed")

    # Stage 8: Machine Learning Predictions
    print("\n🤖 STAGE 8: MACHINE LEARNING PREDICTION SUITE")
    ml_predictions = ml_predictor.run_ml_prediction_suite(property_data)
    print("✅ ML prediction suite completed")

    # Stage 9: Report Generation
    print("\n📋 STAGE 9: EXECUTIVE REPORT GENERATION")
    report_config = ReportConfiguration(
        report_type='investment_memo',
        detail_level='comprehensive',
        include_charts=True,
        include_comparables=True,
        include_risk_analysis=True,
        target_audience='institutional_investors',
        format_preference='markdown'
    )
    
    comprehensive_analysis = {
        'processing_results': processing_results,
        'market_intelligence': market_trends,
        'sentiment_analysis': market_sentiment,
        'risk_assessment': risk_assessment,
        'scoring_results': scoring_results,
        'comparable_analysis': comparable_analysis,
        'ml_predictions': ml_predictions,
        'agent_reasoning': agent_reasoning,
        'fundamental_data': {
            'amenities': amenities_data,
            'permits': permits_data,
            'comps': comps_data,
            'zoning': zoning_data,
            'climate': climate_data,
            'schools': schools_data,
            'crime': crime_data
        }
    }
    
    executive_report = report_generator.generate_comprehensive_report(comprehensive_analysis, report_config)
    print("✅ Executive report generation completed")

    # Stage 10: Enhanced Reasoning Input Preparation
    print("\n🧮 STAGE 10: ENHANCED REASONING INPUT PREPARATION")
    
    # Enhanced metrics with advanced scoring
    enhanced_metrics = {
        "avg_price_per_sqft": comps_data.get("avg_price_per_sqft"),
        "num_sales": comps_data.get("num_sales"),
        "permits_per_month": permits_data.get("permits_per_month"),
        "lux_pct": permits_data.get("lux_pct"),
        "max_far": zoning_data.get("max_far"),
        "composite_score": scoring_results.get("composite_score"),
        "investment_grade": scoring_results.get("investment_grade"),
        "market_timing_score": market_trends.get("market_timing_score"),
        "risk_grade": risk_assessment.get("risk_grade"),
        "confidence_score": market_trends.get("confidence_score"),
        "agent_decision_confidence": agent_reasoning['agent_reasoning']['final_decisions'][0].confidence.value if agent_reasoning['agent_reasoning']['final_decisions'] else 0.8,
        "reasoning_quality_score": agent_reasoning['agent_reasoning']['validated_insights']['validation_score']
    }
    
    # Enhanced insight bullets
    enhanced_amenities_bullets = amenities_data.get("insight_bullets", [])
    enhanced_amenities_bullets.extend([
        f"Investment Grade: {scoring_results.get('investment_grade', 'N/A')}",
        f"Market Intelligence Score: {market_trends.get('market_timing_score', 0):.2f}",
        f"Overall Risk Level: {risk_assessment.get('risk_grade', 'Unknown')}"
    ])
    
    enhanced_infra_bullets = [
        f"Last sale date: {comps_data.get('last_sale_date')}",
        f"Last permit date: {permits_data.get('last_permit_date')}",
        f"Market Momentum: {market_trends.get('predictions', {}).get('market_cycle_prediction', {}).get('current_phase', 'Unknown')}",
        f"Competitive Position: {scoring_results.get('score_breakdown', {}).get('competitive_position', 'Unknown')}"
    ]
    
    enhanced_risk_bullets = [
        climate_data.get("details"),
        f"Top Risk Factors: {', '.join(risk_assessment.get('key_risk_factors', [])[:2])}",
        f"Stress Test Resilience: {risk_assessment.get('stress_test_results', {}).get('recession', {}).get('resilience_score', 0):.2f}",
        f"Market Sentiment: {market_sentiment.get('sentiment_classification', 'Neutral')}"
    ]

    # Enhanced long-form context
    enhanced_long_context = ""
    if include_long_context:
        keywords = address.split() + [geo_info.get("address_norm", "")]
        base_context = infra_context.long_context_for_area(keywords)
        
        # Add advanced analysis context
        advanced_context = f"""

## ADVANCED MARKET INTELLIGENCE SUMMARY

### Market Analysis
- Market Segment: {market_trends.get('market_segment', {}).get('primary_segment', 'Unknown')}
- Investment Grade: {scoring_results.get('investment_grade', 'N/A')}
- Market Timing Score: {market_trends.get('market_timing_score', 0):.2f}/1.0
- Confidence Level: {market_trends.get('confidence_score', 0):.2f}/1.0

### Risk Assessment
- Overall Risk Grade: {risk_assessment.get('risk_grade', 'Unknown')}
- Key Risk Factors: {', '.join(risk_assessment.get('key_risk_factors', []))}
- Risk Trend: {risk_assessment.get('risk_trend', 'Unknown')}

### Financial Projections
- 12-Month Forecast: {market_trends.get('predictions', {}).get('price_forecast', {}).get('12_months', 0):.1%}
- 5-Year Outlook: {market_trends.get('predictions', {}).get('price_forecast', {}).get('60_months', 0):.1%}
- Risk-Adjusted Return: {market_trends.get('predictions', {}).get('risk_assessment', {}).get('risk_adjusted_return', 0):.1%}

### Competitive Positioning
- Property Score: {scoring_results.get('composite_score', 0)}/100
- Market Rank: {scoring_results.get('ranking_analysis', {}).get('market_rank', 'Unknown')}
- Peer Comparison: {scoring_results.get('peer_comparison', {}).get('relative_performance', 0):+.1f} vs. peer average

### Market Sentiment Analysis
- Overall Sentiment: {market_sentiment.get('sentiment_classification', 'Neutral')}
- Sentiment Trend: {market_sentiment.get('momentum', 0):+.2f}
- Key Themes: {', '.join(market_sentiment.get('key_themes', [])[:3])}
"""
        enhanced_long_context = base_context + advanced_context

    print("✅ Enhanced reasoning input prepared")

    # Stage 11: Advanced LLM Reasoning
    print("\n🧠 STAGE 11: ADVANCED LLM REASONING & MEMO GENERATION")
    
    reasoning_input = ReasoningInput(
        address=address, lat=lat, lon=lon, radius_m=radius_m, 
        metrics=enhanced_metrics,
        amenities_bullets=enhanced_amenities_bullets, 
        infra_bullets=enhanced_infra_bullets, 
        risk_bullets=enhanced_risk_bullets,
        long_context=enhanced_long_context
    )

    # Generate the enhanced final memo
    final_result = llm_reasoner.generate_memo(reasoning_input)
    
    print("✅ Advanced analysis pipeline completed successfully")
    print("=" * 80)
    print(f"📊 Final Investment Grade: {scoring_results.get('investment_grade', 'N/A')}")
    print(f"🎯 Composite Score: {scoring_results.get('composite_score', 0)}/100")
    print(f"⚠️  Risk Grade: {risk_assessment.get('risk_grade', 'Unknown')}")
    print(f"📈 Market Timing: {market_trends.get('market_timing_score', 0):.2f}/1.0")
    print("=" * 80)
    
    return final_result
