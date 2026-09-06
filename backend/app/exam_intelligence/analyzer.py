from collections import Counter,defaultdict
def analyze_pyqs(rows:list[dict])->dict:
 frequency=Counter(str(x.get('topic','Unclassified')) for x in rows);marks=defaultdict(float)
 for x in rows:marks[str(x.get('topic','Unclassified'))]+=float(x.get('marks') or 0)
 ranked=[]
 for topic,count in frequency.most_common():
  score=count*2+marks[topic];priority='VERY HIGH' if score>=20 else 'HIGH' if score>=12 else 'MEDIUM' if score>=5 else 'LOW';ranked.append({'topic':topic,'historical_count':count,'historical_marks':marks[topic],'priority':priority})
 return {'evidence_count':len(rows),'priorities':ranked,'disclaimer':'Priorities summarize supplied historical evidence and do not guarantee future questions.'}
