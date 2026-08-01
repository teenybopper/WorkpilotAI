"""Document API router — upload, extract, compare, and query documents."""

import uuid
import logging
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Source, SourceType, SourceStatus
from app.schemas import (
    SourceResponse, DocumentExtractRequest, DocumentCompareRequest,
    DocumentQueryRequest, DocumentQueryResponse,
)
from app.services.docops import (
    parse_document, extract_entities, index_document_chunks,
    compare_documents, query_documents,
)
from app.utils.storage import save_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/upload", response_model=SourceResponse)
async def upload_document(
    file: UploadFile = File(...),
    workspace_id: str = Form(...),
    db: Session = Depends(get_db),
):
    """Upload a document file (PDF, DOCX, PPTX) to a workspace."""
    # Read file content
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    # Enforce per-route document size limit (50 MB)
    MAX_DOCUMENT_SIZE = 50 * 1024 * 1024
    if len(content) > MAX_DOCUMENT_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Document exceeds {MAX_DOCUMENT_SIZE // (1024 * 1024)} MB limit. "
                   "Please split large documents into smaller files.",
        )

    content_type = file.content_type or "application/octet-stream"
    source_id = str(uuid.uuid4())

    # Save to local filesystem
    storage_path = save_file(workspace_id, source_id, file.filename, content)

    # Create source record
    source = Source(
        id=source_id,
        workspace_id=workspace_id,
        source_type=SourceType.DOCUMENT,
        filename=file.filename,
        storage_path=storage_path,
        mime_type=content_type,
        file_size=len(content),
        status=SourceStatus.UPLOADED,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    logger.info(f"Document uploaded: {file.filename} -> {storage_path}")
    return source


@router.post("/extract")
async def extract_document(
    request: DocumentExtractRequest,
    db: Session = Depends(get_db),
):
    """Parse and extract structured data from an uploaded document."""
    source = db.query(Source).filter(Source.id == request.source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if source.source_type != SourceType.DOCUMENT:
        raise HTTPException(status_code=400, detail="Source is not a document")

    # Update status
    source.status = SourceStatus.PROCESSING
    db.commit()

    try:
        # Parse document with Docling
        doc_version = parse_document(source, db)

        # Extract entities
        entities = extract_entities(source, doc_version, db)

        # Index chunks in ChromaDB
        index_document_chunks(source, doc_version)

        return {
            "source_id": str(source.id),
            "status": "ready",
            "extracted_chars": len(doc_version.extracted_text or ""),
            "entities_found": len(entities),
            "tables_found": len(doc_version.tables_json or []),
        }
    except Exception as e:
        logger.error(f"Document extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@router.post("/compare")
async def compare_docs(
    request: DocumentCompareRequest,
    db: Session = Depends(get_db),
):
    """Compare two document versions and get a structured diff analysis."""
    source_a = db.query(Source).filter(Source.id == request.source_id_a).first()
    source_b = db.query(Source).filter(Source.id == request.source_id_b).first()

    if not source_a or not source_b:
        raise HTTPException(status_code=404, detail="One or both sources not found")

    result = compare_documents(source_a, source_b, db)
    return result


@router.post("/query", response_model=DocumentQueryResponse)
async def query_docs(
    request: DocumentQueryRequest,
    db: Session = Depends(get_db),
):
    """RAG-based Q&A over workspace documents."""
    result = query_documents(request.workspace_id, request.query, request.top_k, db)
    return result
