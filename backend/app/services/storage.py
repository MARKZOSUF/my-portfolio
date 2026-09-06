import uuid
from pathlib import Path
from app.config.settings import get_settings
class LocalStorage:
 def __init__(self):self.root=Path(get_settings().storage_path);self.root.mkdir(parents=True,exist_ok=True)
 def put(self,stream,suffix):
  key=f'uploads/{uuid.uuid4().hex}{suffix.lower()}';path=self.root/key;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(stream.read());return key
 def open(self,key):
  p=(self.root/key).resolve()
  if self.root.resolve() not in p.parents:raise ValueError('Unsafe storage key')
  return p.open('rb')
 def put_bytes(self,data,key):
  path=(self.root/key)
  if self.root.resolve() not in path.resolve().parents:raise ValueError('Unsafe storage key')
  path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);return key
 def signed_url(self,key,ttl=None):
  # Local storage has no signed URLs; callers fall back to the authenticated
  # download endpoint. Production validation requires s3 for generated PDFs.
  return None
 def delete(self,key):
  p=(self.root/key).resolve()
  if self.root.resolve() not in p.parents:raise ValueError('Unsafe storage key')
  if p.exists():p.unlink()
class S3Storage:
 def __init__(self):
  import boto3
  s=get_settings();self.bucket=s.s3_bucket;self.client=boto3.client('s3',endpoint_url=s.s3_endpoint or None,aws_access_key_id=s.s3_access_key.get_secret_value() or None,aws_secret_access_key=s.s3_secret_key.get_secret_value() or None)
 def put(self,stream,suffix):key=f'uploads/{uuid.uuid4().hex}{suffix.lower()}';self.client.upload_fileobj(stream,self.bucket,key,ExtraArgs={'ServerSideEncryption':'AES256'});return key
 def open(self,key):
  import tempfile
  f=tempfile.SpooledTemporaryFile(max_size=8000000);self.client.download_fileobj(self.bucket,key,f);f.seek(0);return f
 def put_bytes(self,data,key):
  self.client.put_object(Bucket=self.bucket,Key=key,Body=data,ContentType='application/pdf',ServerSideEncryption='AES256');return key
 def signed_url(self,key,ttl=None):
  ttl=ttl or get_settings().storage_signed_url_ttl_seconds
  return self.client.generate_presigned_url('get_object',Params={'Bucket':self.bucket,'Key':key},ExpiresIn=int(ttl))
 def delete(self,key):self.client.delete_object(Bucket=self.bucket,Key=key)
def get_storage():return S3Storage() if get_settings().storage_backend=='s3' else LocalStorage()
