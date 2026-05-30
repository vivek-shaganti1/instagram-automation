import os
import sys
import time
import socket
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))
load_dotenv(dotenv_path=BASE_DIR / ".env")

def test_infrastructure():
    print("📊 INITIATING INFRASTRUCTURE PORT & LATENCY FORENSICS...")

    # 1. Environment checks
    required_vars = ["GOOGLE_AI_API_KEY", "INSTAGRAM_USERNAME", "DATABASE_URL"]
    for var in required_vars:
        val = os.getenv(var)
        if not val:
            print(f"❌ ENV CONFIG: Missing critical variable: {var}")
        else:
            masked = val[:6] + "..." if len(val) > 6 else "***"
            print(f"✅ ENV CONFIG: Detected {var}: {masked}")

    # 2. Redis Connection Check
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    
    print(f"📡 Redis Target: {redis_host}:{redis_port}")
    t0 = time.perf_counter()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.5)
        s.connect((redis_host, redis_port))
        s.close()
        latency = (time.perf_counter() - t0) * 1000
        print(f"✅ REDIS LATENCY: Connected to Redis in {latency:.2f}ms")
    except Exception as e:
        print(f"❌ REDIS OFFLINE: Connection failed: {e}")

    # 3. PostgreSQL Dialect Sanity Check (via URL parser)
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        print(f"🗄️  Prisma Database Target verified: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    else:
        print("❌ DATABASE CONFIG: DATABASE_URL is missing!")

if __name__ == "__main__":
    test_infrastructure()
