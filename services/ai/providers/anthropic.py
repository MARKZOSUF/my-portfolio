from services.ai.base import AIProvider,AIResponse,ProviderCapabilities
from services.ai.http import SafeHTTPClient
from utils.errors import AppError
class AnthropicProvider(AIProvider):
    provider_name="anthropic"; capabilities=ProviderCapabilities(True,False,False,False)
    def __init__(self,api_key,base_url,model,connect_timeout=10,read_timeout=90,max_retries=2): self.model=model; self.http=SafeHTTPClient(base_url,api_key,connect_timeout,read_timeout,max_retries)
    def generate(self,messages,*,max_tokens=None,temperature=0.2):
        system="\n".join(str(m.get("content","")) for m in messages if m.get("role")=="system")
        body={"model":self.model,"max_tokens":max_tokens or 4096,"temperature":temperature,"messages":[{"role":m.get("role","user"),"content":str(m.get("content",""))} for m in messages if m.get("role")!="system"]}
        if system: body["system"]=system
        headers={"x-api-key":self.http._api_key,"anthropic-version":"2023-06-01","Content-Type":"application/json"}
        r=self.http.request("POST","messages",headers=headers,json_body=body); data=self.http.json(r); r.close()
        text="".join(str(x.get("text","")) for x in data.get("content",[]) if x.get("type")=="text")
        if not text: raise AppError("INVALID_PROVIDER_OUTPUT","The AI provider returned no text.",502)
        return AIResponse(text=text,usage=data.get("usage") or {})
