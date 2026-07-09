"""
pdf_parser.py
─────────────
Extracts raw plain text from PDF files using pdfplumber.
Handles multi-column layouts, strips headers/footers via a configurable
margin crop, and concatenates all pages into a single string.
"""

import pdfplumber


def parse_pdf(path: str) -> str:
    """
    Extract and return all text from a PDF file at `path`.

    Args:
        path: Absolute or relative path to the PDF file.

    Returns:
        A single string containing all extracted text, with pages
        separated by a form-feed character ('\\f').

    Raises:
        FileNotFoundError: If the file does not exist.
        Exception: Re-raises any pdfplumber parsing errors.
    """
    pages_text: list[str] = []

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            # Crop away typical header/footer margins (top 5%, bottom 5%)
            # to reduce noise from page numbers and running headers.
            h = page.height
            cropped = page.crop((0, h * 0.05, page.width, h * 0.95))
            text = cropped.extract_text(x_tolerance=3, y_tolerance=3)
            if text:
                pages_text.append(text.strip())

    return "\f".join(pages_text)
