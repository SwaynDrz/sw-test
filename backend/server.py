from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import jwt
from passlib.context import CryptContext
import subprocess
import shutil
from discord_service import update_discord_stats

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection avec pool de connexions optimisé
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=100,  # 100 connexions max dans le pool
    minPoolSize=10,   # 10 connexions toujours prêtes
    maxIdleTimeMS=30000,  # Fermer les connexions inactives après 30s
    connectTimeoutMS=5000,  # Timeout de connexion 5s
    serverSelectionTimeoutMS=5000  # Timeout de sélection serveur 5s
)
db = client[os.environ['DB_NAME']]

# TMDB Configuration
TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '')
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original"

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== Auth Models =====
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    password_hash: str
    role: str = "user"  # user, admin, super_admin, co_fondateur, fondateur
    subscription: str = "gratuit"  # gratuit, premium, vip
    subscription_date: Optional[datetime] = None  # Date d'attribution de l'abonnement
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    two_factor_code: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str
    subscription: str = "gratuit"
    subscription_date: Optional[str] = None
    created_at: Optional[str] = None

# ===== Auth Functions =====
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expiré")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non trouvé")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

async def get_current_admin(current_user: User = Depends(get_current_user)):
    allowed_roles = ["admin", "super_admin", "co_fondateur", "fondateur"]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé. Administrateurs uniquement.")
    return current_user

async def get_current_super_user(current_user: User = Depends(get_current_user)):
    """Vérifie si l'utilisateur est Fondateur, Co-Fondateur ou Super Admin"""
    allowed_roles = ["super_admin", "co_fondateur", "fondateur"]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé. Permissions insuffisantes.")
    return current_user

async def get_current_founder(current_user: User = Depends(get_current_user)):
    """Vérifie si l'utilisateur est Fondateur uniquement"""
    if current_user.role != "fondateur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé. Seul le fondateur peut effectuer cette action.")
    return current_user

