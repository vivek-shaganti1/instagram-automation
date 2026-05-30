import os
import re
import sys
from pathlib import Path

# Adjust path to import src modules if needed
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

class CodebaseAuditor:
    def __init__(self):
        self.issues = []
        self.scanned_count = 0
        self.patterns = {
            "swallowed_exception": (
                r"except\s+Exception\s*(?:as\s+\w+)?:\s*pass|except:\s*pass|catch\s*\(\s*\w+\s*\)\s*\{\s*\}",
                "Swallowed Exception: Silent catch block with no logging/handling."
            ),
            "placeholder_logic": (
                r"TODO|FIXME|placeholder|simulate|mock_reel_pk|mock_user",
                "Placeholder/Simulated Logic: Possible mock production logic active."
            ),
            "silent_failures": (
                r"console\.error\([^)]*\)\s*;\s*resolve\(sim\)|console\.warn\([^)]*\)\s*;\s*return\s+resolve\([^)]*\)",
                "Silent Failure: Resolving fallback/mock data on catch instead of propagating error."
            ),
            "missing_await": (
                r"(?<!await\s)prisma\.\w+\.\w+\(",
                "Potential Missing Await: Call to prisma client without prepended await."
            ),
            "hardcoded_credentials": (
                r"password\s*=\s*['\"][^'\"]{6,}['\"]|access_token\s*=\s*['\"][^'\"]{10,}['\"]",
                "Hardcoded Credentials: Raw secret keys found in codebase."
            )
        }

    def audit_file(self, filepath: Path):
        self.scanned_count += 1
        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception as e:
            return

        lines = content.splitlines()
        for pattern_name, (regex, desc) in self.patterns.items():
            for i, line in enumerate(lines):
                # Ignore this file itself and generated reports
                if "audit_suite.py" in str(filepath) or "validation_report" in str(filepath):
                    continue
                # Ignore comments
                if line.strip().startswith("#") or line.strip().startswith("//"):
                    continue

                if re.search(regex, line):
                    self.issues.append({
                        "file": str(filepath.relative_to(BASE_DIR)),
                        "line": i + 1,
                        "code": line.strip()[:100],
                        "type": pattern_name.upper(),
                        "description": desc
                    })

    def scan_directories(self):
        targets = [
            BASE_DIR / "src",
            BASE_DIR / "backend" / "src",
            BASE_DIR / "main.py",
            BASE_DIR / "server.py",
            BASE_DIR / "post_reel_cli.py"
        ]

        for target in targets:
            if target.is_file():
                self.audit_file(target)
            elif target.is_dir():
                for root, _, files in os.walk(target):
                    for file in files:
                        if file.endswith((".py", ".ts", ".js")):
                            self.audit_file(Path(root) / file)

    def generate_report(self) -> dict:
        self.scan_directories()
        
        # Categorize
        categorized = {"CRITICAL": [], "HIGH": [], "MEDIUM": [], "LOW": []}
        
        for issue in self.issues:
            itype = issue["type"]
            if itype in ["HARDCODED_CREDENTIALS", "SILENT_FAILURES"]:
                categorized["CRITICAL"].append(issue)
            elif itype in ["SWALLOWED_EXCEPTION", "MISSING_AWAIT"]:
                categorized["HIGH"].append(issue)
            else:
                categorized["MEDIUM"].append(issue)

        return {
            "scanned_files": self.scanned_count,
            "total_issues": len(self.issues),
            "categorized": categorized
        }

if __name__ == "__main__":
    auditor = CodebaseAuditor()
    report = auditor.generate_report()
    print(f"Audit Complete. Scanned {report['scanned_files']} files. Found {report['total_issues']} issues.")
    for level, issues in report["categorized"].items():
        if issues:
            print(f"\n[{level}] Count: {len(issues)}")
            for issue in issues[:5]:
                print(f"  - {issue['file']}:{issue['line']} -> {issue['description']}")
