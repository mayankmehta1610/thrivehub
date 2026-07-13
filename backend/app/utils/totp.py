"""Native RFC 6238 TOTP (time-based one-time passwords) — no external dependency."""
import base64
import hashlib
import hmac
import secrets
import struct
import time
import urllib.parse

STEP = 30
DIGITS = 6


def generate_secret() -> str:
    """Return a base32 secret (no padding) suitable for authenticator apps."""
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8").rstrip("=")


def _code_at(secret: str, timestamp: float) -> str:
    counter = int(timestamp // STEP)
    padded = secret + "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(padded, casefold=True)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(binary % (10 ** DIGITS)).zfill(DIGITS)


def verify(secret: str, code: str, window: int = 1) -> bool:
    """Verify a code, allowing +/- `window` steps of clock drift."""
    if not secret or not code:
        return False
    code = str(code).strip()
    if not code.isdigit() or len(code) != DIGITS:
        return False
    now = time.time()
    for w in range(-window, window + 1):
        if _code_at(secret, now + w * STEP) == code:
            return True
    return False


def provisioning_uri(secret: str, account: str, issuer: str = "ThriveHub") -> str:
    """otpauth:// URI for authenticator apps (also used to render a QR)."""
    label = urllib.parse.quote(f"{issuer}:{account}")
    params = urllib.parse.urlencode(
        {"secret": secret, "issuer": issuer, "digits": DIGITS, "period": STEP}
    )
    return f"otpauth://totp/{label}?{params}"
