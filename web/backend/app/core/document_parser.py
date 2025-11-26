from typing import Tuple
from fastapi import UploadFile, HTTPException, status


async def parse_document(file: UploadFile) -> Tuple[str, str]:
    """
    Парсит загруженный TXT файл и возвращает текст и тип файла.
    Возвращает: (text, file_type)
    """
    filename = file.filename.lower()
    
    if not filename.endswith('.txt'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only .txt files are supported"
        )
    
    file_type = 'txt'
    content = await file.read()
    text = content.decode('utf-8', errors='ignore')
    
    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is empty or could not be parsed"
        )
    
    return text, file_type



