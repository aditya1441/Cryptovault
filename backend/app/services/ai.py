"""
services/ai.py
──────────────
Integrates with OpenAI to provide portfolio analysis and market sentiment.
Falls back to high-quality mock data if OPENAI_API_KEY is not set.
"""
import os
import json
from openai import AsyncOpenAI
from app.core.config import get_settings

settings = get_settings()

# Initialize OpenAI client only if key is present
api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=api_key) if api_key else None

async def generate_portfolio_insights(portfolio_summary_dict: dict) -> dict:
    """
    Analyzes the user's current portfolio to provide insights and suggestions.
    """
    if not client:
        # Fallback for development/college project if no API key is provided
        return {
            "summary": "Your portfolio is heavily weighted towards Bitcoin, showing a conservative crypto strategy. However, consider diversifying into leading altcoins like Solana to capture potential high-alpha market movements.",
            "sentiment": "bullish",
            "risk_level": "moderate",
            "key_takeaways": [
                "Bitcoin dominance provides stability against market downturns.",
                "Lack of DeFi exposure might limit yield opportunities.",
                "Current market sentiment suggests holding tight on major caps."
            ]
        }
        
    prompt = f"""
    You are an expert cryptocurrency financial advisor. Based on this portfolio data:
    {json.dumps(portfolio_summary_dict, indent=2)}
    
    Provide a brief, professional summary, an overall sentiment (bullish, bearish, or neutral), 
    an estimated risk level (low, moderate, high), and 3 key takeaways. 
    Respond ONLY in valid JSON format like:
    {{
       "summary": "text",
       "sentiment": "bullish",
       "risk_level": "moderate",
       "key_takeaways": ["point 1", "point 2", "point 3"]
    }}
    """
    
    try:
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"OpenAI error: {e}")
        return {
            "summary": "Error generating insights currently. Please try again later.",
            "sentiment": "neutral",
            "risk_level": "unknown",
            "key_takeaways": []
        }
