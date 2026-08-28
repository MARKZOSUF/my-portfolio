from services.ai.base import AIProvider,AIResponse,ProviderCapabilities
from services.ai.http import SafeHTTPClient
from utils.errors import AppError
class GeminiProvider(AIProvider):
    provider_name="gemini"; capabilities=ProviderCapabilities(True,False,False,False)
    def __init__(self,api_key,base_url,model,connect_timeout=10,read_timeout=90,max_retries=2): self.model=model; self.http=SafeHTTPClient(base_url,api_key,connect_timeout,read_timeout,max_retries)
    def generate(self,messages,*,max_tokens=None,temperature=0.2):
        system="\n".join(str(m.get("content","")) for m in messages if m.get("role")=="system")
        contents=[{"role":"model" if m.get("role")=="assistant" else "user","parts":[{"text":str(m.get("content",""))}]} for m in messages if m.get("role")!="system"]
        body={"contents":contents,"generationConfig":{"temperature":temperature}}
        if max_tokens: body["generationConfig"]["maxOutputTokens"]=max_tokens
        if system: body["systemInstruction"]={"parts":[{"text":system}]}
        headers={"x-goog-api-key":self.http._api_key,"Content-Type":"application/json"}
        r=self.http.request("POST",f"models/{self.model}:generateContent",headers=headers,json_body=body); data=self.http.json(r); r.close()
        try: text="".join(p.get("text","") for p in data["candidates"][0]["content"]["parts"])
        except (KeyError,IndexError,TypeError) as exc: raise AppError("INVALID_PROVIDER_OUTPUT","The AI provider returned no text.",502) from exc
        return AIResponse(text=text,usage=data.get("usageMetadata") or {})
