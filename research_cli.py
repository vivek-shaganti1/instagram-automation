#!/usr/bin/env python3
import sys
import json
from pathlib import Path

# Adjust path to import src modules correctly
sys.path.append(str(Path(__file__).parent))

from src.researcher import NewsResearcher
from dotenv import load_dotenv
import os

load_dotenv()

def main():
    api_key = os.getenv("GOOGLE_AI_API_KEY")
    lookback = int(os.getenv("NEWS_LOOKBACK_HOURS", "24"))
    
    # Check command line argument for api key override
    if len(sys.argv) > 1 and sys.argv[1]:
        api_key = sys.argv[1]
        
    if not api_key:
        print(json.dumps({"error": "No API key provided"}))
        sys.exit(1)
        
    researcher = NewsResearcher(gemini_api_key=api_key, lookback_hours=lookback)
    try:
        stories = researcher.research(n_stories=5)
        print(json.dumps(stories))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(2)

if __name__ == "__main__":
    main()
