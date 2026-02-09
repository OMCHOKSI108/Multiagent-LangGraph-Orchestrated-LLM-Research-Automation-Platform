#!/usr/bin/env python3
"""
Test script to verify all search providers are working correctly.
Run this to check if all dependencies are installed and providers are functional.
"""

import sys
import os

# Add ai_engine to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_all_providers():
    """Test all search providers with a simple query."""
    
    print("🔍 Testing All Search Providers")
    print("=" * 50)
    
    try:
        from utils.providers import PROVIDER_REGISTRY
    except ImportError as e:
        print(f"❌ Failed to import providers: {e}")
        return False
    
    test_query = "artificial intelligence"
    results = {}
    
    for provider_name, provider_instance in PROVIDER_REGISTRY.items():
        print(f"\n🧪 Testing {provider_name}...")
        
        try:
            search_results = provider_instance.search(test_query, max_results=2)
            
            if search_results and len(search_results) > 0:
                if "error" in search_results[0]:
                    print(f"⚠️  {provider_name}: {search_results[0]['error']}")
                    results[provider_name] = "error"
                else:
                    print(f"✅ {provider_name}: Found {len(search_results)} results")
                    print(f"   Sample: {search_results[0].get('title', 'No title')[:60]}...")
                    results[provider_name] = "success"
            else:
                print(f"⚠️  {provider_name}: No results returned")
                results[provider_name] = "no_results"
                
        except Exception as e:
            print(f"❌ {provider_name}: {str(e)}")
            results[provider_name] = "failed"
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    
    success_count = sum(1 for status in results.values() if status == "success")
    total_count = len(results)
    
    for provider, status in results.items():
        status_icon = {
            "success": "✅",
            "error": "⚠️",
            "no_results": "⚠️",
            "failed": "❌"
        }.get(status, "❓")
        
        print(f"{status_icon} {provider}: {status}")
    
    print(f"\n🎯 Working Providers: {success_count}/{total_count}")
    
    if success_count >= 2:
        print("🎉 Sufficient providers working! System ready.")
        return True
    else:
        print("⚠️  Consider installing missing dependencies or checking network connectivity.")
        return False

def test_search_service():
    """Test the unified search service."""
    
    print("\n🔧 Testing Unified Search Service")
    print("=" * 50)
    
    try:
        from utils.search_service import search_sync
        
        result = search_sync(
            query="machine learning",
            providers=["duckduckgo", "arxiv"],
            max_results=3
        )
        
        print(f"✅ Search Service: Found {result.get('total_results', 0)} results")
        print(f"   Providers used: {result.get('providers_used', [])}")
        
        if result.get('results'):
            print(f"   Sample result: {result['results'][0].get('title', 'No title')[:60]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Search Service failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 AI Engine Search Providers Test")
    print("=" * 50)
    
    providers_ok = test_all_providers()
    service_ok = test_search_service()
    
    print("\n" + "=" * 50)
    if providers_ok and service_ok:
        print("🎉 ALL TESTS PASSED! Search system is ready.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Check the output above.")
        sys.exit(1)