import io,ipaddress,re,time
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
from utils.security import validate_public_url
from utils.errors import AppError
ALLOWED={"text/html","application/xhtml+xml","text/plain","application/pdf"}
UA="StudyResearchAI/2.0 safe-source-fetcher (+local educational research)"
def _peer_ip(response):
    for obj in (getattr(response.raw,"_connection",None),getattr(response.raw,"connection",None)):
        sock=getattr(obj,"sock",None)
        if sock:
            try: return str(ipaddress.ip_address(sock.getpeername()[0]))
            except Exception: pass
    return None
def _read_limited(response,max_bytes):
    data=bytearray()
    for chunk in response.iter_content(65536):
        if not chunk: continue
        if len(data)+len(chunk)>max_bytes: raise AppError("SOURCE_TOO_LARGE","The source exceeded the safe download limit.",422)
        data.extend(chunk)
    return bytes(data)
def _pdf_text(data,max_pages,max_chars,deadline):
    reader=PdfReader(io.BytesIO(data),strict=True)
    if len(reader.pages)>max_pages: raise AppError("SOURCE_PDF_LIMIT","The source PDF has too many pages.",422)
    out=[]
    for page in reader.pages:
        if time.monotonic()>deadline: raise AppError("SOURCE_PARSE_TIMEOUT","The source PDF took too long to parse.",422)
        out.append(page.extract_text() or "")
        if sum(map(len,out))>=max_chars: break
    return re.sub(r"\s+"," "," ".join(out))[:max_chars]
def fetch_text(url,timeout=20,max_bytes=8*1024*1024,max_chars=24000,redirect_limit=3,max_pdf_pages=40):
    session=requests.Session(); session.trust_env=False; current=url
    for hop in range(redirect_limit+1):
        validated=validate_public_url(current,resolve=True)
        try: response=session.get(validated.url,timeout=(min(10,timeout),timeout),allow_redirects=False,stream=True,headers={"User-Agent":UA,"Accept":"text/html,text/plain,application/pdf;q=0.9"})
        except requests.Timeout as exc: raise AppError("SOURCE_TIMEOUT","The source timed out.",422) from exc
        except requests.RequestException as exc: raise AppError("SOURCE_FETCH_FAILED","The source could not be fetched safely.",422) from exc
        peer=_peer_ip(response)
        if peer:
            peer=str(ipaddress.ip_address(peer))
            if peer not in validated.addresses: response.close(); raise AppError("DNS_REBINDING_BLOCKED","The source address changed during connection.",400)
        if response.status_code in {301,302,303,307,308}:
            location=response.headers.get("Location"); response.close()
            if not location or hop>=redirect_limit: raise AppError("UNSAFE_REDIRECT","The source redirect chain is invalid.",422)
            current=urljoin(validated.url,location); validate_public_url(current,resolve=True); continue
        if response.status_code<200 or response.status_code>=300: response.close(); raise AppError("SOURCE_HTTP_ERROR","The source returned an unusable status.",422)
        ctype=response.headers.get("Content-Type","").split(";",1)[0].strip().lower()
        if ctype not in ALLOWED: response.close(); raise AppError("SOURCE_TYPE_BLOCKED","The source content type is not allowed.",422)
        if int(response.headers.get("Content-Length") or 0)>max_bytes: response.close(); raise AppError("SOURCE_TOO_LARGE","The source exceeded the safe download limit.",422)
        data=_read_limited(response,max_bytes); response.close(); deadline=time.monotonic()+timeout
        if ctype=="application/pdf": return _pdf_text(data,max_pdf_pages,max_chars,deadline),"pdf_extracted",validated.url
        text=data.decode(response.encoding or "utf-8",errors="replace")[:max_chars*3]
        if ctype in {"text/html","application/xhtml+xml"}:
            soup=BeautifulSoup(text,"html.parser")
            for tag in soup(["script","style","nav","footer","form","svg","iframe","object"]): tag.decompose()
            text=soup.get_text(" ",strip=True); status="html_extracted"
        else: status="text_extracted"
        return re.sub(r"\s+"," ",text)[:max_chars],status,validated.url
    raise AppError("UNSAFE_REDIRECT","The source redirect chain is invalid.",422)
