import ipaddress,re,socket,unicodedata
from dataclasses import dataclass
from urllib.parse import urlsplit,urlunsplit,unquote
from utils.errors import AppError
BLOCKED_HOSTS={"localhost","localhost.localdomain","metadata.google.internal","metadata","instance-data","169.254.169.254"}
HOST_RE=re.compile(r"^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
@dataclass(frozen=True)
class ValidatedURL:
    url:str
    hostname:str
    addresses:frozenset[str]
def _public_ip(value):
    ip=ipaddress.ip_address(value)
    if not ip.is_global or ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
        raise AppError("UNSAFE_URL","Private, local, reserved, and metadata destinations are blocked.",400)
    return str(ip)
def validate_public_url(url,resolve=True):
    if not isinstance(url,str) or len(url)>2048 or any(ord(c)<32 for c in url): raise AppError("UNSAFE_URL","The source URL is malformed.",400)
    raw=unicodedata.normalize("NFKC",url.strip())
    try: parts=urlsplit(raw)
    except ValueError as exc: raise AppError("UNSAFE_URL","The source URL is malformed.",400) from exc
    if parts.scheme.lower() not in {"http","https"} or not parts.hostname: raise AppError("UNSAFE_URL","Only public HTTP and HTTPS URLs are allowed.",400)
    if parts.username is not None or parts.password is not None: raise AppError("UNSAFE_URL","URLs containing credentials are blocked.",400)
    try: port=parts.port
    except ValueError as exc: raise AppError("UNSAFE_URL","The source URL has an invalid port.",400) from exc
    if port not in {None,80,443}: raise AppError("UNSAFE_URL","Only standard web ports are allowed.",400)
    try: host=parts.hostname.rstrip(".").encode("idna").decode("ascii").lower()
    except UnicodeError as exc: raise AppError("UNSAFE_URL","The source hostname is invalid.",400) from exc
    if host in BLOCKED_HOSTS or host.endswith((".localhost",".local",".internal")) or not HOST_RE.fullmatch(host): raise AppError("UNSAFE_URL","Local or malformed hostnames are blocked.",400)
    addresses=set()
    try:
        addresses.add(_public_ip(host))
    except ValueError:
        if re.fullmatch(r"(?:0x[0-9a-f]+|\d+)",host): raise AppError("UNSAFE_URL","Alternate numeric IP formats are blocked.",400)
        if resolve:
            try:
                for info in socket.getaddrinfo(host,port or (443 if parts.scheme=="https" else 80),type=socket.SOCK_STREAM): addresses.add(_public_ip(info[4][0]))
            except socket.gaierror as exc: raise AppError("URL_UNRESOLVED","The source domain could not be resolved.",400) from exc
    if resolve and not addresses: raise AppError("URL_UNRESOLVED","The source domain could not be resolved.",400)
    netloc=host+(f":{port}" if port else "")
    clean=urlunsplit((parts.scheme.lower(),netloc,parts.path or "/",parts.query,""))
    return ValidatedURL(clean,host,frozenset(addresses))
def safe_url_string(url,resolve=True): return validate_public_url(url,resolve=resolve).url
def is_same_or_subdomain(host,root):
    host=(host or "").lower().rstrip("."); root=root.lower().rstrip(".")
    return host==root or host.endswith("."+root)


def sanitize_prompt_text(value, max_len=200):
    """Make user-controlled metadata (filenames, titles) safe for prompts.

    Strips angle brackets and control characters so values cannot break the
    prompt's XML-style delimiters, collapses whitespace, and bounds length.
    """
    text = "".join(c for c in str(value or "") if ord(c) >= 32 and c not in "<>")
    return " ".join(text.split())[:max_len]
