import re

def find_best_split_position(text: str, start: int, ideal_end: int) -> int:
    if ideal_end >= len(text):
        return len(text)
        
    search_start = max(start, ideal_end - 300)
    candidate = text[search_start:ideal_end]
    
    idx_paragraph = candidate.rfind("\n\n")
    if idx_paragraph != -1:
        return search_start + idx_paragraph + 2
        
    idx_sentence = max(candidate.rfind(". "), candidate.rfind("? "), candidate.rfind("! "))
    if idx_sentence != -1:
        return search_start + idx_sentence + 2
        
    idx_line = candidate.rfind("\n")
    if idx_line != -1:
        return search_start + idx_line + 1
        
    idx_space = candidate.rfind(" ")
    if idx_space != -1:
        return search_start + idx_space + 1
        
    return ideal_end

def adjust_start_to_word_boundary(text: str, start: int) -> int:
    if start <= 0:
        return 0
    if text[start - 1].isspace():
        return start
        
    match = re.search(r'\s', text[start:])
    if match:
        return start + match.start() + 1
    return start

def chunk_text(text: str, chunk_size: int = 1200, chunk_overlap: int = 200, minimum_chunk_size: int = 100) -> list:
    if not text.strip():
        return []
        
    chunks = []
    start = 0
    chunk_index = 0
    text_length = len(text)
    
    while start < text_length:
        ideal_end = min(start + chunk_size, text_length)
        end = find_best_split_position(text, start, ideal_end)
        
        chunk_content = text[start:end].strip()
        
        if len(chunk_content) >= minimum_chunk_size:
            chunks.append({
                "chunkIndex": chunk_index,
                "text": chunk_content,
                "characterCount": len(chunk_content),
                "startCharacter": start,
                "endCharacter": end
            })
            chunk_index += 1
            
        if end >= text_length:
            break
            
        overlapping_start = end - chunk_overlap
        adjusted_start = adjust_start_to_word_boundary(text, overlapping_start)
        
        start = adjusted_start if adjusted_start > start else end
        
    return chunks