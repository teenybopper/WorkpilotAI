"""MinIO object storage utility for file upload/download."""

from minio import Minio
from minio.error import S3Error
from app.config import settings
import io
import logging

logger = logging.getLogger(__name__)

_client: Minio | None = None


def get_minio_client() -> Minio:
    """Get or create the MinIO client singleton."""
    global _client
    if _client is None:
        _client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
    return _client


def ensure_bucket():
    """Create the default bucket if it doesn't exist."""
    client = get_minio_client()
    bucket = settings.minio_bucket
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)
        logger.info(f"Created MinIO bucket: {bucket}")


def upload_file(object_name: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Upload bytes to MinIO and return the storage path."""
    client = get_minio_client()
    bucket = settings.minio_bucket

    client.put_object(
        bucket,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    storage_path = f"{bucket}/{object_name}"
    logger.info(f"Uploaded file to MinIO: {storage_path}")
    return storage_path


def download_file(object_name: str) -> bytes:
    """Download a file from MinIO and return its bytes."""
    client = get_minio_client()
    bucket = settings.minio_bucket

    response = client.get_object(bucket, object_name)
    data = response.read()
    response.close()
    response.release_conn()
    return data


def get_temp_path(object_name: str, local_dir: str = "/tmp/workpilot") -> str:
    """Download a file from MinIO to a temp path and return the local path."""
    import os
    os.makedirs(local_dir, exist_ok=True)
    local_path = os.path.join(local_dir, object_name.replace("/", "_"))

    data = download_file(object_name)
    with open(local_path, "wb") as f:
        f.write(data)

    return local_path
