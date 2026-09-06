import hashlib,secrets
from datetime import datetime,timedelta,timezone
from pathlib import Path
from app.config.settings import get_settings
def digest(v):return hashlib.sha256(v.encode()).hexdigest()
def raw_token():return secrets.token_urlsafe(48)
async def send_email(to,subject,body):
 s=get_settings()
 if s.email_provider=='development':
  p=Path(s.development_outbox_path);p.mkdir(parents=True,exist_ok=True);(p/f'{secrets.token_hex(8)}.txt').write_text(f'To: {to}\nSubject: {subject}\n\n{body}')
  return
 if s.email_provider=='smtp':
  import aiosmtplib
  from email.message import EmailMessage
  m=EmailMessage();m['From']=s.email_from;m['To']=to;m['Subject']=subject;m.set_content(body);await aiosmtplib.send(m,hostname=s.smtp_host,port=s.smtp_port,username=s.smtp_username,password=s.smtp_password.get_secret_value(),start_tls=s.smtp_use_tls)
  return
 raise RuntimeError('Email provider not configured')
