from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import pyotp
import qrcode
import io
import base64
from datetime import datetime
import jwt
import os

# Configuration JWT
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
security = HTTPBearer()

# MongoDB (sera importé depuis server.py lors de l'inclusion du router)
users_collection = None

def init_db(db):
    """Initialiser la connexion à la base de données"""
    global users_collection
    users_collection = db.users

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Obtenir l'utilisateur actuel depuis le token JWT"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        
        user = await users_collection.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

router = APIRouter()

class Enable2FAResponse(BaseModel):
    qr_code: str
    secret: str

class Verify2FARequest(BaseModel):
    code: str

class Verify2FAResponse(BaseModel):
    success: bool
    message: str

@router.get("/2fa/status")
async def get_2fa_status(current_user: dict = Depends(get_current_user)):
    """Obtenir le statut de la 2FA pour l'utilisateur"""
    return {
        "enabled": current_user.get("two_factor_enabled", False)
    }

@router.post("/2fa/enable", response_model=Enable2FAResponse)
async def enable_2fa(current_user: dict = Depends(get_current_user)):
    """Générer un secret et un QR code pour activer la 2FA"""
    
    # Vérifier si déjà activé
    if current_user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA déjà activée")
    
    # Générer un secret
    secret = pyotp.random_base32()
    
    # Créer l'URL TOTP
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user["email"],
        issuer_name="SW STREAMING"
    )
    
    # Générer le QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convertir en base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    qr_code_data_url = f"data:image/png;base64,{qr_code_base64}"
    
    # Sauvegarder temporairement le secret (non activé)
    await users_collection.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "two_factor_secret": secret,
                "two_factor_enabled": False,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return Enable2FAResponse(
        qr_code=qr_code_data_url,
        secret=secret
    )

@router.post("/2fa/verify", response_model=Verify2FAResponse)
async def verify_2fa(
    request: Verify2FARequest,
    current_user: dict = Depends(get_current_user)
):
    """Vérifier le code 2FA et activer la fonctionnalité"""
    
    # Récupérer le secret temporaire
    secret = current_user.get("two_factor_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Aucun secret 2FA trouvé. Veuillez d'abord activer la 2FA.")
    
    # Vérifier le code
    totp = pyotp.TOTP(secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Code invalide")
    
    # Activer la 2FA
    await users_collection.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "two_factor_enabled": True,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return Verify2FAResponse(
        success=True,
        message="2FA activée avec succès"
    )

@router.post("/2fa/disable")
async def disable_2fa(current_user: dict = Depends(get_current_user)):
    """Désactiver la 2FA"""
    
    if not current_user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA n'est pas activée")
    
    # Désactiver et supprimer le secret
    await users_collection.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "two_factor_enabled": False,
                "updated_at": datetime.utcnow()
            },
            "$unset": {
                "two_factor_secret": ""
            }
        }
    )
    
    return {"success": True, "message": "2FA désactivée"}

@router.post("/2fa/validate")
async def validate_2fa_code(
    request: Verify2FARequest,
    current_user: dict = Depends(get_current_user)
):
    """Valider un code 2FA (utilisé lors de la connexion)"""
    
    if not current_user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA n'est pas activée")
    
    secret = current_user.get("two_factor_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="Secret 2FA manquant")
    
    # Vérifier le code
    totp = pyotp.TOTP(secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Code invalide")
    
    return {"success": True, "message": "Code valide"}
