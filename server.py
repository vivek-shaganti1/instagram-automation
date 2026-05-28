"""
Lightweight Python server serving the Dashboard static assets
and exposing API endpoints for dashboard controls.
"""
import json
import os
import subprocess
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# Load env
from dotenv import load_dotenv
load_dotenv()

PORT = 8000
BASE_DIR = Path(__file__).parent
WEB_DIR = BASE_DIR / "web"
ANALYTICS_FILE = BASE_DIR / "logs" / "analytics.json"

class DashboardHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Override to serve files from the "web" subdirectory
        relative_path = path.lstrip('/')
        if relative_path.startswith('api/'):
            return path
        
        # Default routing: serve index.html for empty/root path
        if not relative_path or relative_path == "":
            return str(WEB_DIR / "index.html")
            
        return str(WEB_DIR / relative_path)

    def do_GET(self):
        if self.path == "/api/stats":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            # Load stats
            stats = {"posts": [], "daily_stats": {}, "settings": {"aggressive_hooks": False, "best_theme": "neon_teal"}}
            if ANALYTICS_FILE.exists():
                try:
                    with open(ANALYTICS_FILE, "r", encoding="utf-8") as f:
                        stats = json.load(f)
                except Exception as e:
                    print(f"Error loading analytics data: {e}")
            
            self.wfile.write(json.dumps(stats, default=str).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/post-now":
            # Trigger posting a Reel now in a separate background thread
            def run_post():
                print("Triggering manual Reel upload...")
                # We execute main.py with the venv python interpreter
                python_bin = BASE_DIR / "venv" / "bin" / "python"
                if not python_bin.exists():
                    python_bin = "python3"
                subprocess.run([str(python_bin), "main.py"], cwd=str(BASE_DIR))
                print("Manual upload finished.")

            threading.Thread(target=run_post, daemon=True).start()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Manual Reel upload started in the background."}).encode('utf-8'))

        elif self.path == "/api/sync-stats":
            # Trigger syncing metrics from Instagram
            def run_sync():
                print("Syncing Instagram metrics...")
                python_bin = BASE_DIR / "venv" / "bin" / "python"
                if not python_bin.exists():
                    python_bin = "python3"
                
                # We can call a script/command to update metrics
                # Let's run main.py with a dry-run flag just to update analytics
                subprocess.run([str(python_bin), "main.py", "--dry-run"], cwd=str(BASE_DIR))
                print("Metrics sync finished.")

            threading.Thread(target=run_sync, daemon=True).start()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Instagram metrics sync initiated."}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    server = HTTPServer(('0.0.0.0', PORT), DashboardHandler)
    print(f"🚀 AI Signal Dashboard running at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping dashboard server.")
        server.server_close()

if __name__ == "__main__":
    run_server()
