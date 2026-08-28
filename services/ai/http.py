import json,random,time
from urllib.parse import urljoin
import requests
from utils.errors import AppError
class SafeHTTPClient:
    def __init__(self,base_url,api_key,connect_timeout=10,read_timeout=90,max_retries=2):
        self.base_url=base_url.rstrip("/")+"/"; self._api_key=api_key; self.timeout=(connect_timeout,read_timeout); self.max_retries=max_retries
        self.session=requests.Session(); self.session.trust_env=False
    def require_key(self):
        if not self._api_key: raise AppError("PROVIDER_NOT_CONFIGURED","Configure AI_API_KEY on the server.",503)
    def request(self,method,path,*,headers=None,json_body=None,stream=False):
        self.require_key(); url=urljoin(self.base_url,path.lstrip("/")); attempts=self.max_retries+1
        for attempt in range(attempts):
            try:
                response=self.session.request(method,url,headers=headers,json=json_body,timeout=self.timeout,stream=stream,allow_redirects=False)
            except (requests.Timeout,requests.ConnectionError) as exc:
                if attempt+1<attempts:
                    time.sleep((2**attempt)*0.25+random.random()*0.1); continue
                code="PROVIDER_TIMEOUT" if isinstance(exc,requests.Timeout) else "PROVIDER_UNAVAILABLE"
                raise AppError(code,"The AI provider could not be reached safely.",504 if code=="PROVIDER_TIMEOUT" else 502) from exc
            if response.status_code in {500,502,503,504} and attempt+1<attempts:
                response.close(); time.sleep((2**attempt)*0.25+random.random()*0.1); continue
            if response.status_code in {401,403}: response.close(); raise AppError("PROVIDER_AUTH_FAILED","The configured AI provider credentials were rejected.",502)
            if response.status_code==429: response.close(); raise AppError("PROVIDER_QUOTA_EXCEEDED","The AI provider rate or quota limit was reached.",429)
            if response.status_code in {400,404,409,422}: response.close(); raise AppError("PROVIDER_REQUEST_REJECTED","The AI provider rejected the configured model or request.",502)
            if response.status_code>=400: response.close(); raise AppError("PROVIDER_ERROR","The AI provider request failed.",502)
            return response
        raise AppError("PROVIDER_ERROR","The AI provider request failed.",502)
    @staticmethod
    def json(response):
        try:
            data=response.json()
            if not isinstance(data,dict): raise ValueError
            return data
        except (ValueError,json.JSONDecodeError) as exc: raise AppError("INVALID_PROVIDER_OUTPUT","The AI provider returned an invalid response.",502) from exc
