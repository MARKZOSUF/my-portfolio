import re
def analyze_syllabus(text):
    units=[]; current=None
    for line in text.splitlines():
        s=line.strip(' -\t')
        if re.match(r'(?i)^(unit|module|chapter)\s+[\w-]+',s):
            current={'name':s[:120],'topics':[]}; units.append(current)
        elif current and 2<len(s)<180: current['topics'].append(s)
    return {'units':units,'detected':bool(units)}
def coverage(syllabus, generated_text):
    low=generated_text.lower(); rows=[]
    for unit in syllabus.get('units',[]):
        for topic in unit.get('topics',[]):
            words=[w for w in re.findall(r'\w+',topic.lower()) if len(w)>3]
            ratio=sum(w in low for w in words)/max(1,len(words)); status='covered' if ratio>=.75 else 'partial' if ratio>=.35 else 'missing'
            rows.append({'unit':unit['name'],'topic':topic,'status':status})
    return rows
