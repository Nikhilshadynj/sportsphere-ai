import re
import asyncio
from pypdf import PdfReader

def _clean_extracted_text(text: str) -> str:
    # 1. \r\n -> \n
    text = text.replace('\r\n', '\n')
    # 2. Multiple spaces/tabs -> single space
    text = re.sub(r'[ \t]+', ' ', text)
    # 3. Har line ke start/end ka extra whitespace hatao
    text = re.sub(r'^[ \t]+|[ \t]+$', '', text, flags=re.MULTILINE)
    # 4. 3+ consecutive blank lines -> max 2 blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    # 5. Overall trim
    return text.strip()

def _extract_sync(file_path: str) -> dict:
    reader = PdfReader(file_path)
    page_count = len(reader.pages)
    
    text_parts = []
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text_parts.append(extracted)
            
    raw_text = "\n".join(text_parts)
    cleaned_text = _clean_extracted_text(raw_text)
    
    if not cleaned_text:
        raise Exception("No readable text found in the PDF")
        
    return {
        "text": cleaned_text,
        "page_count": page_count,
        "character_count": len(cleaned_text)
    }

async def extract_text_from_pdf(file_path: str) -> dict:
    # Event loop block hone se bachane ke liye thread use kiya
    return await asyncio.to_thread(_extract_sync, file_path)