from __future__ import annotations

import base64

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _get_fernet() -> Fernet:
    """Return a Fernet cipher initialised from settings.ENCRYPTION_KEY.

    The key must be a URL-safe base-64-encoded 32-byte key as produced by
    ``Fernet.generate_key()``.  If the raw setting is not yet base-64-encoded
    (e.g. a plain hex string during local dev) it is padded and encoded
    automatically so the app still starts — but production should always use a
    proper Fernet key.
    """
    key = settings.ENCRYPTION_KEY
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    # If the provided value is already a valid Fernet key (44-char base64url)
    # use it directly; otherwise try to encode it.
    try:
        # Fernet accepts only URL-safe base64 keys of exactly 32 bytes decoded.
        decoded = base64.urlsafe_b64decode(key + "==")  # padding is idempotent
        if len(decoded) != 32:
            raise ValueError("Key decoded to wrong length.")
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        # Last-resort: hash the raw string into 32 bytes and re-encode
        import hashlib

        raw = hashlib.sha256(key.encode()).digest()
        safe_key = base64.urlsafe_b64encode(raw)
        return Fernet(safe_key)


def encrypt(plaintext: str) -> str:
    """Encrypt *plaintext* and return a URL-safe base-64 ciphertext string."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a ciphertext produced by :func:`encrypt` and return the original string.

    Raises :class:`cryptography.fernet.InvalidToken` if the token is invalid
    or has been tampered with.
    """
    f = _get_fernet()
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt value: token is invalid or corrupted.") from exc
