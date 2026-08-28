from services.ai.base import AIProvider,AIResponse,ProviderCapabilities
from services.ai.http import SafeHTTPClient
from utils.errors import AppError
class OpenAIChatProvider(AIProvider):
    capabilities=ProviderCapabilities(True,False,False,False)
    def __init__(self,api_key,base_url,model,connect_timeout=10,read_timeout=90,max_retries=2): self.model=model; self.http=SafeHTTPClient(base_url,api_key,connect_timeout,read_timeout,max_retries)
    def headers(self): return {"Authorization":f"Bearer {self.http._api_key}","Content-Type":"application/json"}
    def generate(self,messages,*,max_tokens=None,temperature=0.2):
        body={"model":self.model,"messages":[{"role":m.get("role","user"),"content":str(m.get("content",""))} for m in messages],"temperature":temperature}
        if max_tokens: body["max_tokens"]=max_tokens
        r=self.http.request("POST","chat/completions",headers=self.headers(),json_body=body); data=self.http.json(r); r.close()
        try: text=data["choices"][0]["message"]["content"]
        except (KeyError,IndexError,TypeError) as exc: raise AppError("INVALID_PROVIDER_OUTPUT","The AI provider returned no text.",502) from exc
        return AIResponse(text=str(text),usage=data.get("usage") or {})
