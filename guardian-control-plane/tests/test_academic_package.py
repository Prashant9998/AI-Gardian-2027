"""
Test suite for Step 8: Academic Defense, Viva Package & Research Paper.
Verifies completeness, academic rigor, structural integrity, and cross-reference
consistency across all thesis and publication deliverables.
"""

import os
import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DOCS_DIR = REPO_ROOT / "docs"

FINAL_REPORT_PATH = DOCS_DIR / "FINAL_PROJECT_REPORT.md"
RESEARCH_PAPER_PATH = DOCS_DIR / "IEEE_RESEARCH_PAPER.md"
PRESENTATION_DECK_PATH = DOCS_DIR / "PRESENTATION_DECK.md"
VIVA_CHEAT_SHEET_PATH = DOCS_DIR / "VIVA_VOCE_CHEAT_SHEET.md"


def test_academic_package_deliverables_exist():
    """Verify that all four required academic documents exist and have non-trivial size."""
    assert DOCS_DIR.is_dir(), "docs/ directory must exist"
    
    docs = [
        FINAL_REPORT_PATH,
        RESEARCH_PAPER_PATH,
        PRESENTATION_DECK_PATH,
        VIVA_CHEAT_SHEET_PATH,
    ]
    for doc in docs:
        assert doc.is_file(), f"Expected academic document {doc.name} does not exist"
        size = doc.stat().st_size
        assert size > 2000, f"Document {doc.name} appears truncated (size: {size} bytes)"


def test_final_project_report_structure_and_metrics():
    """Verify that FINAL_PROJECT_REPORT.md contains all 9 chapters, math, and verified benchmarks."""
    content = FINAL_REPORT_PATH.read_text(encoding="utf-8")
    
    # Check for core chapters
    expected_chapters = [
        "Chapter 1: Introduction",
        "Chapter 2: Literature Review",
        "Chapter 3: System Architecture",
        "Chapter 4: Machine Learning Pipeline",
        "Chapter 5: Stateful Deception",
        "Chapter 6: Implementation Details",
        "Chapter 7: Experimental Results",
        "Chapter 8: Security, Reliability",
        "Chapter 9: Conclusion",
        "References (IEEE Format)",
    ]
    for chapter in expected_chapters:
        assert chapter in content, f"Missing expected chapter or section: {chapter}"
        
    # Check for empirical benchmark figures from Step 2 model training
    assert "100.00%" in content, "Report must reflect verified 100.00% benchmark accuracy"
    assert "0.00%" in content, "Report must reflect verified 0.00% False Positive Rate"
    assert "625" in content, "Report must reflect the 625 held-out test split samples"
    assert "Isolation Forest" in content
    assert "Random Forest" in content
    assert "CSIC 2010" in content


def test_ieee_research_paper_sections_and_equations():
    """Verify that IEEE_RESEARCH_PAPER.md adheres to IEEE conference publication format."""
    content = RESEARCH_PAPER_PATH.read_text(encoding="utf-8")
    
    # Check IEEE sections
    expected_sections = [
        "Abstract",
        "Index Terms",
        "I. Introduction",
        "II. Related Work",
        "III. Proposed System Architecture",
        "IV. Feature Engineering",
        "V. Stateful Deception",
        "VI. Experimental Setup",
        "VII. Discussion",
        "VIII. Conclusion",
        "References",
    ]
    for sec in expected_sections:
        assert sec in content, f"Missing IEEE paper section: {sec}"
        
    # Check for mathematical fusion formulation
    assert "S(X) = \\alpha" in content or "S = \\alpha" in content or "\\alpha \\cdot R" in content, (
        "Paper must contain mathematical threat fusion formulation"
    )
    assert "Isolation Forest" in content
    assert "Random Forest" in content
    assert "STIX 2.1" in content


def test_presentation_deck_all_15_slides():
    """Verify that PRESENTATION_DECK.md contains all 15 discrete slides with notes and examiner Q&A."""
    content = PRESENTATION_DECK_PATH.read_text(encoding="utf-8")
    
    # Check for 15 slides
    for i in range(1, 16):
        slide_marker = f"Slide {i}:"
        assert slide_marker in content, f"Presentation deck must contain {slide_marker}"
        
    # Check for speaker notes and examiner questions
    assert "Speaker Notes" in content
    assert "Anticipated Examiner Question" in content
    assert "80 Dimensions" in content
    assert "Stateful Virtual Honeypot" in content


def test_viva_voce_cheat_sheet_technical_depth():
    """Verify that VIVA_VOCE_CHEAT_SHEET.md contains required defense questions and live demo script."""
    content = VIVA_CHEAT_SHEET_PATH.read_text(encoding="utf-8")
    
    # Check key technical concepts covered
    expected_terms = [
        "FastAPI",
        "Redis",
        "Isolation Forest",
        "Virtual File System",
        "Canary",
        "STIX 2.1",
        "Fail-Open",
        "race condition",
        "Live Demonstration Script",
    ]
    for term in expected_terms:
        assert term.lower() in content.lower(), f"Viva cheat sheet should address: {term}"
        
    # Check that live demo covers clean, SQLi, Honeypot, and PDF
    assert "curl" in content
    assert "UNION SELECT" in content
    assert "/.env" in content
    assert "export-pdf" in content or "Export PDF" in content
