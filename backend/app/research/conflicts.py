import re
def terms(v):return {x for x in re.findall(r'\w{4,}',v.lower()) if x not in {'this','that','with','from','have','were','their','there','study'}}
def detect(citations):
 out=[]
 for i,a in enumerate(citations):
  for b in citations[i+1:]:
   overlap=len(terms(a['quote'])&terms(b['quote']))/max(1,len(terms(a['quote'])|terms(b['quote'])));na=bool(re.search(r'\b(no|not|never|fail|lack|decrease)\b',a['quote'],re.I));nb=bool(re.search(r'\b(no|not|never|fail|lack|decrease)\b',b['quote'],re.I))
   if overlap>.2 and na!=nb:out.append({'claim_a':a['quote'],'claim_b':b['quote'],'classification':'contradicting' if overlap>.35 else 'partially_contradicting','reason':'Materially similar claims use opposing polarity.','confidence':round(.55+.4*overlap,3)})
   if len(out)>=50:return out
 return out
