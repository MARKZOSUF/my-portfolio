from functools import lru_cache
from pydantic import AliasChoices,Field,SecretStr,model_validator
from pydantic_settings import BaseSettings,SettingsConfigDict
class Settings(BaseSettings):
 model_config=SettingsConfigDict(env_file='.env',extra='ignore')
 app_name:str='StudyForge AI API';app_env:str='development';api_v1_prefix:str='/api/v1';debug:bool=False;public_api_url:str='http://localhost:8000';mobile_deep_link_base:str='ai-notes-maker://';secret_key:SecretStr=SecretStr('development-only-secret-change-before-production-0001');data_encryption_key:SecretStr=SecretStr('development-only-encryption-key-change-me');access_token_minutes:int=Field(15,validation_alias=AliasChoices('ACCESS_TOKEN_MINUTES','ACCESS_TOKEN_EXPIRE_MINUTES'));refresh_token_days:int=Field(30,validation_alias=AliasChoices('REFRESH_TOKEN_DAYS','REFRESH_TOKEN_EXPIRE_DAYS'));reset_token_minutes:int=30;failed_login_threshold:int=5;failed_login_base_lock_seconds:int=300;failed_login_max_lock_seconds:int=86400
 database_url:str='postgresql+asyncpg://studyforge:studyforge@postgres:5432/studyforge';redis_url:str='redis://redis:6379/0';celery_broker_url:str='';celery_result_backend:str='';database_pool_size:int=10;database_max_overflow:int=20;database_pool_timeout:int=30;database_pool_recycle:int=1800;cors_origins:list[str]=Field(default_factory=lambda:['http://localhost:8081']);trusted_hosts:list[str]=Field(default_factory=lambda:['localhost','127.0.0.1','api'])
 storage_backend:str=Field('local',validation_alias=AliasChoices('STORAGE_BACKEND','STORAGE_PROVIDER'));storage_path:str='/data/storage';s3_bucket:str=Field('',validation_alias=AliasChoices('S3_BUCKET','STORAGE_BUCKET'));s3_endpoint:str=Field('',validation_alias=AliasChoices('S3_ENDPOINT','STORAGE_ENDPOINT'));s3_region:str=Field('us-east-1',validation_alias=AliasChoices('S3_REGION','STORAGE_REGION'));s3_access_key:SecretStr=Field(SecretStr(''),validation_alias=AliasChoices('S3_ACCESS_KEY','STORAGE_ACCESS_KEY'));s3_secret_key:SecretStr=Field(SecretStr(''),validation_alias=AliasChoices('S3_SECRET_KEY','STORAGE_SECRET_KEY'))
 ai_provider:str='development';ai_fallback_provider:str='';ai_base_url:str='https://api.openai.com/v1';ai_api_key:SecretStr=SecretStr('');ai_model:str='gpt-4.1-mini';ai_task_models:dict[str,str]=Field(default_factory=dict);ai_timeout_seconds:int=90;ai_daily_token_limit:int=200000;ai_monthly_token_limit:int=3000000;ai_daily_request_limit:int=500;ai_monthly_cost_limit:float=100;ai_input_cost_per_million:dict[str,float]=Field(default_factory=dict);ai_output_cost_per_million:dict[str,float]=Field(default_factory=dict);ai_allow_keyless_self_hosted:bool=False;ai_self_hosted_base_url:str='';ai_self_hosted_model:str='';ai_self_hosted_allowed_hosts:list[str]=Field(default_factory=lambda:['localhost','127.0.0.1','ollama','vllm','localai'])
 embedding_provider:str='development';embedding_base_url:str='https://api.openai.com/v1';embedding_api_key:SecretStr=SecretStr('');embedding_model:str='text-embedding-3-small';embedding_dimensions:int=1536;embedding_version:str='1'
 search_providers:list[str]=Field(default_factory=lambda:['tavily','brave','serper','wikipedia','crossref','openalex']);tavily_api_key:SecretStr=SecretStr('');brave_api_key:SecretStr=SecretStr('');serper_api_key:SecretStr=SecretStr('');crossref_mailto:str='';semantic_scholar_api_key:SecretStr=SecretStr('');search_timeout_seconds:int=20;search_retries:int=2;search_max_results:int=10;research_max_sources:int=20;research_fetch_bytes:int=2000000;research_max_searches:int=10;research_max_total_bytes:int=12000000;research_max_duration_seconds:int=900;research_source_retention_days:int=30
 email_provider:str='development';smtp_host:str='';smtp_port:int=587;smtp_username:str='';smtp_password:SecretStr=SecretStr('');smtp_use_tls:bool=True;email_from:str='';development_outbox_path:str='/data/outbox';ocr_provider:str='tesseract';ocr_endpoint:str='';ocr_api_key:SecretStr=SecretStr('');ocr_languages:str='eng+hin';ocr_min_confidence:float=.55;vision_provider:str='disabled';vision_model:str='';vision_api_key:SecretStr=SecretStr('')
 malware_scanner:str='disabled';clamav_host:str='clamav';clamav_port:int=3310;max_upload_mb:int=50;max_request_mb:int=55;max_pdf_pages:int=1000;pdf_renderer:str='platypus';pdf_require_durable_storage:bool=True;storage_signed_url_ttl_seconds:int=900;generated_file_retention_days:int=90;log_level:str='INFO';public_app_url:str='http://localhost:8081';google_auth_enabled:bool=False;google_android_client_id:str='';google_ios_client_id:str='';google_web_client_id:str='';google_client_secret:SecretStr=SecretStr('');google_issuers:list[str]=Field(default_factory=lambda:['https://accounts.google.com','accounts.google.com']);google_jwks_url:str='https://www.googleapis.com/oauth2/v3/certs';google_jwks_cache_seconds:int=3600;google_clock_skew_seconds:int=120;apple_auth_enabled:bool=False;apple_client_id:str='';apple_team_id:str='';apple_key_id:str='';apple_private_key:SecretStr=SecretStr('');allowed_mime_types:list[str]=Field(default_factory=lambda:['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/jpeg','image/png','image/webp','text/plain','text/markdown']);rate_limit_per_minute:int=120;auth_rate_limit_per_minute:int=20;rate_limit_fail_closed:bool=True;worker_eager:bool=False;worker_heartbeat_key:str='workers:heartbeat';metrics_enabled:bool=True;sentry_dsn:str='';notification_provider:str='disabled';expo_push_url:str='https://exp.host/--/api/v2/push/send'
 @property
 def is_production(self):return self.app_env=='production'
 @property
 def broker_url(self):return self.celery_broker_url or self.redis_url
 @property
 def result_backend(self):return self.celery_result_backend or self.redis_url
 @property
 def google_audiences(self):return [x for x in (self.google_android_client_id,self.google_ios_client_id,self.google_web_client_id) if x]
 @model_validator(mode='after')
 def safe(self):
  if self.embedding_dimensions!=1536:raise ValueError('Migrate vector schema before changing dimensions')
  # Production rejects development providers (AI, embeddings, email), a missing
  # malware scanner, wildcard CORS, weak or CHANGE_ME secrets, non-HTTPS URLs
  # and ephemeral PDF storage. No value is ever printed.
  if self.is_production:
   bad=[]
   if self.debug:bad.append('DEBUG')
   if self.ai_provider=='development':bad.append('production AI provider')
   if self.embedding_provider=='development':bad.append('production embeddings')
   if self.email_provider=='development':bad.append('production email')
   if self.storage_backend!='s3' or not self.s3_bucket:bad.append('S3 storage')
   if self.malware_scanner!='clamav':bad.append('ClamAV')
   if '*' in self.cors_origins or not self.cors_origins:bad.append('strict CORS')
   if self.secret_key.get_secret_value().startswith('development') or len(self.secret_key.get_secret_value())<48:bad.append('SECRET_KEY')
   if self.data_encryption_key.get_secret_value().startswith('development'):bad.append('DATA_ENCRYPTION_KEY')
   if self.ai_provider in {'ollama','vllm','localai','self-hosted'} and not self.ai_api_key.get_secret_value() and not self.ai_allow_keyless_self_hosted:bad.append('AI_ALLOW_KEYLESS_SELF_HOSTED must be explicitly enabled for keyless self-hosted AI')
   if self.pdf_require_durable_storage and self.storage_backend!='s3':bad.append('durable object storage for generated PDFs')
   if not self.public_api_url.startswith('https://'):bad.append('HTTPS PUBLIC_API_URL')
   if 'CHANGE_ME' in self.secret_key.get_secret_value() or 'CHANGE_ME' in self.data_encryption_key.get_secret_value():bad.append('placeholder CHANGE_ME secrets')
   if self.google_auth_enabled and not self.google_audiences:bad.append('GOOGLE_*_CLIENT_ID for GOOGLE_AUTH_ENABLED')
   if self.apple_auth_enabled and not self.apple_client_id:bad.append('APPLE_CLIENT_ID for APPLE_AUTH_ENABLED')
   if bad:raise ValueError('Unsafe production configuration: '+', '.join(bad))
  return self
@lru_cache
def get_settings():return Settings()
