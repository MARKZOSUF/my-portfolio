import secrets,uuid
from datetime import datetime,timedelta,timezone
from fastapi import APIRouter,HTTPException,Request
from sqlalchemy import select,update
from app.api.deps import CurrentUser,DB
from app.config.settings import get_settings
from app.database.models import AccountSecurity,DeviceSession,OneTimeToken,Profile,SessionToken,User,UserIdentity
from app.schemas.auth import *
from app.services.audit import audit
from app.services.google_identity import GoogleIdentityError,verify_google_id_token
from app.services.auth_tokens import digest,raw_token,send_email
from app.services.security import create_access_token,hash_password,verify_password
router=APIRouter(prefix='/auth',tags=['auth']);s=get_settings();DUMMY=hash_password(secrets.token_hex(16));GENERIC='Email or password is incorrect'
def out(u,sec):return UserOut(id=str(u.id),email=u.email,display_name=u.display_name,email_verified=bool(sec and sec.email_verified_at))
async def pair(db,u,name='Mobile device',session=None,family=None):
 sec=await db.scalar(select(AccountSecurity).where(AccountSecurity.user_id==u.id));session=session or DeviceSession(user_id=u.id,device_name=name);db.add(session);await db.flush();raw=raw_token();db.add(SessionToken(session_id=session.id,user_id=u.id,family_id=family or uuid.uuid4(),token_hash=digest(raw),expires_at=datetime.now(timezone.utc)+timedelta(days=s.refresh_token_days)));return TokenPair(access_token=create_access_token(u.id),refresh_token=raw,expires_in=s.access_token_minutes*60,user=out(u,sec))
def errors(p,email):return (["Use at least 12 characters"] if len(p)<12 else [])+(["Add uppercase, lowercase, and number"] if not(any(c.isupper() for c in p) and any(c.islower() for c in p) and any(c.isdigit() for c in p)) else [])+(["Password must not contain email name"] if email.split('@')[0].lower() in p.lower() else [])
async def issue(db,user,purpose,ttl):
 now=datetime.now(timezone.utc);await db.execute(update(OneTimeToken).where(OneTimeToken.user_id==user,OneTimeToken.purpose==purpose,OneTimeToken.used_at.is_(None)).values(used_at=now));raw=raw_token();db.add(OneTimeToken(user_id=user,purpose=purpose,token_hash=digest(raw),expires_at=now+ttl));return raw
async def deliver(to,subject,url):
 try:await send_email(to,subject,url)
 except Exception:pass
@router.post('/signup',response_model=TokenPair,status_code=201)
async def signup(x:SignupIn,request:Request,db:DB):
 if errors(x.password,x.email):raise HTTPException(422,{'password':errors(x.password,x.email)})
 if await db.scalar(select(User).where(User.email==x.email.lower())):raise HTTPException(409,'Email is already registered')
 user=User(email=x.email.lower(),password_hash=hash_password(x.password),display_name=x.display_name);db.add(user);await db.flush();db.add(Profile(user_id=user.id));db.add(AccountSecurity(user_id=user.id));raw=await issue(db,user.id,'email_verify',timedelta(hours=24));tokens=await pair(db,user,x.device_name);await audit(db,'auth.signup','user',user.id,str(user.id),request);await db.commit();await deliver(user.email,'Verify your email',f'{s.mobile_deep_link_base}/verify-email?token={raw}');return tokens
