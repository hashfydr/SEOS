#!/usr/bin/env python3
import sys
import subprocess
import markdown_it
from pathlib import Path

def compile_markdown_to_pdf(md_path: str, pdf_path: str):
    md_file = Path(md_path)
    if not md_file.exists():
        print(f"Error: {md_path} does not exist", file=sys.stderr)
        sys.exit(1)

    with open(md_file, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Configure markdown parser with tables and gfm-like features
    md = markdown_it.MarkdownIt("gfm-like")
    rendered_body = md.render(md_text)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CONTEXT_HANDOFF</title>
  <style>
    @page {{
      size: letter;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {{
        content: counter(page);
      }}
    }}
    *, *::before, *::after {{
      box-sizing: border-box;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1f2937;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }}
    h1, h2, h3, h4, h5, h6 {{
      color: #111827;
      font-weight: 700;
      margin-top: 1.4em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
    }}
    h1 {{
      font-size: 20pt;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.3em;
      margin-top: 0.8em;
    }}
    h2 {{
      font-size: 14pt;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.25em;
      margin-top: 1.3em;
    }}
    h3 {{
      font-size: 12pt;
      margin-top: 1.1em;
    }}
    h4 {{
      font-size: 11pt;
    }}
    p, ul, ol {{
      margin-top: 0;
      margin-bottom: 0.8em;
    }}
    ul, ol {{
      padding-left: 1.6em;
    }}
    li {{
      margin-bottom: 0.3em;
    }}
    blockquote {{
      margin: 1em 0;
      padding: 0.6em 1em;
      background-color: #f9fafb;
      border-left: 4px solid #3b82f6;
      color: #374151;
      font-size: 10pt;
      border-radius: 0 4px 4px 0;
      page-break-inside: avoid;
    }}
    blockquote p:last-child {{
      margin-bottom: 0;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }}
    th, td {{
      padding: 6px 10px;
      border: 1px solid #d1d5db;
      text-align: left;
      vertical-align: top;
    }}
    th {{
      background-color: #f3f4f6;
      font-weight: 600;
      color: #111827;
    }}
    tr:nth-child(even) td {{
      background-color: #f9fafb;
    }}
    code {{
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 9pt;
      background-color: #f3f4f6;
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid #e5e7eb;
      color: #b91c1c;
    }}
    pre {{
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      overflow-x: auto;
      font-size: 8.5pt;
      line-height: 1.45;
      margin: 0.9em 0;
      page-break-inside: avoid;
    }}
    pre code {{
      background-color: transparent;
      padding: 0;
      border: none;
      color: #1e293b;
      font-size: inherit;
    }}
    hr {{
      border: 0;
      height: 1px;
      background: #e5e7eb;
      margin: 1.5em 0;
    }}
    a {{
      color: #2563eb;
      text-decoration: none;
    }}
    a:hover {{
      text-decoration: underline;
    }}
    .footer-note {{
      margin-top: 2em;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      padding-top: 1em;
    }}
  </style>
</head>
<body>
  {rendered_body}
  <div class="footer-note">
    SEOS — Software Engineering Operating System · TIET UCS 503 Coursework · Generated for Evaluation &amp; Context Handoff
  </div>
</body>
</html>
"""

    temp_html = Path("/tmp/context_handoff_print.html")
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"Generated intermediate HTML at {temp_html}")

    # Invoke headless Google Chrome to print to PDF
    chrome_cmd = [
        "google-chrome",
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={pdf_path}",
        str(temp_html)
    ]
    
    print("Running Google Chrome to generate PDF...")
    result = subprocess.run(chrome_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error compiling PDF: {result.stderr}", file=sys.stderr)
        sys.exit(result.returncode)

    pdf_file = Path(pdf_path)
    if pdf_file.exists():
        print(f"Successfully generated {pdf_path} ({pdf_file.stat().st_size} bytes)")
    else:
        print("Error: PDF output file was not created", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    compile_markdown_to_pdf("CONTEXT_HANDOFF.md", "output.pdf")
