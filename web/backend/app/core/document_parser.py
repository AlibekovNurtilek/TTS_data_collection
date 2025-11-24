import io
from typing import Tuple
from fastapi import UploadFile, HTTPException, status

try:
    import docx
except ImportError:
    docx = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import pdfplumber
except ImportError:
    pdfplumber = None


async def parse_document(file: UploadFile) -> Tuple[str, str]:
    """
    Парсит загруженный документ и возвращает текст и тип файла.
    Возвращает: (text, file_type)
    """
    filename = file.filename.lower()
    file_type = None
    
    if filename.endswith('.txt'):
        file_type = 'txt'
        content = await file.read()
        text = content.decode('utf-8', errors='ignore')
    
    elif filename.endswith('.pdf'):
        file_type = 'pdf'
        content = await file.read()
        text = extract_text_from_pdf(content)
    
    elif filename.endswith(('.docx', '.doc')):
        file_type = 'docx'
        content = await file.read()
        text = extract_text_from_docx(content)
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Supported: .txt, .pdf, .docx"
        )
    
    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is empty or could not be parsed"
        )
    
    return text, file_type


def extract_text_from_pdf(content: bytes) -> str:
    """Извлекает текст из PDF"""
    text = ""
    
    # Пробуем pdfplumber (более точный)
    if pdfplumber:
        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        # Сохраняем структуру строк для лучшего определения колонтитулов
                        text += page_text + "\n"
            if text.strip():
                return text
        except Exception:
            pass
    
    # Fallback на PyPDF2
    if PyPDF2:
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception:
            pass
    
    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from PDF"
        )
    
    return text


def extract_text_from_docx(content: bytes) -> str:
    """Извлекает текст из DOCX"""
    if not docx:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="python-docx library is not installed"
        )
    
    try:
        doc = docx.Document(io.BytesIO(content))
        paragraphs = []
        
        for paragraph in doc.paragraphs:
            # Пропускаем пустые параграфы
            if not paragraph.text.strip():
                continue
            
            # Сохраняем структуру параграфов (каждый параграф на новой строке)
            paragraphs.append(paragraph.text.strip())
        
        # Соединяем параграфы с переносами строк для сохранения структуры
        text = "\n".join(paragraphs)
        return text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not extract text from DOCX: {str(e)}"
        )



