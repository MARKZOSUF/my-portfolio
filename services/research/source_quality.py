from datetime import date
from urllib.parse import urlsplit
from utils.security import is_same_or_subdomain
AUTHORITY={"nasa.gov":.97,"nih.gov":.97,"who.int":.96,"ieee.org":.90,"acm.org":.90,"nature.com":.90,"science.org":.90}
EDUCATIONAL={"britannica.com":.82,"khanacademy.org":.82,"wikipedia.org":.72}
def _suffix(host,suffix):
    suffix=suffix.lstrip(".")
    return host==suffix or host.endswith("."+suffix)
def classify_domain(host):
    if any(is_same_or_subdomain(host,x) for x in ("nasa.gov","nih.gov")) or _suffix(host,".gov"): return "government"
    if _suffix(host,".edu") or any(label=="ac" for label in host.split(".")[:-1]): return "university"
    if any(is_same_or_subdomain(host,x) for x in ("ieee.org","acm.org","nature.com","science.org")): return "academic"
    return "educational"
def score_source(url,title="",snippet="",publication_date=None,extraction_status="snippet_only",author=None,publisher=None):
    host=(urlsplit(url).hostname or "").lower().rstrip("."); score=.56; signals={"domain":"baseline","publication_date":bool(publication_date),"author":bool(author),"publisher":bool(publisher),"extraction":extraction_status}
    for root,value in AUTHORITY.items():
        if is_same_or_subdomain(host,root): score=max(score,value); signals["domain"]=root; break
    else:
        for root,value in EDUCATIONAL.items():
            if is_same_or_subdomain(host,root): score=max(score,value); signals["domain"]=root; break
        if _suffix(host,".gov"): score=max(score,.91); signals["domain"]="government"
        elif _suffix(host,".edu"): score=max(score,.88); signals["domain"]="education"
    if author: score+=.02
    if publisher: score+=.02
    if publication_date: score+=.02
    if extraction_status in {"html_extracted","pdf_extracted","text_extracted"}: score+=.03
    relevance=min(1.0,.35+(0.1 if title else 0)+min(len(snippet)/1200,.45))
    return host,classify_domain(host),round(relevance,2),round(min(score,1.0),2),signals
