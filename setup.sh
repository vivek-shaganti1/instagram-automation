#!/bin/bash
# ============================================================
# Instagram AI News Automation — Setup Script
# Run: bash setup.sh
# ============================================================

set -e  # Exit on error

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$PROJECT_DIR/venv"
LOG_DIR="$HOME/Library/Logs"
PLIST_SRC="$PROJECT_DIR/com.instagram.ainews.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.instagram.ainews.plist"

echo "============================================================"
echo "🚀 Instagram AI News Automation Setup"
echo "============================================================"
echo "Project directory: $PROJECT_DIR"

# ─── Check Python ─────────────────────────────────────────────
echo ""
echo "📍 Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Install it from https://python.org"
    exit 1
fi
PYTHON_VER=$(python3 --version)
echo "✅ $PYTHON_VER"

# ─── Create Virtual Environment ───────────────────────────────
echo ""
echo "📦 Creating virtual environment..."
if [ -d "$VENV_DIR" ]; then
    echo "   (venv already exists, skipping)"
else
    python3 -m venv "$VENV_DIR"
    echo "✅ Virtual environment created at: $VENV_DIR"
fi

# ─── Install Dependencies ─────────────────────────────────────
echo ""
echo "📦 Installing Python dependencies..."
source "$VENV_DIR/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet -r "$PROJECT_DIR/requirements.txt"
echo "✅ Dependencies installed"

# ─── Download Inter Fonts ─────────────────────────────────────
echo ""
echo "🔤 Downloading Inter fonts..."
FONTS_DIR="$PROJECT_DIR/assets/fonts"
mkdir -p "$FONTS_DIR"

download_font() {
    local url="$1"
    local dest="$2"
    if [ ! -f "$dest" ]; then
        echo "   Downloading: $(basename $dest)..."
        curl -sL "$url" -o "$dest" || echo "   ⚠️  Failed to download $(basename $dest) (will use system fallback)"
    else
        echo "   ✓ $(basename $dest) already exists"
    fi
}

# Download Inter variable font (single file covers all weights)
INTER_URL="https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip"
ZIP_FILE="$FONTS_DIR/Inter-4.0.zip"

if [ ! -f "$FONTS_DIR/Inter-Regular.ttf" ]; then
    echo "   Downloading Inter font package..."
    curl -sL "$INTER_URL" -o "$ZIP_FILE" 2>/dev/null || true

    if [ -f "$ZIP_FILE" ]; then
        cd "$FONTS_DIR"
        unzip -q "$ZIP_FILE" "*.ttf" 2>/dev/null || true
        # Try to find and rename
        find . -name "Inter-Regular.ttf" 2>/dev/null | head -1 | xargs -I{} mv {} ./Inter-Regular.ttf 2>/dev/null || true
        find . -name "Inter-Bold.ttf" 2>/dev/null | head -1 | xargs -I{} mv {} ./Inter-Bold.ttf 2>/dev/null || true
        find . -name "Inter-Medium.ttf" 2>/dev/null | head -1 | xargs -I{} mv {} ./Inter-Medium.ttf 2>/dev/null || true
        find . -name "Inter-SemiBold.ttf" 2>/dev/null | head -1 | xargs -I{} mv {} ./Inter-SemiBold.ttf 2>/dev/null || true
        rm -f "$ZIP_FILE" 2>/dev/null || true
        cd "$PROJECT_DIR"
        echo "   ✅ Inter fonts extracted"
    else
        echo "   ⚠️  Could not download Inter. Script will use system fonts."
    fi
else
    echo "   ✓ Inter fonts already present"
fi

# ─── Setup .env ───────────────────────────────────────────────
echo ""
echo "⚙️  Setting up configuration..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo "✅ Created .env from template"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your credentials:"
    echo "   INSTAGRAM_USERNAME=your_username"
    echo "   INSTAGRAM_PASSWORD=your_password"
    echo "   INSTAGRAM_HANDLE=@your_handle"
    echo ""
    echo "   The Google AI API key is already set."