# ===== Auth Routes =====
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")
    
    # Automatically set fondateur role for specific email
    user_role = "fondateur" if user_data.email == "swayn@gmail.com" else "user"
    
    # Create user with default gratuit subscription
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role=user_role,
        subscription="gratuit"
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    # Create token with user info
    access_token = create_access_token(data={
        "sub": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "subscription": user.subscription
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role,
            "subscription": user.subscription,
            "subscription_date": user.subscription_date.isoformat() if user.subscription_date else None,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Vérifier si l'utilisateur a la 2FA activée
    if user.get('two_factor_enabled'):
        # Si l'utilisateur a la 2FA mais n'a pas fourni le code
        if not credentials.two_factor_code:
            return {
                "requires_2fa": True,
                "message": "Code 2FA requis"
            }
        
        # Vérifier le code 2FA
        import pyotp
        secret = user.get('two_factor_secret')
        if not secret:
            raise HTTPException(status_code=500, detail="Erreur de configuration 2FA")
        
        totp = pyotp.TOTP(secret)
        if not totp.verify(credentials.two_factor_code, valid_window=1):
            raise HTTPException(status_code=401, detail="Code 2FA invalide")
    
    # Create token with user info
    access_token = create_access_token(data={
        "sub": user['id'],
        "email": user['email'],
        "username": user['username'],
        "role": user['role'],
        "subscription": user.get('subscription', 'gratuit')
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "email": user['email'],
            "username": user['username'],
            "role": user['role'],
            "subscription": user.get('subscription', 'gratuit'),
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        role=current_user.role,
        subscription=current_user.subscription,
        subscription_date=current_user.subscription_date.isoformat() if current_user.subscription_date else None,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None
    )

@api_router.put("/auth/update-username")
async def update_username(username: str, current_user: User = Depends(get_current_user)):
    # Vérifier si le username est déjà pris
    existing = await db.users.find_one({"username": username, "id": {"$ne": current_user.id}})
    if existing:
        raise HTTPException(status_code=400, detail="Ce pseudo est déjà pris")
    
    result = await db.users.update_one({"id": current_user.id}, {"$set": {"username": username}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": "Pseudo mis à jour avec succès"}

# ===== Models =====
class Movie(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tmdb_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    logo_url: Optional[str] = None  # Logo officiel du film
    video_url: str
    genres: List[str] = []
    release_year: Optional[int] = None
    duration: Optional[int] = None
    rating: Optional[float] = None
    director: Optional[str] = None
    director_photo: Optional[str] = None
    cast: List[dict] = []
    available: Optional[bool] = True  # Disponibilité du film
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MovieCreate(BaseModel):
    tmdb_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    logo_url: Optional[str] = None  # Logo officiel
    video_url: str
    genres: List[str] = []
    release_year: Optional[int] = None
    duration: Optional[int] = None
    rating: Optional[float] = None
    director: Optional[str] = None
    director_photo: Optional[str] = None
    cast: List[dict] = []

class MovieUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    video_url: Optional[str] = None
    genres: Optional[List[str]] = None
    release_year: Optional[int] = None
    duration: Optional[int] = None
    rating: Optional[float] = None

class Series(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tmdb_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    logo_url: Optional[str] = None  # Logo officiel de la série
    genres: List[str] = []
    release_year: Optional[int] = None
    rating: Optional[float] = None
    total_seasons: Optional[int] = None
    creator: Optional[str] = None
    creator_photo: Optional[str] = None
    cast: List[dict] = []
    available: Optional[bool] = True  # Disponibilité de la série
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SeriesCreate(BaseModel):
    tmdb_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    logo_url: Optional[str] = None  # Logo officiel
    genres: List[str] = []
    release_year: Optional[int] = None
    rating: Optional[float] = None
    total_seasons: Optional[int] = None
    creator: Optional[str] = None
    creator_photo: Optional[str] = None
    cast: List[dict] = []

class SeriesUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    genres: Optional[List[str]] = None
    release_year: Optional[int] = None
    rating: Optional[float] = None
    total_seasons: Optional[int] = None

class Episode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    series_id: str
    tmdb_id: Optional[int] = None
    season_number: int
    episode_number: int
    title: str
    description: Optional[str] = None
    still_url: Optional[str] = None
    video_url: str
    duration: Optional[int] = None
    air_date: Optional[str] = None
    available: Optional[bool] = True  # Disponibilité de l'épisode
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EpisodeCreate(BaseModel):
    series_id: str
    tmdb_id: Optional[int] = None
    season_number: int
    episode_number: int
    title: str
    description: Optional[str] = None
    still_url: Optional[str] = None
    video_url: str
    duration: Optional[int] = None
    air_date: Optional[str] = None

class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    still_url: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[int] = None
    air_date: Optional[str] = None

class TMDBImportRequest(BaseModel):
    tmdb_id: int
    video_url: str

# ===== Settings Models =====
class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="app_settings")  # ID fixe pour un seul document
    series_free_access: bool = False  # Les séries sont-elles accessibles aux membres gratuits?
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = None  # ID de l'utilisateur qui a fait la dernière modification

class SeriesAccessToggleResponse(BaseModel):
    series_free_access: bool
    message: str


# ===== URL Migration Models =====
class URLMigrationPreview(BaseModel):
    old_pattern: str
    new_pattern: str

class URLMigrationPreviewResponse(BaseModel):
    movies_count: int
    episodes_count: int
    total_count: int
    old_pattern: str
    new_pattern: str
    sample_movies: List[dict] = []
    sample_episodes: List[dict] = []

class URLMigrationExecute(BaseModel):
    old_pattern: str
    new_pattern: str

class URLMigrationExecuteResponse(BaseModel):
    movies_updated: int
    episodes_updated: int
    total_updated: int
    message: str

# ===== TMDB Integration =====
async def fetch_tmdb_movie(tmdb_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TMDB_BASE_URL}/movie/{tmdb_id}",
            params={"api_key": TMDB_API_KEY, "language": "fr-FR"}
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=404, detail="Film non trouvé sur TMDB")

async def fetch_tmdb_logo(tmdb_id: int, media_type: str = "movie"):
    """Récupérer le logo officiel depuis TMDB images"""
    async with httpx.AsyncClient() as client:
        endpoint = f"{TMDB_BASE_URL}/{media_type}/{tmdb_id}/images"
        response = await client.get(
            endpoint,
            params={"api_key": TMDB_API_KEY}
        )
        if response.status_code == 200:
            data = response.json()
            logos = data.get('logos', [])
            # Prioriser les logos en français, sinon anglais, sinon le premier
            for logo in logos:
                if logo.get('iso_639_1') == 'fr':
                    return f"{TMDB_IMAGE_BASE}{logo['file_path']}"
            for logo in logos:
                if logo.get('iso_639_1') == 'en':
                    return f"{TMDB_IMAGE_BASE}{logo['file_path']}"
            if logos:
                return f"{TMDB_IMAGE_BASE}{logos[0]['file_path']}"
        return None

async def fetch_tmdb_movie_credits(tmdb_id: int):
    """Récupérer les crédits (réalisateur et acteurs) d'un film depuis TMDB"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TMDB_BASE_URL}/movie/{tmdb_id}/credits",
            params={"api_key": TMDB_API_KEY, "language": "fr-FR"}
        )
        if response.status_code == 200:
            data = response.json()
            credits = {
                "director": None,
                "director_photo": None,
                "cast": []
            }
            
            # Récupérer le réalisateur
            crew = data.get('crew', [])
            for member in crew:
                if member.get('job') == 'Director':
                    credits['director'] = member.get('name')
                    if member.get('profile_path'):
                        credits['director_photo'] = f"https://image.tmdb.org/t/p/w185{member['profile_path']}"
                    break
            
            # Récupérer les acteurs principaux (top 6)
            cast = data.get('cast', [])
            for actor in cast[:6]:
                credits['cast'].append({
                    'name': actor.get('name', ''),
                    'character': actor.get('character', ''),
                    'photo': f"https://image.tmdb.org/t/p/w185{actor['profile_path']}" if actor.get('profile_path') else None
                })
            
            return credits
        return {"director": None, "director_photo": None, "cast": []}

async def fetch_tmdb_series(tmdb_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TMDB_BASE_URL}/tv/{tmdb_id}",
            params={"api_key": TMDB_API_KEY, "language": "fr-FR"}
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=404, detail="Série non trouvée sur TMDB")

async def fetch_tmdb_series_credits(tmdb_id: int):
    """Récupérer les crédits (créateur et acteurs) d'une série depuis TMDB"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TMDB_BASE_URL}/tv/{tmdb_id}/credits",
            params={"api_key": TMDB_API_KEY, "language": "fr-FR"}
        )
        if response.status_code == 200:
            data = response.json()
            credits = {
                "creator": None,
                "creator_photo": None,
                "cast": []
            }
            
            # Récupérer les acteurs principaux (top 6)
            cast = data.get('cast', [])
            for actor in cast[:6]:
                credits['cast'].append({
                    'name': actor.get('name', ''),
                    'character': actor.get('character', ''),
                    'photo': f"https://image.tmdb.org/t/p/w185{actor['profile_path']}" if actor.get('profile_path') else None
                })
            
            return credits
        return {"creator": None, "creator_photo": None, "cast": []}

async def fetch_tmdb_episode(series_id: int, season: int, episode: int):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TMDB_BASE_URL}/tv/{series_id}/season/{season}/episode/{episode}",
            params={"api_key": TMDB_API_KEY, "language": "fr-FR"}
        )
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=404, detail="Épisode non trouvé sur TMDB")

# ===== Movies Routes =====
@api_router.get("/movies")
async def get_movies(
    page: int = 1,
    per_page: int = 20,
    search: str = None,
    genre: str = None
):
    # Construire le filtre
    filter_query = {}
    
    if search:
        filter_query["title"] = {"$regex": search, "$options": "i"}
    
    if genre and genre != "all":
        filter_query["genres"] = genre
    
    # Compter le total
    total = await db.movies.count_documents(filter_query)
    
    # Pagination
    skip = (page - 1) * per_page
    
    # Récupérer les films de la page
    movies = await db.movies.find(
        filter_query, 
        {"_id": 0}
    ).skip(skip).limit(per_page).to_list(per_page)
    
    for movie in movies:
        if isinstance(movie.get('created_at'), str):
            movie['created_at'] = datetime.fromisoformat(movie['created_at'])
    
    return {
        "movies": movies,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@api_router.get("/movies/{movie_id}", response_model=Movie)
async def get_movie(movie_id: str):
    movie = await db.movies.find_one({"id": movie_id}, {"_id": 0})
    if not movie:
        raise HTTPException(status_code=404, detail="Film non trouvé")
    if isinstance(movie.get('created_at'), str):
        movie['created_at'] = datetime.fromisoformat(movie['created_at'])
    return movie

@api_router.post("/movies", response_model=Movie)
async def create_movie(movie: MovieCreate, background_tasks: BackgroundTasks, current_admin: User = Depends(get_current_admin)):
    movie_obj = Movie(**movie.model_dump())
    doc = movie_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.movies.insert_one(doc)
    
    # Ajouter aux films récents
    await add_to_recent("movies", movie_obj.id)
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return movie_obj

@api_router.put("/movies/{movie_id}", response_model=Movie)
async def update_movie(movie_id: str, movie_update: MovieUpdate, current_admin: User = Depends(get_current_admin)):
    update_data = {k: v for k, v in movie_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = await db.movies.update_one({"id": movie_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Film non trouvé")
    
    return await get_movie(movie_id)

@api_router.delete("/movies/{movie_id}")
async def delete_movie(movie_id: str, background_tasks: BackgroundTasks, current_super_user: User = Depends(get_current_super_user)):
    result = await db.movies.delete_one({"id": movie_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Film non trouvé")
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return {"message": "Film supprimé"}

@api_router.patch("/movies/{movie_id}/availability")
async def toggle_movie_availability(movie_id: str, current_admin: User = Depends(get_current_admin)):
    """Toggle la disponibilité d'un film"""
    movie = await db.movies.find_one({"id": movie_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Film non trouvé")
    
    # Toggle la disponibilité (par défaut true si le champ n'existe pas)
    new_availability = not movie.get("available", True)
    
    await db.movies.update_one(
        {"id": movie_id},
        {"$set": {"available": new_availability}}
    )
    
    return {
        "message": f"Film {'rendu disponible' if new_availability else 'masqué'}",
        "available": new_availability
    }

@api_router.post("/movies/import-tmdb", response_model=Movie)
async def import_movie_from_tmdb(request: TMDBImportRequest, background_tasks: BackgroundTasks, current_admin: User = Depends(get_current_admin)):
    tmdb_data = await fetch_tmdb_movie(request.tmdb_id)
    
    # Récupérer les crédits (réalisateur et acteurs)
    credits = await fetch_tmdb_movie_credits(request.tmdb_id)
    
    # Récupérer le logo officiel
    logo_url = await fetch_tmdb_logo(request.tmdb_id, "movie")
    
    movie_data = MovieCreate(
        tmdb_id=request.tmdb_id,
        title=tmdb_data.get('title', ''),
        description=tmdb_data.get('overview', ''),
        poster_url=f"{TMDB_IMAGE_BASE}{tmdb_data.get('poster_path', '')}" if tmdb_data.get('poster_path') else None,
        backdrop_url=f"{TMDB_IMAGE_BASE}{tmdb_data.get('backdrop_path', '')}" if tmdb_data.get('backdrop_path') else None,
        logo_url=logo_url,  # Logo officiel
        video_url=request.video_url,
        genres=[g['name'] for g in tmdb_data.get('genres', [])],
        release_year=int(tmdb_data.get('release_date', '0000')[:4]) if tmdb_data.get('release_date') else None,
        duration=tmdb_data.get('runtime'),
        rating=round(tmdb_data.get('vote_average', 0), 1),
        director=credits.get('director'),
        director_photo=credits.get('director_photo'),
        cast=credits.get('cast', [])
    )
    
    # Créer le film directement (même logique que create_movie)
    movie_obj = Movie(**movie_data.model_dump())
    doc = movie_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.movies.insert_one(doc)
    
    # Ajouter aux films récents
    await add_to_recent("movies", movie_obj.id)
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return movie_obj

# ===== Series Routes =====
@api_router.get("/series")
async def get_series(
    page: int = 1,
    per_page: int = 20,
    search: str = None,
    genre: str = None
):
    # Construire le filtre
    filter_query = {}
    
    if search:
        filter_query["title"] = {"$regex": search, "$options": "i"}
    
    if genre and genre != "all":
        filter_query["genres"] = genre
    
    # Compter le total
    total = await db.series.count_documents(filter_query)
    
    # Pagination
    skip = (page - 1) * per_page
    
    # Récupérer les séries de la page
    series = await db.series.find(
        filter_query,
        {"_id": 0}
    ).skip(skip).limit(per_page).to_list(per_page)
    
    for s in series:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    
    return {
        "series": series,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@api_router.get("/series/{series_id}", response_model=Series)
async def get_series_by_id(series_id: str):
    series = await db.series.find_one({"id": series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    if isinstance(series.get('created_at'), str):
        series['created_at'] = datetime.fromisoformat(series['created_at'])
    return series

@api_router.post("/series", response_model=Series)
async def create_series(series: SeriesCreate, background_tasks: BackgroundTasks, current_admin: User = Depends(get_current_admin)):
    series_obj = Series(**series.model_dump())
    doc = series_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.series.insert_one(doc)
    
    # Ajouter aux séries récentes
    await add_to_recent("series", series_obj.id)
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return series_obj

@api_router.put("/series/{series_id}", response_model=Series)
async def update_series(series_id: str, series_update: SeriesUpdate, current_admin: User = Depends(get_current_admin)):
    update_data = {k: v for k, v in series_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = await db.series.update_one({"id": series_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    
    return await get_series_by_id(series_id)

@api_router.delete("/series/{series_id}")
async def delete_series(series_id: str, background_tasks: BackgroundTasks, current_super_user: User = Depends(get_current_super_user)):
    result = await db.series.delete_one({"id": series_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    await db.episodes.delete_many({"series_id": series_id})
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return {"message": "Série et épisodes supprimés"}

@api_router.patch("/series/{series_id}/availability")
async def toggle_series_availability(series_id: str, current_admin: User = Depends(get_current_admin)):
    """Toggle la disponibilité d'une série"""
    series = await db.series.find_one({"id": series_id})
    if not series:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    
    # Toggle la disponibilité
    new_availability = not series.get("available", True)
    
    await db.series.update_one(
        {"id": series_id},
        {"$set": {"available": new_availability}}
    )
    
    return {
        "message": f"Série {'rendue disponible' if new_availability else 'masquée'}",
        "available": new_availability
    }

@api_router.post("/series/import-tmdb", response_model=Series)
async def import_series_from_tmdb(request: TMDBImportRequest, background_tasks: BackgroundTasks, current_admin: User = Depends(get_current_admin)):
    tmdb_data = await fetch_tmdb_series(request.tmdb_id)
    
    # Récupérer les crédits (créateur et acteurs)
    credits = await fetch_tmdb_series_credits(request.tmdb_id)
    
    # Récupérer le logo officiel
    logo_url = await fetch_tmdb_logo(request.tmdb_id, "tv")
    
    # Récupérer le créateur depuis les données de la série
    creator = None
    creator_photo = None
    if tmdb_data.get('created_by') and len(tmdb_data['created_by']) > 0:
        creator = tmdb_data['created_by'][0].get('name')
        if tmdb_data['created_by'][0].get('profile_path'):
            creator_photo = f"https://image.tmdb.org/t/p/w185{tmdb_data['created_by'][0]['profile_path']}"
    
    series_data = SeriesCreate(
        tmdb_id=request.tmdb_id,
        title=tmdb_data.get('name', ''),
        description=tmdb_data.get('overview', ''),
        poster_url=f"{TMDB_IMAGE_BASE}{tmdb_data.get('poster_path', '')}" if tmdb_data.get('poster_path') else None,
        backdrop_url=f"{TMDB_IMAGE_BASE}{tmdb_data.get('backdrop_path', '')}" if tmdb_data.get('backdrop_path') else None,
        logo_url=logo_url,  # Logo officiel
        genres=[g['name'] for g in tmdb_data.get('genres', [])],
        release_year=int(tmdb_data.get('first_air_date', '0000')[:4]) if tmdb_data.get('first_air_date') else None,
        rating=round(tmdb_data.get('vote_average', 0), 1),
        total_seasons=tmdb_data.get('number_of_seasons'),
        creator=creator,
        creator_photo=creator_photo,
        cast=credits.get('cast', [])
    )
    
    # Créer la série directement (même logique que create_series)
    series_obj = Series(**series_data.model_dump())
    doc = series_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.series.insert_one(doc)
    
    # Ajouter aux séries récentes
    await add_to_recent("series", series_obj.id)
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return series_obj

# ===== Episodes Routes =====
@api_router.get("/episodes")
async def get_episodes(
    series_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    season: int = None
):
    # Construire le filtre
    filter_query = {}
    if series_id:
        filter_query["series_id"] = series_id
    if season:
        filter_query["season_number"] = season
    
    # Compter le total
    total = await db.episodes.count_documents(filter_query)
    
    # Pagination
    skip = (page - 1) * per_page
    
    # Récupérer les épisodes
    episodes = await db.episodes.find(
        filter_query,
        {"_id": 0}
    ).sort([("season_number", 1), ("episode_number", 1)]).skip(skip).limit(per_page).to_list(per_page)
    
    for ep in episodes:
        if isinstance(ep.get('created_at'), str):
            ep['created_at'] = datetime.fromisoformat(ep['created_at'])
    
    return {
        "episodes": episodes,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@api_router.get("/episodes/{episode_id}", response_model=Episode)
async def get_episode(episode_id: str):
    episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Épisode non trouvé")
    if isinstance(episode.get('created_at'), str):
        episode['created_at'] = datetime.fromisoformat(episode['created_at'])
    return episode

@api_router.post("/episodes", response_model=Episode)
async def create_episode(episode: EpisodeCreate, background_tasks: BackgroundTasks, current_admin: User = Depends(get_current_admin)):
    series = await db.series.find_one({"id": episode.series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    
    episode_obj = Episode(**episode.model_dump())
    doc = episode_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.episodes.insert_one(doc)
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return episode_obj

@api_router.put("/episodes/{episode_id}", response_model=Episode)
async def update_episode(episode_id: str, episode_update: EpisodeUpdate, current_admin: User = Depends(get_current_admin)):
    update_data = {k: v for k, v in episode_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    result = await db.episodes.update_one({"id": episode_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Épisode non trouvé")
    
    return await get_episode(episode_id)

@api_router.delete("/episodes/{episode_id}")
async def delete_episode(episode_id: str, background_tasks: BackgroundTasks, current_super_user: User = Depends(get_current_super_user)):
    result = await db.episodes.delete_one({"id": episode_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Épisode non trouvé")
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return {"message": "Épisode supprimé"}

@api_router.patch("/episodes/{episode_id}/availability")
async def toggle_episode_availability(episode_id: str, current_admin: User = Depends(get_current_admin)):
    """Toggle la disponibilité d'un épisode"""
    episode = await db.episodes.find_one({"id": episode_id})
    if not episode:
        raise HTTPException(status_code=404, detail="Épisode non trouvé")
    
    # Toggle la disponibilité
    new_availability = not episode.get("available", True)
    
    await db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"available": new_availability}}
    )
    
    return {
        "message": f"Épisode {'rendu disponible' if new_availability else 'masqué'}",
        "available": new_availability
    }

@api_router.patch("/series/{series_id}/season/{season_number}/availability")
async def toggle_season_availability(series_id: str, season_number: int, current_admin: User = Depends(get_current_admin)):
    """Toggle la disponibilité d'une saison entière"""
    # Vérifier que la série existe
    series = await db.series.find_one({"id": series_id})
    if not series:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    
    # Récupérer tous les épisodes de cette saison
    episodes = await db.episodes.find({"series_id": series_id, "season_number": season_number}).to_list(None)
    if not episodes:
        raise HTTPException(status_code=404, detail="Aucun épisode trouvé pour cette saison")
    
    # Toggle la disponibilité (basé sur le premier épisode)
    new_availability = not episodes[0].get("available", True)
    
    # Mettre à jour tous les épisodes de la saison
    await db.episodes.update_many(
        {"series_id": series_id, "season_number": season_number},
        {"$set": {"available": new_availability}}
    )
    
    return {
        "message": f"Saison {season_number} {'rendue disponible' if new_availability else 'masquée'}",
        "available": new_availability,
        "episodes_updated": len(episodes)
    }

class EpisodeTMDBImport(BaseModel):
    series_id: str
    tmdb_series_id: int
    season_number: int
    episode_number: int
    video_url: str

@api_router.post("/episodes/import-tmdb", response_model=Episode)
async def import_episode_from_tmdb(request: EpisodeTMDBImport, background_tasks: BackgroundTasks, current_admin: User = Depends(get_current_admin)):
    tmdb_data = await fetch_tmdb_episode(request.tmdb_series_id, request.season_number, request.episode_number)
    
    episode_data = EpisodeCreate(
        series_id=request.series_id,
        tmdb_id=tmdb_data.get('id'),
        season_number=request.season_number,
        episode_number=request.episode_number,
        title=tmdb_data.get('name', ''),
        description=tmdb_data.get('overview', ''),
        still_url=f"{TMDB_IMAGE_BASE}{tmdb_data.get('still_path', '')}" if tmdb_data.get('still_path') else None,
        video_url=request.video_url,
        duration=tmdb_data.get('runtime'),
        air_date=tmdb_data.get('air_date')
    )
    
    # Créer l'épisode directement (même logique que create_episode)
    # Vérifier que la série existe
    series = await db.series.find_one({"id": episode_data.series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Série non trouvée")
    
    episode_obj = Episode(**episode_data.model_dump())
    doc = episode_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.episodes.insert_one(doc)
    
    # Mettre à jour les statistiques Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return episode_obj

# ===== Featured Content =====
@api_router.get("/featured")
async def get_featured():
    # Get last 10 movies sorted by creation date (newest first)
    movies = await db.movies.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Get last 10 series sorted by creation date (newest first)
    series = await db.series.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Convertir les dates et ajouter created_at pour les anciens contenus
    for item in movies + series:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        elif not item.get('created_at'):
            # Si pas de created_at, utiliser la date actuelle (pour les anciens contenus)
            item['created_at'] = datetime.now(timezone.utc)
    
    return {"movies": movies, "series": series}

# ===== Admin Statistics =====
@api_router.get("/admin/stats")
async def get_admin_stats(current_admin: User = Depends(get_current_admin)):
    movies_count = await db.movies.count_documents({})
    series_count = await db.series.count_documents({})
    episodes_count = await db.episodes.count_documents({})
    users_count = await db.users.count_documents({})
    
    return {
        "movies": movies_count,
        "series": series_count,
        "episodes": episodes_count,
        "users": users_count
    }


@api_router.post("/admin/update-discord-stats")
async def force_update_discord_stats(background_tasks: BackgroundTasks, current_admin: User = Depends(get_current_admin)):
    """
    Force la mise à jour des statistiques Discord
    Utilisé pour synchroniser manuellement les canaux Discord avec la base de données
    """
    # Compter les films et séries actuellement dans la base
    movies_count = await db.movies.count_documents({})
    series_count = await db.series.count_documents({})
    
    # Lancer la mise à jour Discord en arrière-plan
    background_tasks.add_task(update_discord_stats)
    
    return {
        "success": True,
        "message": "Mise à jour Discord lancée",
        "stats": {
            "movies": movies_count,
            "series": series_count
        }
    }


# ===== NOUVEAUX ENDPOINTS POUR CONTENUS RÉCENTS =====
@api_router.get("/recent-movies")
async def get_recent_movies(limit: int = 10):
    """
    Récupère les films récents depuis la collection recent_content
    Optimisé avec une seule requête MongoDB
    """
    try:
        # Récupérer les IDs des films récents
        recent_doc = await db.recent_content.find_one({"type": "movies"})
        
        if not recent_doc or "items" not in recent_doc:
            return {"success": True, "movies": [], "count": 0}
        
        movie_ids = recent_doc["items"][:limit]
        
        # Récupérer tous les films en UNE SEULE requête (optimisé)
        movies = await db.movies.find(
            {"id": {"$in": movie_ids}},
            {"_id": 0}
        ).to_list(None)
        
        # Réordonner selon l'ordre des IDs
        movies_dict = {movie["id"]: movie for movie in movies}
        ordered_movies = [movies_dict[movie_id] for movie_id in movie_ids if movie_id in movies_dict]
        
        return {"success": True, "movies": ordered_movies, "count": len(ordered_movies)}
    except Exception as e:
        logging.error(f"Erreur get_recent_movies: {e}")
        return {"success": False, "movies": [], "count": 0, "error": str(e)}

@api_router.get("/recent-series")
async def get_recent_series(limit: int = 10):
    """
    Récupère les séries récentes depuis la collection recent_content
    Optimisé avec une seule requête MongoDB
    """
    try:
        # Récupérer les IDs des séries récentes
        recent_doc = await db.recent_content.find_one({"type": "series"})
        
        if not recent_doc or "items" not in recent_doc:
            return {"success": True, "series": [], "count": 0}
        
        series_ids = recent_doc["items"][:limit]
        
        # Récupérer toutes les séries en UNE SEULE requête (optimisé)
        series = await db.series.find(
            {"id": {"$in": series_ids}},
            {"_id": 0}
        ).to_list(None)
        
        # Réordonner selon l'ordre des IDs
        series_dict = {s["id"]: s for s in series}
        ordered_series = [series_dict[series_id] for series_id in series_ids if series_id in series_dict]
        
        return {"success": True, "series": ordered_series, "count": len(ordered_series)}
    except Exception as e:
        logging.error(f"Erreur get_recent_series: {e}")
        return {"success": False, "series": [], "count": 0, "error": str(e)}


@api_router.get("/horror-movies")
async def get_horror_movies(limit: int = 999):
    """
    Récupère TOUS les films d'horreur depuis la base de données
    Filtre par genre "Horror" ou "Horreur"
    """
    try:
        # Récupérer TOUS les films qui ont "Horror" ou "Horreur" dans leurs genres
        horror_movies = await db.movies.find(
            {
                "$or": [
                    {"genres": {"$in": ["Horror", "Horreur"]}},
                    {"genres": {"$regex": "horror", "$options": "i"}}
                ]
            },
            {"_id": 0}
        ).sort("release_year", -1).limit(limit).to_list(None)
        
        return {"success": True, "movies": horror_movies, "count": len(horror_movies)}
    except Exception as e:
        logging.error(f"Erreur get_horror_movies: {e}")
        return {"success": False, "movies": [], "count": 0, "error": str(e)}


# ===== ENDPOINTS TOP 10 =====
@api_router.get("/top-movies")
async def get_top_movies(limit: int = 10):
    """
    Récupère le top 10 des films avec les meilleures notes TMDB
    Triés par rating décroissant
    """
    try:
        movies = await db.movies.find(
            {"rating": {"$exists": True, "$ne": None}},
            {"_id": 0}
        ).sort("rating", -1).limit(limit).to_list(None)
        
        return {"success": True, "movies": movies, "count": len(movies)}
    except Exception as e:
        logging.error(f"Erreur get_top_movies: {e}")
        return {"success": False, "movies": [], "count": 0}


@api_router.get("/top-series")
async def get_top_series(limit: int = 10):
    """
    Récupère le top 10 des séries avec les meilleures notes TMDB
    Triés par rating décroissant
    """
    try:
        series = await db.series.find(
            {"rating": {"$exists": True, "$ne": None}},
            {"_id": 0}
        ).sort("rating", -1).limit(limit).to_list(None)
        
        return {"success": True, "series": series, "count": len(series)}
    except Exception as e:
        logging.error(f"Erreur get_top_series: {e}")
        return {"success": False, "series": [], "count": 0}


async def add_to_recent(content_type: str, content_id: str, max_items: int = 10):
    """
    Ajoute un film ou série aux récents
    content_type: 'movies' ou 'series'
    content_id: ID du contenu
    max_items: nombre max d'éléments à garder (par défaut 10)
    """
    try:
        # Récupérer le document des récents
        recent_doc = await db.recent_content.find_one({"type": content_type})
        
        if not recent_doc:
            # Créer le document s'il n'existe pas
            await db.recent_content.insert_one({
                "type": content_type,
                "items": [content_id]
            })
        else:
            # Récupérer la liste actuelle
            items = recent_doc.get("items", [])
            
            # Retirer l'ID s'il existe déjà (pour éviter les doublons)
            if content_id in items:
                items.remove(content_id)
            
            # Ajouter le nouvel ID au début
            items.insert(0, content_id)
            
            # Limiter à max_items
            items = items[:max_items]
            
            # Mettre à jour
            await db.recent_content.update_one(
                {"type": content_type},
                {"$set": {"items": items}}
            )
        
        logging.info(f"✅ Ajouté {content_id} aux {content_type} récents")
    except Exception as e:
        logging.error(f"Erreur add_to_recent: {e}")

@api_router.post("/admin/init-recent-content")
async def init_recent_content(current_founder: User = Depends(get_current_founder)):
    """
    Initialiser la collection recent_content avec les 10 derniers films et séries
    Réservé au FONDATEUR uniquement
    """
    try:
        # Récupérer les 10 derniers films (par _id)
        movies = await db.movies.find({}).sort("_id", -1).limit(10).to_list(10)
        movie_ids = [movie["id"] for movie in movies]
        
        # Récupérer les 10 dernières séries (par _id)
        series = await db.series.find({}).sort("_id", -1).limit(10).to_list(10)
        series_ids = [s["id"] for s in series]
        
        # Créer ou remplacer les documents
        await db.recent_content.delete_many({"type": {"$in": ["movies", "series"]}})
        
        if movie_ids:
            await db.recent_content.insert_one({
                "type": "movies",
                "items": movie_ids
            })
        
        if series_ids:
            await db.recent_content.insert_one({
                "type": "series",
                "items": series_ids
            })
        
        logging.info(f"✅ Collection recent_content initialisée: {len(movie_ids)} films + {len(series_ids)} séries")
        
        return {
            "success": True,
            "movies_count": len(movie_ids),
            "series_count": len(series_ids),
            "message": f"Initialisé avec {len(movie_ids)} films et {len(series_ids)} séries"
        }
    except Exception as e:
        logging.error(f"Erreur init_recent_content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/users")
async def get_all_users(
    page: int = 1,
    per_page: int = 20,
    search: str = None,
    subscription: str = None,
    current_super_user: User = Depends(get_current_super_user)
):
    # Limiter per_page pour éviter surcharge (max 50000 utilisateurs par page)
    per_page = min(per_page, 50000)
    
    # Construire le filtre de recherche
    filter_query = {}
    
    if search:
        filter_query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if subscription and subscription != "all":
        filter_query["subscription"] = subscription
    
    # Compter le total d'utilisateurs
    total = await db.users.count_documents(filter_query)
    
    # Calculer la pagination
    skip = (page - 1) * per_page
    
    # Récupérer les utilisateurs de la page actuelle avec tri par date de création (plus récents en premier)
    users = await db.users.find(
        filter_query, 
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    
    # Convertir les dates
    for user in users:
        if user.get('subscription_date') and isinstance(user['subscription_date'], datetime):
            user['subscription_date'] = user['subscription_date'].isoformat()
        if user.get('created_at') and isinstance(user['created_at'], datetime):
            user['created_at'] = user['created_at'].isoformat()
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_founder: User = Depends(get_current_founder)):
    allowed_roles = ["user", "admin", "super_admin", "co_fondateur", "fondateur"]
    if role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Rôle invalide. Doit être: {', '.join(allowed_roles)}")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": f"Rôle mis à jour vers {role}"}

@api_router.put("/admin/users/{user_id}/subscription")
async def update_user_subscription(user_id: str, subscription: str, current_super_user: User = Depends(get_current_super_user)):
    if subscription not in ["gratuit", "premium", "vip"]:
        raise HTTPException(status_code=400, detail="Abonnement invalide. Doit être 'gratuit', 'premium' ou 'vip'")
    
    # Enregistrer la date d'attribution de l'abonnement
    update_data = {
        "subscription": subscription,
        "subscription_date": datetime.now(timezone.utc)
    }
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": f"Abonnement mis à jour vers {subscription}"}

@api_router.put("/admin/users/{user_id}/password")
async def update_user_password(
    user_id: str, 
    new_password: str, 
    current_founder: User = Depends(get_current_founder)
):
    """
    Changer le mot de passe d'un utilisateur - UNIQUEMENT pour les fondateurs
    """
    # Logs pour déboguer
    logging.info(f"Changement de mot de passe pour user_id: {user_id}")
    logging.info(f"Nouveau mot de passe (clair): {new_password}")
    
    # Vérifier que le nouveau mot de passe a au moins 6 caractères
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    # Hasher le nouveau mot de passe avec la fonction existante
    hashed_password = hash_password(new_password)
    logging.info(f"Mot de passe hashé: {hashed_password[:50]}...")
    
    # Mettre à jour le mot de passe dans le bon champ (password_hash)
    result = await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"password_hash": hashed_password}}
    )
    
    logging.info(f"Résultat mise à jour: matched={result.matched_count}, modified={result.modified_count}")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Vérifier que le mot de passe a bien été mis à jour
    user = await db.users.find_one({"id": user_id})
    logging.info(f"Password dans DB après update: {user.get('password_hash', '')[:50]}...")
    
    return {"message": "Mot de passe mis à jour avec succès"}

@api_router.post("/admin/force-change-password")
async def force_change_password(
    email: str,
    new_password: str,
    current_founder: User = Depends(get_current_founder)
):
    """
    FORCER le changement de mot de passe - DIRECT dans MongoDB
    UNIQUEMENT pour les fondateurs
    """
    logging.info(f"🔑 FORCE CHANGE PASSWORD pour: {email}")
    
    # Vérifier que le nouveau mot de passe a au moins 6 caractères
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    # Trouver l'utilisateur par email
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail=f"Utilisateur avec email {email} non trouvé")
    
    logging.info(f"✅ Utilisateur trouvé: {user['id']}")
    
    # Hasher le nouveau mot de passe
    hashed_password = hash_password(new_password)
    logging.info(f"🔐 Hash généré: {hashed_password[:60]}...")
    
    # Mettre à jour DIRECTEMENT dans MongoDB avec le BON champ: password_hash
    result = await db.users.update_one(
        {"email": email}, 
        {"$set": {"password_hash": hashed_password}}
    )
    
    logging.info(f"📝 Résultat MongoDB: matched={result.matched_count}, modified={result.modified_count}")
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Échec de la mise à jour dans MongoDB")
    
    # Vérifier que c'est bien changé
    updated_user = await db.users.find_one({"email": email})
    logging.info(f"✅ Hash dans DB après update: {updated_user['password_hash'][:60]}...")
    
    return {
        "success": True,
        "message": f"Mot de passe changé avec succès pour {email}",
        "user_id": user['id'],
        "hash_preview": hashed_password[:20] + "..."
    }

@api_router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_founder: User = Depends(get_current_founder)
):
    """
    Supprimer un utilisateur - UNIQUEMENT pour les fondateurs
    """
    logging.info(f"🗑️ Suppression de l'utilisateur: {user_id}")
    
    # Vérifier que l'utilisateur existe
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Empêcher la suppression du compte fondateur connecté
    if user_id == current_founder.id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    # Supprimer l'utilisateur
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Échec de la suppression")
    
    logging.info(f"✅ Utilisateur {user['email']} supprimé avec succès")
    
    return {
        "success": True,
        "message": f"Utilisateur {user['email']} supprimé avec succès"
    }

# ===== Database Export =====
@api_router.get("/admin/export-database")
async def export_database(current_founder: User = Depends(get_current_founder)):
    """Export complet de la base de données (réservé au fondateur)"""
    try:
        # Créer un dossier temporaire pour l'export
        export_dir = Path("/tmp/db_export")
        if export_dir.exists():
            shutil.rmtree(export_dir)
        export_dir.mkdir(parents=True)
        
        # Exporter la base avec mongodump
        db_name = os.environ.get('DB_NAME', 'streaming_db')
        dump_result = subprocess.run(
            ['mongodump', '--db', db_name, '--out', str(export_dir)],
            capture_output=True,
            text=True
        )
        
        if dump_result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {dump_result.stderr}")
        
        # Créer le fichier README
        readme_path = export_dir / "README_IMPORT.txt"
        readme_content = f"""════════════════════════════════════════════════════════════════
  STREAMING DB - BASE DE DONNÉES COMPLÈTE
════════════════════════════════════════════════════════════════

Date d'export: {datetime.now(timezone.utc).strftime('%d %B %Y %H:%M UTC')}
Base de données: {db_name}

✅ CONTENU EXPORTÉ:
- Films avec genres normalisés
- Séries avec genres normalisés
- Épisodes complets
- Utilisateurs avec rôles corrects
- Sagas, badges, et configurations

════════════════════════════════════════════════════════════════
  IMPORT SUR VOTRE SERVEUR
════════════════════════════════════════════════════════════════

1. Décompressez l'archive:
   unzip streaming_db_export.zip

2. Importez dans MongoDB:
   mongorestore --db={db_name} {db_name}/

3. Vérifiez:
   mongosh
   use {db_name}
   show collections

════════════════════════════════════════════════════════════════
"""
        readme_path.write_text(readme_content)
        
        # Créer l'archive ZIP
        zip_path = Path("/tmp/streaming_db_export")
        shutil.make_archive(str(zip_path), 'zip', export_dir)
        
        final_zip = Path(f"{zip_path}.zip")
        
        # Retourner le fichier
        return FileResponse(
            path=str(final_zip),
            media_type='application/zip',
            filename=f'streaming_db_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")

# ===== Settings Management (Fondateur uniquement) =====
@api_router.get("/admin/settings/series-access")
async def get_series_access_settings():
    """
    Récupérer le paramètre d'accès aux séries pour les membres gratuits
    Endpoint PUBLIC - Accessible à tous les utilisateurs (connectés ou non)
    """
    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    
    # Si pas de paramètre, créer avec valeur par défaut (false = séries bloquées)
    if not settings:
        default_settings = AppSettings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return {"series_free_access": False, "message": "Séries bloquées pour les membres gratuits (par défaut)"}
    
    series_free_access = settings.get('series_free_access', False)
    return {
        "series_free_access": series_free_access,
        "message": "Séries accessibles aux membres gratuits" if series_free_access else "Séries bloquées pour les membres gratuits"
    }

@api_router.put("/admin/settings/series-access/toggle", response_model=SeriesAccessToggleResponse)
async def toggle_series_access(current_founder: User = Depends(get_current_founder)):
    """
    Toggle l'accès aux séries pour les membres gratuits
    Réservé au FONDATEUR uniquement
    """
    settings = await db.settings.find_one({"id": "app_settings"})
    
    if not settings:
        # Créer le paramètre s'il n'existe pas et l'activer
        new_settings = AppSettings(
            series_free_access=True,  # On active l'accès
            updated_by=current_founder.id
        )
        doc = new_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        
        logging.info(f"✅ Fondateur {current_founder.email} a ACTIVÉ l'accès aux séries pour les membres gratuits")
        return {
            "series_free_access": True,
            "message": "Accès aux séries ACTIVÉ pour les membres gratuits"
        }
    
    # Toggle la valeur actuelle
    current_value = settings.get('series_free_access', False)
    new_value = not current_value
    
    update_data = {
        "series_free_access": new_value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_founder.id
    }
    
    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": update_data}
    )
    
    action = "ACTIVÉ" if new_value else "DÉSACTIVÉ"
    logging.info(f"✅ Fondateur {current_founder.email} a {action} l'accès aux séries pour les membres gratuits")
    
    return {
        "series_free_access": new_value,
        "message": f"Accès aux séries {action} pour les membres gratuits"
    }


# ===== URL MIGRATION ENDPOINTS (Fondateur uniquement) =====
@api_router.post("/admin/url-migration/preview", response_model=URLMigrationPreviewResponse)
async def preview_url_migration(
    data: URLMigrationPreview,
    current_founder: User = Depends(get_current_founder)
):
    """
    Prévisualiser la migration d'URLs
    Compte combien de films et épisodes seraient affectés
    Réservé au FONDATEUR uniquement
    """
    if not data.old_pattern or not data.new_pattern:
        raise HTTPException(status_code=400, detail="Les patterns ancien et nouveau sont requis")
    
    # Compter les films affectés
    movies = await db.movies.find(
        {"video_url": {"$regex": f"^{data.old_pattern}"}},
        {"_id": 0, "id": 1, "title": 1, "video_url": 1}
    ).to_list(None)
    
    # Compter les épisodes affectés
    episodes = await db.episodes.find(
        {"video_url": {"$regex": f"^{data.old_pattern}"}},
        {"_id": 0, "id": 1, "title": 1, "video_url": 1, "season_number": 1, "episode_number": 1}
    ).to_list(None)
    
    # Échantillon de 3 films et 3 épisodes pour prévisualisation
    sample_movies = [
        {
            "title": movie["title"],
            "old_url": movie["video_url"],
            "new_url": movie["video_url"].replace(data.old_pattern, data.new_pattern, 1)
        }
        for movie in movies[:3]
    ]
    
    sample_episodes = [
        {
            "title": f"{episode['title']} (S{episode['season_number']:02d}E{episode['episode_number']:02d})",
            "old_url": episode["video_url"],
            "new_url": episode["video_url"].replace(data.old_pattern, data.new_pattern, 1)
        }
        for episode in episodes[:3]
    ]
    
    logging.info(f"👀 Fondateur {current_founder.email} prévisualise migration: {len(movies)} films + {len(episodes)} épisodes")
    
    return {
        "movies_count": len(movies),
        "episodes_count": len(episodes),
        "total_count": len(movies) + len(episodes),
        "old_pattern": data.old_pattern,
        "new_pattern": data.new_pattern,
        "sample_movies": sample_movies,
        "sample_episodes": sample_episodes
    }

@api_router.post("/admin/url-migration/execute", response_model=URLMigrationExecuteResponse)
async def execute_url_migration(
    data: URLMigrationExecute,
    current_founder: User = Depends(get_current_founder)
):
    """
    Exécuter la migration d'URLs
    Remplace les URLs dans tous les films et épisodes
    Réservé au FONDATEUR uniquement
    """
    if not data.old_pattern or not data.new_pattern:
        raise HTTPException(status_code=400, detail="Les patterns ancien et nouveau sont requis")
    
    # Migrer les films
    movies_result = await db.movies.find(
        {"video_url": {"$regex": f"^{data.old_pattern}"}},
        {"_id": 0, "id": 1, "video_url": 1}
    ).to_list(None)
    
    movies_updated = 0
    for movie in movies_result:
        new_url = movie["video_url"].replace(data.old_pattern, data.new_pattern, 1)
        await db.movies.update_one(
            {"id": movie["id"]},
            {"$set": {"video_url": new_url}}
        )
        movies_updated += 1
    
    # Migrer les épisodes
    episodes_result = await db.episodes.find(
        {"video_url": {"$regex": f"^{data.old_pattern}"}},
        {"_id": 0, "id": 1, "video_url": 1}
    ).to_list(None)
    
    episodes_updated = 0
    for episode in episodes_result:
        new_url = episode["video_url"].replace(data.old_pattern, data.new_pattern, 1)
        await db.episodes.update_one(
            {"id": episode["id"]},
            {"$set": {"video_url": new_url}}
        )
        episodes_updated += 1
    
    total_updated = movies_updated + episodes_updated
    
    logging.info(f"🔄 MIGRATION URL par {current_founder.email}: {movies_updated} films + {episodes_updated} épisodes | {data.old_pattern} → {data.new_pattern}")
    
    return {
        "movies_updated": movies_updated,
        "episodes_updated": episodes_updated,
        "total_updated": total_updated,
        "message": f"Migration réussie: {movies_updated} films et {episodes_updated} épisodes mis à jour"
    }


@api_router.post("/admin/fix-missing-dates")
async def fix_missing_created_dates(current_founder: User = Depends(get_current_founder)):
    """
    Ajouter created_at aux contenus qui n'en ont pas
    Réservé au FONDATEUR uniquement
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Fixer les films
    movies_result = await db.movies.update_many(
        {"created_at": {"$exists": False}},
        {"$set": {"created_at": now}}
    )
    
    # Fixer les séries
    series_result = await db.series.update_many(
        {"created_at": {"$exists": False}},
        {"$set": {"created_at": now}}
    )
    
    # Fixer les épisodes
    episodes_result = await db.episodes.update_many(
        {"created_at": {"$exists": False}},
        {"$set": {"created_at": now}}
    )
    
    total_fixed = movies_result.modified_count + series_result.modified_count + episodes_result.modified_count
    
    logging.info(f"📅 Ajout de created_at par {current_founder.email}: {movies_result.modified_count} films + {series_result.modified_count} séries + {episodes_result.modified_count} épisodes")
    
    return {
        "movies_fixed": movies_result.modified_count,
        "series_fixed": series_result.modified_count,
        "episodes_fixed": episodes_result.modified_count,
        "total_fixed": total_fixed,
        "message": f"Dates ajoutées: {movies_result.modified_count} films, {series_result.modified_count} séries, {episodes_result.modified_count} épisodes"
    }

@api_router.post("/admin/refresh-metadata")
async def refresh_all_metadata(current_founder: User = Depends(get_current_founder)):
    """
    Rafraîchir les métadonnées (réalisateur, acteurs) de tous les films et séries
    Réservé au FONDATEUR uniquement
    """
    import asyncio
    
    updated_movies = 0
    updated_series = 0
    errors = []
    
    # Rafraîchir les films
    movies = await db.movies.find({"tmdb_id": {"$exists": True, "$ne": None}}, {"_id": 0}).to_list(None)
    
    for movie in movies:
        try:
            tmdb_id = movie.get('tmdb_id')
            if tmdb_id:
                # Récupérer les crédits
                credits = await fetch_tmdb_movie_credits(tmdb_id)
                
                # Mettre à jour en base
                await db.movies.update_one(
                    {"id": movie['id']},
                    {"$set": {
                        "director": credits.get('director'),
                        "director_photo": credits.get('director_photo'),
                        "cast": credits.get('cast', [])
                    }}
                )
                updated_movies += 1
                logging.info(f"✅ Métadonnées mises à jour pour le film: {movie.get('title')}")
                
                # Délai pour éviter le rate limiting TMDB (40 requêtes/10 secondes)
                await asyncio.sleep(0.3)
        except Exception as e:
            errors.append(f"Film {movie.get('title', 'Unknown')}: {str(e)}")
            logging.error(f"❌ Erreur pour le film {movie.get('title')}: {str(e)}")
    
    # Rafraîchir les séries
    series_list = await db.series.find({"tmdb_id": {"$exists": True, "$ne": None}}, {"_id": 0}).to_list(None)
    
    for series in series_list:
        try:
            tmdb_id = series.get('tmdb_id')
            if tmdb_id:
                # Récupérer les données de la série pour le créateur
                tmdb_data = await fetch_tmdb_series(tmdb_id)
                creator = None
                creator_photo = None
                
                if tmdb_data.get('created_by') and len(tmdb_data['created_by']) > 0:
                    creator = tmdb_data['created_by'][0].get('name')
                    if tmdb_data['created_by'][0].get('profile_path'):
                        creator_photo = f"https://image.tmdb.org/t/p/w185{tmdb_data['created_by'][0]['profile_path']}"
                
                # Récupérer les crédits
                credits = await fetch_tmdb_series_credits(tmdb_id)
                
                # Mettre à jour en base
                await db.series.update_one(
                    {"id": series['id']},
                    {"$set": {
                        "creator": creator,
                        "creator_photo": creator_photo,
                        "cast": credits.get('cast', [])
                    }}
                )
                updated_series += 1
                logging.info(f"✅ Métadonnées mises à jour pour la série: {series.get('title')}")
                
                # Délai pour éviter le rate limiting TMDB
                await asyncio.sleep(0.3)
        except Exception as e:
            errors.append(f"Série {series.get('title', 'Unknown')}: {str(e)}")
            logging.error(f"❌ Erreur pour la série {series.get('title')}: {str(e)}")
    
    logging.info(f"🎬 Rafraîchissement terminé - Films: {updated_movies}, Séries: {updated_series}")
    
    return {
        "message": "Rafraîchissement des métadonnées terminé",
        "updated_movies": updated_movies,
        "updated_series": updated_series,
        "total_updated": updated_movies + updated_series,
        "errors": errors if errors else None
    }

@api_router.post("/admin/refresh-logos")
async def refresh_all_logos(
    background_tasks: BackgroundTasks,
    batch_size: int = 50,
    current_founder: User = Depends(get_current_founder)
):
    """
    Rafraîchir les logos de tous les films et séries depuis TMDB
    Traitement en arrière-plan pour éviter les timeouts
    Réservé au FONDATEUR uniquement
    """
    import asyncio
    
    async def process_logos():
        updated_movies = 0
        updated_series = 0
        errors = []
        
        # Rafraîchir les logos des films
        movies = await db.movies.find({"tmdb_id": {"$exists": True, "$ne": None}}, {"_id": 0}).to_list(None)
        
        logging.info(f"🎬 Début du rafraîchissement des logos pour {len(movies)} films...")
        
        for i, movie in enumerate(movies):
            try:
                tmdb_id = movie.get('tmdb_id')
                if tmdb_id:
                    # Récupérer le logo
                    logo_url = await fetch_tmdb_logo(tmdb_id, "movie")
                    
                    if logo_url:
                        # Mettre à jour en base
                        await db.movies.update_one(
                            {"id": movie['id']},
                            {"$set": {"logo_url": logo_url}}
                        )
                        updated_movies += 1
                        logging.info(f"✅ [{i+1}/{len(movies)}] Logo ajouté pour: {movie.get('title')}")
                    else:
                        logging.info(f"ℹ️ [{i+1}/{len(movies)}] Pas de logo pour: {movie.get('title')}")
                    
                    # Délai pour éviter le rate limiting TMDB (40 requêtes/10 secondes)
                    await asyncio.sleep(0.3)
            except Exception as e:
                errors.append(f"Film {movie.get('title', 'Unknown')}: {str(e)}")
                logging.error(f"❌ Erreur pour le film {movie.get('title')}: {str(e)}")
        
        # Rafraîchir les logos des séries
        series_list = await db.series.find({"tmdb_id": {"$exists": True, "$ne": None}}, {"_id": 0}).to_list(None)
        
        logging.info(f"📺 Début du rafraîchissement des logos pour {len(series_list)} séries...")
        
        for i, series in enumerate(series_list):
            try:
                tmdb_id = series.get('tmdb_id')
                if tmdb_id:
                    # Récupérer le logo
                    logo_url = await fetch_tmdb_logo(tmdb_id, "tv")
                    
                    if logo_url:
                        # Mettre à jour en base
                        await db.series.update_one(
                            {"id": series['id']},
                            {"$set": {"logo_url": logo_url}}
                        )
                        updated_series += 1
                        logging.info(f"✅ [{i+1}/{len(series_list)}] Logo ajouté pour: {series.get('title')}")
                    else:
                        logging.info(f"ℹ️ [{i+1}/{len(series_list)}] Pas de logo pour: {series.get('title')}")
                    
                    # Délai pour éviter le rate limiting TMDB
                    await asyncio.sleep(0.3)
            except Exception as e:
                errors.append(f"Série {series.get('title', 'Unknown')}: {str(e)}")
                logging.error(f"❌ Erreur pour la série {series.get('title')}: {str(e)}")
        
        logging.info(f"🎨 Rafraîchissement des logos terminé - Films: {updated_movies}/{len(movies)}, Séries: {updated_series}/{len(series_list)}")
        
        if errors:
            logging.warning(f"⚠️ {len(errors)} erreurs rencontrées")
    
    # Lancer le traitement en arrière-plan
    background_tasks.add_task(process_logos)
    
    # Compter les contenus à traiter
    movies_count = await db.movies.count_documents({"tmdb_id": {"$exists": True, "$ne": None}})
    series_count = await db.series.count_documents({"tmdb_id": {"$exists": True, "$ne": None}})
    total_count = movies_count + series_count
    estimated_time = total_count * 0.3 / 60  # En minutes
    
    return {
        "message": "Rafraîchissement des logos démarré en arrière-plan",
        "status": "processing",
        "movies_to_process": movies_count,
        "series_to_process": series_count,
        "total_to_process": total_count,
        "estimated_time_minutes": round(estimated_time, 1),
        "note": "Consultez les logs du serveur pour suivre la progression"
    }

@api_router.get("/admin/refresh-logos-status")
async def get_refresh_logos_status(current_founder: User = Depends(get_current_founder)):
    """
    Vérifier combien de films/séries ont déjà un logo
    """
    # Compter les films avec logo
    movies_with_logo = await db.movies.count_documents({"logo_url": {"$exists": True, "$ne": None}})
    movies_total = await db.movies.count_documents({"tmdb_id": {"$exists": True, "$ne": None}})
    
    # Compter les séries avec logo
    series_with_logo = await db.series.count_documents({"logo_url": {"$exists": True, "$ne": None}})
    series_total = await db.series.count_documents({"tmdb_id": {"$exists": True, "$ne": None}})
    
    movies_missing = movies_total - movies_with_logo
    series_missing = series_total - series_with_logo
    total_missing = movies_missing + series_missing
    
    return {
        "movies": {
            "with_logo": movies_with_logo,
            "total": movies_total,
            "missing": movies_missing,
            "percentage": round((movies_with_logo / movies_total * 100) if movies_total > 0 else 0, 1)
        },
        "series": {
            "with_logo": series_with_logo,
            "total": series_total,
            "missing": series_missing,
            "percentage": round((series_with_logo / series_total * 100) if series_total > 0 else 0, 1)
        },
        "total": {
            "with_logo": movies_with_logo + series_with_logo,
            "missing": total_missing,
            "total": movies_total + series_total
        }
    }


@api_router.post("/admin/disable-halloween-theme")
async def disable_halloween_theme(current_founder: User = Depends(get_current_founder)):
    """
    Désactive le thème Halloween en supprimant les fichiers et nettoyant le CSS
    Réservé aux fondateurs uniquement
    """
    try:
        frontend_path = Path("/app/frontend/src")
        
        # Fichiers à supprimer
        files_to_remove = [
            frontend_path / "components" / "HalloweenDecorations.jsx",
            frontend_path / "components" / "HalloweenHorrorSection.jsx"
        ]
        
        removed_files = []
        for file_path in files_to_remove:
            if file_path.exists():
                file_path.unlink()
                removed_files.append(str(file_path.name))
        
        # Nettoyer le CSS (supprimer la section Halloween)
        css_file = frontend_path / "index.css"
        if css_file.exists():
            content = css_file.read_text()
            
            # Supprimer la section Halloween
            start_marker = "/* ==================== HALLOWEEN THEME ==================== */"
            end_marker = "/* ==================== END HALLOWEEN THEME ==================== */"
            
            if start_marker in content and end_marker in content:
                start_idx = content.find(start_marker)
                end_idx = content.find(end_marker) + len(end_marker)
                
                # Supprimer la section
                new_content = content[:start_idx] + content[end_idx:]
                css_file.write_text(new_content)
        
        return {
            "success": True,
            "message": "Thème Halloween désactivé avec succès",
            "files_removed": removed_files,
            "note": "Vous devez maintenant retirer manuellement les imports Halloween de Home.jsx et Navbar.jsx, ou redémarrer le frontend pour voir les changements"
        }
    
    except Exception as e:
        logging.error(f"Error disabling Halloween theme: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Import 2FA routes
from two_factor_routes import router as two_factor_router, init_db as init_2fa_db

# Initialiser la DB pour 2FA
init_2fa_db(db)

# ===== USER STATS ENDPOINT =====
@api_router.get("/auth/profile/stats")
async def get_user_stats(current_user: User = Depends(get_current_user)):
    """Obtenir les statistiques de l'utilisateur"""
    try:
        user_id = current_user.id
        
        # Compter les favoris (films + séries)
        total_favorites = await db.favorites.count_documents({"user_id": user_id})
        
        # Compter les films dans l'historique
        movies_pipeline = [
            {"$match": {"user_id": user_id, "content_type": "movie"}},
            {"$group": {"_id": "$content_id"}}
        ]
        movies_count = len(await db.watch_history.aggregate(movies_pipeline).to_list(None))
        
        # Compter les séries dans l'historique
        series_pipeline = [
            {"$match": {"user_id": user_id, "content_type": "series"}},
            {"$group": {"_id": "$content_id"}}
        ]
        series_count = len(await db.watch_history.aggregate(series_pipeline).to_list(None))
        
        # Compter le total de vues (nombre d'entrées dans l'historique)
        total_views = await db.watch_history.count_documents({"user_id": user_id})
        
        # Obtenir le dernier film regardé
        last_movie = await db.watch_history.find_one(
            {"user_id": user_id, "content_type": "movie"},
            sort=[("watched_at", -1)]
        )
        last_movie_title = None
        if last_movie:
            movie = await db.movies.find_one({"id": last_movie.get("content_id")})
            if movie:
                last_movie_title = movie.get("title")
        
        # Obtenir la dernière série regardée
        last_series = await db.watch_history.find_one(
            {"user_id": user_id, "content_type": "series"},
            sort=[("watched_at", -1)]
        )
        last_series_info = None
        if last_series:
            series = await db.series.find_one({"id": last_series.get("content_id")})
            if series:
                episode_id = last_series.get("episode_id")
                season_num = last_series.get("season_number", "?")
                episode_num = last_series.get("episode_number", "?")
                last_series_info = f"{series.get('title')} S{season_num}E{episode_num}"
        
        # Calculer le temps total de visionnage (estimation)
        # On suppose 90 minutes par film et 45 minutes par épisode en moyenne
        total_watch_time_minutes = (movies_count * 90) + (total_views * 45)
        total_watch_hours = round(total_watch_time_minutes / 60, 1)
        
        return {
            "total_views": total_views,
            "movies_watched": movies_count,
            "series_watched": series_count,
            "total_favorites": total_favorites,
            "last_movie": last_movie_title,
            "last_series": last_series_info,
            "total_watch_hours": total_watch_hours
        }
    except Exception as e:
        logging.error(f"Error getting user stats: {e}")
        return {
            "total_views": 0,
            "movies_watched": 0,
            "series_watched": 0,
            "total_favorites": 0,
            "last_movie": None,
            "last_series": None,
            "total_watch_hours": 0
        }

# Include routers
api_router.include_router(two_factor_router, prefix="/auth", tags=["2FA"])
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()