@router.post('/login',response_model=TokenPair)
async def login(x:LoginIn,request:Request,db:DB):
 now=datetime.now(timezone.utc);user=await db.scalar(select(User).where(User.email==x.email.lower()))
 if not user:verify_password(x.password,DUMMY);await audit(db,'auth.login_failed','user',request=request);await db.commit();raise HTTPException(401,GENERIC)
 sec=await db.scalar(select(AccountSecurity).where(AccountSecurity.user_id==user.id).with_for_update()) or AccountSecurity(user_id=user.id);db.add(sec);valid=verify_password(x.password,user.password_hash);locked=bool(sec.locked_until and sec.locked_until>now)
 if locked or not valid:
  sec.failed_login_count+=1;sec.last_failed_login_at=now
  if sec.failed_login_count>=s.failed_login_threshold:sec.locked_until=now+timedelta(seconds=min(s.failed_login_max_lock_seconds,s.failed_login_base_lock_seconds*2**min(10,sec.failed_login_count-s.failed_login_threshold)))
  await audit(db,'auth.login_failed','user',user.id,str(user.id),request,{'count':sec.failed_login_count});await db.commit();raise HTTPException(401,GENERIC)
 if not user.is_active:raise HTTPException(401,GENERIC)
 sec.failed_login_count=0;sec.last_failed_login_at=None;sec.locked_until=None;tokens=await pair(db,user,x.device_name);await audit(db,'auth.login','user',user.id,str(user.id),request);await db.commit();return tokens
@router.post('/refresh',response_model=TokenPair)
async def refresh(x:RefreshIn,db:DB):
 token=await db.scalar(select(SessionToken).where(SessionToken.token_hash==digest(x.refresh_token)).with_for_update());now=datetime.now(timezone.utc)
 if not token:raise HTTPException(401,'Invalid refresh token')
 session=await db.get(DeviceSession,token.session_id)
 if token.rotated_at or token.revoked_at:await db.execute(update(SessionToken).where(SessionToken.family_id==token.family_id).values(revoked_at=now));session.revoked_at=now;await db.commit();raise HTTPException(401,'Refresh token replay detected; session revoked')
 if token.expires_at<=now or session.revoked_at:raise HTTPException(401,'Refresh token expired or revoked')
 token.rotated_at=now;user=await db.get(User,token.user_id);result=await pair(db,user,session.device_name,session,token.family_id);token.replaced_by_hash=digest(result.refresh_token);await db.commit();return result
@router.post('/logout',status_code=204)
async def logout(x:LogoutIn,user:CurrentUser,db:DB):
 now=datetime.now(timezone.utc)
 if x.all_devices:await db.execute(update(DeviceSession).where(DeviceSession.user_id==user.id).values(revoked_at=now));await db.execute(update(SessionToken).where(SessionToken.user_id==user.id).values(revoked_at=now))
 elif x.refresh_token:
  token=await db.scalar(select(SessionToken).where(SessionToken.user_id==user.id,SessionToken.token_hash==digest(x.refresh_token)))
  if token:token.revoked_at=now
 await db.commit()
@router.post('/forgot-password',status_code=202)
async def forgot(x:ForgotPasswordIn,db:DB):
 user=await db.scalar(select(User).where(User.email==x.email.lower()));raw=await issue(db,user.id,'password_reset',timedelta(minutes=s.reset_token_minutes)) if user else None;await db.commit()
 if user and raw:await deliver(user.email,'Reset your password',f'{s.mobile_deep_link_base}/reset-password?token={raw}')
 return {'accepted':True}
@router.get('/one-time-token/status')
async def token_status(token:str,purpose:str,db:DB):
 row=await db.scalar(select(OneTimeToken).where(OneTimeToken.token_hash==digest(token),OneTimeToken.purpose==purpose));now=datetime.now(timezone.utc);state='invalid' if not row else 'used' if row.used_at else 'expired' if row.expires_at<=now else 'valid';return {'valid':state=='valid','state':state}
@router.post('/reset-password',status_code=204)
async def reset(x:ResetPasswordIn,db:DB):
 token=await db.scalar(select(OneTimeToken).where(OneTimeToken.token_hash==digest(x.token),OneTimeToken.purpose=='password_reset').with_for_update());now=datetime.now(timezone.utc)
 if not token or token.used_at or token.expires_at<=now:raise HTTPException(400,'Reset token invalid, expired, or used')
 user=await db.get(User,token.user_id)
 if errors(x.new_password,user.email):raise HTTPException(422,{'password':errors(x.new_password,user.email)})
 token.used_at=now;user.password_hash=hash_password(x.new_password);await db.execute(update(SessionToken).where(SessionToken.user_id==user.id).values(revoked_at=now));await db.execute(update(DeviceSession).where(DeviceSession.user_id==user.id).values(revoked_at=now));await db.commit()