else
    echo "✅ .env already exists"
fi

# ─── Detect Timezone for Scheduling ──────────────────────────
echo ""
echo "🕐 Configuring schedule (6:00 AM CST)..."

# Get local timezone
LOCAL_TZ=$(date +%Z)
echo "   Your timezone: $LOCAL_TZ"

# CST = UTC-6, CDT = UTC-5
# 6 AM CST = 12:00 UTC = various local times
# We schedule in LOCAL time that corresponds to 12:00 UTC

HOUR=17   # Default: IST (UTC+5:30) -> 17:30 local = 12:00 UTC = 6 AM CST
MINUTE=30

case "$LOCAL_TZ" in
    CST|CDT)
        HOUR=6
        MINUTE=0
        echo "   → Scheduling at 6:00 AM (CST local)"
        ;;
    EST|EDT)
        HOUR=7
        MINUTE=0
        echo "   → Scheduling at 7:00 AM (EST local = 6 AM CST)"
        ;;
    PST|PDT)
        HOUR=4
        MINUTE=0
        echo "   → Scheduling at 4:00 AM (PST local = 6 AM CST)"
        ;;
    MST|MDT)
        HOUR=5
        MINUTE=0
        echo "   → Scheduling at 5:00 AM (MST local = 6 AM CST)"
        ;;
    IST)
        HOUR=17
        MINUTE=30
        echo "   → Scheduling at 5:30 PM (IST local = 6 AM CST next day)"
        ;;
    *)
        echo "   ⚠️  Unknown timezone '$LOCAL_TZ'. Using 12:00 UTC (6 AM CST)"
        HOUR=12
        MINUTE=0
        ;;
esac

# Update plist with correct time
PLIST_TEMP="$PROJECT_DIR/com.instagram.ainews.plist.tmp"
sed "s|<integer>17</integer>|<integer>$HOUR</integer>|g; s|<integer>30</integer>|<integer>$MINUTE</integer>|g" "$PLIST_SRC" > "$PLIST_TEMP"
mv "$PLIST_TEMP" "$PLIST_SRC"

# ─── Install LaunchAgent ──────────────────────────────────────
echo ""
echo "⏰ Installing LaunchAgent (daily scheduler)..."
mkdir -p "$HOME/Library/LaunchAgents"
cp "$PLIST_SRC" "$PLIST_DEST"

# Unload if already loaded
launchctl unload "$PLIST_DEST" 2>/dev/null || true
# Load the agent
launchctl load -w "$PLIST_DEST"
echo "✅ LaunchAgent installed and loaded"
echo "   Schedule: Every day at ${HOUR}:$(printf '%02d' $MINUTE) local time (6 AM CST)"

# ─── Create output directories ────────────────────────────────
mkdir -p "$PROJECT_DIR/output"
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/assets/fonts"
touch "$PROJECT_DIR/src/__init__.py" 2>/dev/null || true

# ─── Final Test ───────────────────────────────────────────────
echo ""
echo "🧪 Running quick test (research only)..."
source "$VENV_DIR/bin/activate"
cd "$PROJECT_DIR"
python main.py --research-only 2>&1 | head -30 || echo "⚠️  Test run failed. Check your .env credentials."

echo ""
echo "============================================================"
echo "✅ SETUP COMPLETE!"
echo "============================================================"
echo ""
echo "📋 Quick commands:"
echo "   Test the system:     python main.py --dry-run"
echo "   Post 1 test:         python main.py --test-post"
echo "   Run everything now:  python main.py"
echo "   Check schedule:      launchctl list | grep instagram"
echo "   View logs:           tail -f ~/Library/Logs/instagram_automation.log"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env with your Instagram credentials"
echo "   2. Run: python main.py --dry-run  (to test without posting)"
echo "   3. Run: python main.py --test-post  (to post 1 test carousel)"
echo "   4. The system will auto-post at 6 AM CST daily!"
echo ""
echo "============================================================"
