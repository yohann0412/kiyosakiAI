#!/usr/bin/env python3
"""
old sample script
"""

def test_central_agent():
    """Test the central agentic reasoning system."""
    print("🚀 TESTING ENHANCED AGENTIC REASONING SYSTEM")
    print("=" * 60)
    
    try:
        from backend.agent.central_agent import CentralReasoningAgent
        
        # Initialize the central agent
        agent = CentralReasoningAgent()
        
        # Test comprehensive reasoning
        analysis_request = {
            'address': 'Central Park, New York, NY',
            'radius_m': 800,
            'include_long_context': True,
            'analysis_type': 'real_estate_investment'
        }
        
        print(f"\n🏢 Analyzing: {analysis_request['address']}")
        print(f"📍 Radius: {analysis_request['radius_m']}m")
        
        # Engage the reasoning process
        result = agent.engage_reasoning_process(analysis_request)
        
        # Display results summary
        print("\n" + "🎯 ANALYSIS RESULTS SUMMARY" + "=" * 40)
        
        reasoning = result['agent_reasoning']
        
        print(f"💭 Thoughts Generated: {len(reasoning['thought_chain'])}")
        print(f"🎯 Decisions Made: {len(reasoning['final_decisions'])}")
        print(f"📊 Validation Score: {reasoning['validated_insights']['validation_score']:.2f}")
        
        print("\n🧠 REASONING BREAKDOWN:")
        for i, thought in enumerate(reasoning['thought_chain'][:3], 1):
            print(f"   {i}. [{thought.reasoning_mode.value.upper()}] {thought.content[:100]}...")
            print(f"      Confidence: {thought.confidence:.2f}")
        
        if len(reasoning['thought_chain']) > 3:
            print(f"   ... and {len(reasoning['thought_chain']) - 3} more thoughts")
        
        print("\n🎯 STRATEGIC DECISIONS:")
        for i, decision in enumerate(reasoning['final_decisions'], 1):
            print(f"   {i}. {decision.decision}")
            print(f"      Confidence: {decision.confidence.name}")
            print(f"      Rationale: {decision.rationale[:100]}...")
        
        print("\n✅ CENTRAL AGENT TEST COMPLETED SUCCESSFULLY!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_simple_analysis():
    print("\n🔬 TESTING SIMPLIFIED ANALYSIS")
    print("=" * 40)
    
    try:
        from backend.agent.tools import geocode, amenities, permits, comps, climate
        from backend.agent.schemas import ReasoningInput, ReasoningOutput
        
        # Test geocoding
        print("📍 Testing geocoding...")
        geo_result = geocode.geocode("Central Park, New York, NY")
        if geo_result:
            print(f"   ✅ Geocoded to: {geo_result['lat']:.4f}, {geo_result['lon']:.4f}")
            lat, lon = geo_result['lat'], geo_result['lon']
        else:
            print("   ❌ Geocoding failed, using default coordinates")
            lat, lon = 40.7831, -73.9712
        
        # Test basic tools
        print("🏢 Testing amenities analysis...")
        amenities_data = amenities.nearby_amenities(lat, lon, 800)
        print(f"   ✅ Found insights: {len(amenities_data.get('insight_bullets', []))}")
        
        print("🏗️  Testing permits analysis...")
        permits_data = permits.permits_summary(lat, lon, 800)
        print(f"   ✅ Permits per month: {permits_data.get('permits_per_month', 0)}")
        
        print("💰 Testing comps analysis...")
        comps_data = comps.comps_summary(lat, lon, 800)
        print(f"   ✅ Average price/sqft: ${comps_data.get('avg_price_per_sqft', 0):,.0f}")
        
        print("🌊 Testing climate analysis...")
        climate_data = climate.flood_flag(lat, lon)
        print(f"   ✅ Flood zone status: {climate_data.get('details', 'Unknown')}")
        
        print("\n✅ SIMPLIFIED ANALYSIS TEST COMPLETED!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🤖 KIYOSAKI ENHANCED AGENTIC SYSTEM TEST SUITE")
    print("=" * 60)
    
    # Test 1: Central Agent (the impressive one!)
    success1 = test_central_agent()
    
    # Test 2: Simple Analysis
    success2 = test_simple_analysis()
    
    print("\n" + "=" * 60)
    if success1 and success2:
        print("🎉 ALL TESTS PASSED! The enhanced agentic system is working!")
        print("\n💡 To run this test again:")
        print("   python3 test_agent.py")
        print("\n🌐 To start the web server:")
        print("   python3 -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload")
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
    
    print("=" * 60)
