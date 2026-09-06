import io,zipfile,magic
from app.config.settings import get_settings
class UnsafeDocument(ValueError):pass
def inspect(data:bytes,declared:str):
 detected=magic.from_buffer(data[:8192],mime=True) or 'application/octet-stream';office=declared.endswith(('wordprocessingml.document','presentationml.presentation')) and detected=='application/zip'
 if detected!=declared and not office and not (declared=='text/markdown' and detected=='text/plain'):raise UnsafeDocument(f'MIME mismatch: detected {detected}')
 if zipfile.is_zipfile(io.BytesIO(data)):
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   if len(z.infolist())>10000:raise UnsafeDocument('Too many archive entries')
   total=sum(x.file_size for x in z.infolist())
   if total>250_000_000 or total>max(len(data)*200,10_000_000):raise UnsafeDocument('Unsafe archive expansion')
   if any('..' in x.filename.split('/') or x.filename.startswith('/') for x in z.infolist()):raise UnsafeDocument('Unsafe archive path')
 return detected
def malware(data:bytes):
 s=get_settings()
 if s.malware_scanner=='disabled':
  if s.is_production:raise RuntimeError('Malware scanner required in production')
  return
 if s.malware_scanner!='clamav':raise RuntimeError('Unsupported malware scanner')
 import socket,struct
 with socket.create_connection((s.clamav_host,s.clamav_port),timeout=20) as sock:
  sock.sendall(b'zINSTREAM\0')
  for i in range(0,len(data),65536):b=data[i:i+65536];sock.sendall(struct.pack('!I',len(b))+b)
  sock.sendall(struct.pack('!I',0));result=sock.recv(4096).decode()
 if 'FOUND' in result:raise UnsafeDocument('Malware detected')
 if 'OK' not in result:raise RuntimeError('Malware scan failed')