@router.post('/email-verification/request',status_code=202)
async def request_verify(user:CurrentUser,db:DB):
 raw=await issue(db,user.id,'email_verify',timedelta(hours=24));await db.commit();await deliver(user.email,'Verify your email',f'{s.mobile_deep_link_base}/verify-email?token={raw}');return {'accepted':True}
@router.post('/email-verification/confirm',status_code=204)
async def confirm(x:VerifyEmailIn,db:DB):
 token=await db.scalar(select(OneTimeToken).where(OneTimeToken.token_hash==digest(x.token),OneTimeToken.purpose=='email_verify').with_for_update());now=datetime.now(timezone.utc)
 if not token or token.used_at or token.expires_at<=now:raise HTTPException(400,'Verification token invalid, expired, or used')
 token.used_at=now;sec=await db.scalar(select(AccountSecurity).where(AccountSecurity.user_id==token.user_id).with_for_update());sec.email_verified_at=now;await db.commit()
@router.get('/providers',response_model=AuthProvidersOut)
async def providers():
 return AuthProvidersOut(google=bool(s.google_auth_enabled and s.google_audiences),apple=bool(s.apple_auth_enabled and s.apple_client_id),password=True)
@router.post('/google',response_model=TokenPair)
async def google_sign_in(x:GoogleAuthIn,request:Request,db:DB):
 """Exchange a verified Google ID token for a StudyForge session.

 The token signature, issuer, audience, expiry and nonce are verified against
 Google's JWKS before anything touches the database. An unverified Google
 email is rejected, so linking to an existing password account is safe.
 """
 if not s.google_auth_enabled:raise HTTPException(404,'Google sign-in is not enabled')
 try:identity=await verify_google_id_token(x.id_token,x.nonce)
 except GoogleIdentityError:
  await audit(db,'auth.google_failed','user',request=request);await db.commit();raise HTTPException(401,'Google sign-in could not be verified')
 now=datetime.now(timezone.utc)
 link=await db.scalar(select(UserIdentity).where(UserIdentity.provider=='google',UserIdentity.subject==identity.subject).with_for_update())
 created=False
 if link:
  user=await db.get(User,link.user_id)
  if user is None:raise HTTPException(401,'Google sign-in could not be verified')
 else:
  user=await db.scalar(select(User).where(User.email==identity.email))
  if user is None:
   # First Google sign-in: create a password-less account. The random hash is
   # unguessable, so /login can never authenticate this row until the user
   # sets a password through the reset flow.
   user=User(email=identity.email,password_hash=hash_password(secrets.token_urlsafe(48)),display_name=identity.display_name);db.add(user);await db.flush();db.add(Profile(user_id=user.id));db.add(AccountSecurity(user_id=user.id,email_verified_at=now));created=True
  link=UserIdentity(user_id=user.id,provider='google',subject=identity.subject,email=identity.email,email_verified=identity.email_verified);db.add(link)
 if not user.is_active:raise HTTPException(401,GENERIC)
 link.email=identity.email;link.email_verified=identity.email_verified;link.last_login_at=now
 sec=await db.scalar(select(AccountSecurity).where(AccountSecurity.user_id==user.id).with_for_update()) or AccountSecurity(user_id=user.id);db.add(sec)
 # A verified Google email verifies the StudyForge address too.
 if identity.email_verified and user.email==identity.email and not sec.email_verified_at:sec.email_verified_at=now
 sec.failed_login_count=0;sec.last_failed_login_at=None;sec.locked_until=None
 tokens=await pair(db,user,x.device_name)
 await audit(db,'auth.google_signup' if created else 'auth.google_login','user',user.id,str(user.id),request)
 await db.commit();return tokens
