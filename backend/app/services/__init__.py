from app.services.auth import get_or_create_local_user
from app.services.capture_service import (
    create_capture_session, receive_audio_chunk,
    process_keepalive, finalize_session, get_session_status,
)
from app.services.docops import parse_document
from app.services.meetops import (
    transcribe_audio, diarize_audio,
    extract_meeting_actions, index_transcript_chunks,
    generate_meeting_summary,
)
from app.services.intelligence import cross_source_query

