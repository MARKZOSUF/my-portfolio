import json
from services.ai.base import AIProvider,AIResponse,ProviderCapabilities,SearchHit
from services.ai.http import SafeHTTPClient
from utils.errors import AppError
class OpenAIProvider(AIProvider):
    provider_name="openai"; capabilities=ProviderCapabilities(True,True,True,False)
    def __init__(self,api_key,base_url,model,connect_timeout=10,read_timeout=90,max_retries=2): self.model=model; self.http=SafeHTTPClient(base_url,api_key,connect_timeout,read_timeout,max_retries)
    def _headers(self): return {"Authorization":f"Bearer {self.http._api_key}","Content-Type":"application/json"}
    @staticmethod
    def _input(messages): return [{"role":m.get("role","user"),"content":[{"type":"input_text","text":str(m.get("content",""))}]} for m in messages]
    @staticmethod
    def _text(data):
        if data.get("output_text"): return data["output_text"]
        return "".join(str(part.get("text","")) for item in data.get("output",[]) for part in item.get("content",[]) if part.get("type") in {"output_text","text"})
    def generate(self,messages,*,max_tokens=None,temperature=0.2):
        body={"model":self.model,"input":self._input(messages),"temperature":temperature}
        if max_tokens: body["max_output_tokens"]=max_tokens
        r=self.http.request("POST","responses",headers=self._headers(),json_body=body); data=self.http.json(r); r.close()
        text=self._text(data)
        if not text: raise AppError("INVALID_PROVIDER_OUTPUT","The AI provider returned no text.",502)
        return AIResponse(text=text,usage=data.get("usage") or {})
    def stream(self,messages,*,max_tokens=None):
        body={"model":self.model,"input":self._input(messages),"stream":True}
        if max_tokens: body["max_output_tokens"]=max_tokens
        r=self.http.request("POST","responses",headers=self._headers(),json_body=body,stream=True)
        try:
            for line in r.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data: "): continue
                raw=line[6:]
                if raw=="[DONE]": break
                try:
                    event=json.loads(raw)
                    if event.get("type")=="response.output_text.delta" and event.get("delta"): yield event["delta"]
                except json.JSONDecodeError: continue
        finally: r.close()
    def search_web(self,query,*,max_results=5):
        body={"model":self.model,"input":query,"tools":[{"type":"web_search_preview"}],"tool_choice":"auto","max_output_tokens":1200,"include":["web_search_call.action.sources"]}
        r=self.http.request("POST","responses",headers=self._headers(),json_body=body); data=self.http.json(r); r.close(); hits=[]; seen=set()
        def add(title,url,snippet="",date=None):
            if isinstance(url,str) and url not in seen: seen.add(url); hits.append(SearchHit(str(title or url),url,str(snippet or ""),date))
        for item in data.get("output",[]):
            for source in (item.get("action") or {}).get("sources") or []: add(source.get("title"),source.get("url"),source.get("snippet"),source.get("published_date"))
            for part in item.get("content") or []:
                for ann in part.get("annotations") or []:
                    if ann.get("type")=="url_citation": add(ann.get("title"),ann.get("url"),part.get("text",""))
        return hits[:max_results]
