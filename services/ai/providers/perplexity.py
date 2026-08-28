from services.ai.base import SearchHit,ProviderCapabilities
from services.ai.providers.openai_chat import OpenAIChatProvider
class PerplexityProvider(OpenAIChatProvider):
    provider_name="perplexity"; capabilities=ProviderCapabilities(True,False,True,False)
    def search_web(self,query,*,max_results=5):
        body={"model":self.model,"messages":[{"role":"system","content":"Find reliable public sources. Return concise evidence with sources."},{"role":"user","content":query}],"temperature":0.1}
        r=self.http.request("POST","chat/completions",headers=self.headers(),json_body=body); data=self.http.json(r); r.close(); hits=[]; seen=set()
        for item in data.get("search_results") or []:
            url=item.get("url")
            if url and url not in seen: seen.add(url); hits.append(SearchHit(item.get("title") or url,url,item.get("snippet") or "",item.get("date")))
        for url in data.get("citations") or []:
            if isinstance(url,str) and url not in seen: seen.add(url); hits.append(SearchHit(url,url,"Provider citation"))
        return hits[:max_results]
