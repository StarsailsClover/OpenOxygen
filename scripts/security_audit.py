#!/usr/bin/env python3
"""
OpenOxygen Code Security Audit
Automated vulnerability scanning
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Tuple

class SecurityAuditor:
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.vulnerabilities: List[Dict] = []
        self.files_checked = 0
        
        # Security patterns to check
        self.patterns = {
            "eval_usage": {
                "pattern": r"\beval\s*\(",
                "severity": "CRITICAL",
                "description": "Dangerous eval() usage detected"
            },
            "function_constructor": {
                "pattern": r"new\s+Function\s*\(",
                "severity": "CRITICAL",
                "description": "Function constructor usage detected"
            },
            "hardcoded_secret": {
                "pattern": r"(password|secret|key|token|api_key)\s*[=:]\s*[\"'][^\"']+[\"']",
                "severity": "HIGH",
                "description": "Potential hardcoded secret"
            },
            "sql_injection": {
                "pattern": r"(SELECT|INSERT|UPDATE|DELETE).*\+.*\$\{",
                "severity": "HIGH",
                "description": "Potential SQL injection"
            },
            "path_traversal": {
                "pattern": r"\.\.[\/\\]",
                "severity": "MEDIUM",
                "description": "Potential path traversal"
            },
            "unsafe_deserialization": {
                "pattern": r"JSON\.parse\s*\([^)]*\)",
                "severity": "MEDIUM",
                "description": "Unsafe deserialization"
            },
            "command_injection": {
                "pattern": r"(exec|spawn)\s*\([^)]*\+[^)]*\)",
                "severity": "CRITICAL",
                "description": "Potential command injection"
            },
            "prototype_pollution": {
                "pattern": r"__proto__|constructor\s*\[\s*['\"]prototype['\"]\s*\]",
                "severity": "HIGH",
                "description": "Prototype pollution risk"
            },
            "insecure_random": {
                "pattern": r"Math\.random\s*\(\)",
                "severity": "LOW",
                "description": "Insecure random number generation"
            },
            "debug_info": {
                "pattern": r"console\.(log|debug|warn)\s*\([^)]*(password|secret|key|token)",
                "severity": "MEDIUM",
                "description": "Sensitive data in debug logs"
            }
        }
    
    def scan_file(self, file_path: Path) -> List[Dict]:
        """Scan a single file for vulnerabilities"""
        findings = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
                
                for vuln_name, vuln_info in self.patterns.items():
                    for i, line in enumerate(lines, 1):
                        if re.search(vuln_info["pattern"], line, re.IGNORECASE):
                            # Skip comments and strings
                            if self._is_in_comment_or_string(line, vuln_info["pattern"]):
                                continue
                            
                            findings.append({
                                "file": str(file_path.relative_to(self.project_path)),
                                "line": i,
                                "type": vuln_name,
                                "severity": vuln_info["severity"],
                                "description": vuln_info["description"],
                                "code": line.strip()[:100]
                            })
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
        
        return findings
    
    def _is_in_comment_or_string(self, line: str, pattern: str) -> bool:
        """Check if match is in comment or string"""
        # Simple check - can be improved
        if '//' in line and line.index('//') < line.find(re.search(pattern, line).start() if re.search(pattern, line) else 0):
            return True
        return False
    
    def scan_project(self) -> Dict:
        """Scan entire project"""
        print(f"Scanning project: {self.project_path}")
        
        # Scan TypeScript/JavaScript files
        for ext in ['*.ts', '*.js', '*.tsx', '*.jsx']:
            for file_path in self.project_path.rglob(ext):
                if 'node_modules' in str(file_path) or 'dist' in str(file_path):
                    continue
                
                self.files_checked += 1
                findings = self.scan_file(file_path)
                self.vulnerabilities.extend(findings)
        
        # Scan Rust files
        for file_path in self.project_path.rglob('*.rs'):
            if 'target' in str(file_path):
                continue
            
            self.files_checked += 1
            findings = self.scan_file(file_path)
            self.vulnerabilities.extend(findings)
        
        return self.generate_report()
    
    def generate_report(self) -> Dict:
        """Generate audit report"""
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        
        for vuln in self.vulnerabilities:
            severity_counts[vuln["severity"]] += 1
        
        report = {
            "summary": {
                "files_checked": self.files_checked,
                "total_vulnerabilities": len(self.vulnerabilities),
                "severity_counts": severity_counts
            },
            "vulnerabilities": sorted(
                self.vulnerabilities,
                key=lambda x: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}[x["severity"]]
            )
        }
        
        return report
    
    def save_report(self, output_path: str):
        """Save report to file"""
        report = self.generate_report()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Print summary
        print("\n" + "="*60)
        print("SECURITY AUDIT REPORT")
        print("="*60)
        print(f"Files checked: {report['summary']['files_checked']}")
        print(f"Total vulnerabilities: {report['summary']['total_vulnerabilities']}")
        print("\nSeverity breakdown:")
        for severity, count in report['summary']['severity_counts'].items():
            print(f"  {severity}: {count}")
        
        if report['vulnerabilities']:
            print("\nTop 10 vulnerabilities:")
            for i, vuln in enumerate(report['vulnerabilities'][:10], 1):
                print(f"\n{i}. [{vuln['severity']}] {vuln['type']}")
                print(f"   File: {vuln['file']}:{vuln['line']}")
                print(f"   Description: {vuln['description']}")
                print(f"   Code: {vuln['code']}")
        
        print(f"\nFull report saved to: {output_path}")

if __name__ == "__main__":
    import sys
    
    project_path = sys.argv[1] if len(sys.argv) > 1 else "D:\\Coding\\OpenOxygen"
    output_path = sys.argv[2] if len(sys.argv) > 2 else "D:\\Coding\\OpenOxygen\\security_audit.json"
    
    auditor = SecurityAuditor(project_path)
    auditor.scan_project()
    auditor.save_report(output_path)
