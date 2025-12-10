"""
Service Discord pour mettre à jour les statistiques de films et séries
dans les noms des canaux vocaux Discord
"""
import os
import asyncio
import discord
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)


async def get_movies_count() -> int:
    """Compte le nombre total de films dans la base de données"""
    try:
        MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        DB_NAME = os.environ.get("DB_NAME", "streaming_db")
        
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        count = await db.movies.count_documents({})
        client.close()
        return count
    except Exception as e:
        logger.error(f"Erreur lors du comptage des films: {e}")
        return 0


async def get_series_count() -> int:
    """Compte le nombre total de séries dans la base de données"""
    try:
        MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        DB_NAME = os.environ.get("DB_NAME", "streaming_db")
        
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        count = await db.series.count_documents({})
        client.close()
        return count
    except Exception as e:
        logger.error(f"Erreur lors du comptage des séries: {e}")
        return 0


async def get_episodes_count() -> int:
    """Compte le nombre total d'épisodes dans la base de données"""
    try:
        MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        DB_NAME = os.environ.get("DB_NAME", "streaming_db")
        
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        count = await db.episodes.count_documents({})
        client.close()
        return count
    except Exception as e:
        logger.error(f"Erreur lors du comptage des épisodes: {e}")
        return 0


async def update_channel_name(channel_id: str, new_name: str, bot_token: str) -> bool:
    """Met à jour le nom d'un canal Discord"""
    try:
        # Créer un client Discord avec les intents nécessaires
        intents = discord.Intents.default()
        intents.guilds = True
        
        client = discord.Client(intents=intents)
        
        # Variable pour stocker le résultat
        success = False
        
        @client.event
        async def on_ready():
            nonlocal success
            try:
                channel = client.get_channel(int(channel_id))
                if channel:
                    await channel.edit(name=new_name)
                    logger.info(f"Canal Discord mis à jour: {new_name}")
                    success = True
                else:
                    logger.error(f"Canal Discord non trouvé: {channel_id}")
                    success = False
            except Exception as e:
                logger.error(f"Erreur lors de la mise à jour du canal: {e}")
                success = False
            finally:
                await client.close()
        
        # Démarrer le client Discord avec un timeout
        try:
            await asyncio.wait_for(client.start(bot_token), timeout=10.0)
        except asyncio.TimeoutError:
            logger.error("Timeout lors de la connexion au bot Discord")
            success = False
        
        return success
        
    except Exception as e:
        logger.error(f"Erreur Discord: {e}")
        return False


async def update_discord_stats():
    """
    Met à jour les statistiques Discord (films, séries et épisodes)
    Cette fonction est appelée après chaque ajout/suppression de contenu
    """
    try:
        # Lire les variables d'environnement dynamiquement
        DISCORD_BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN")
        DISCORD_FILMS_CHANNEL_ID = os.environ.get("DISCORD_FILMS_CHANNEL_ID")
        DISCORD_SERIES_CHANNEL_ID = os.environ.get("DISCORD_SERIES_CHANNEL_ID")
        DISCORD_EPISODES_CHANNEL_ID = os.environ.get("DISCORD_EPISODES_CHANNEL_ID")
        
        # Vérifier que les variables d'environnement principales sont configurées
        if not all([DISCORD_BOT_TOKEN, DISCORD_FILMS_CHANNEL_ID, DISCORD_SERIES_CHANNEL_ID]):
            logger.warning("Configuration Discord incomplète, mise à jour ignorée")
            return False
        
        # Compter les films, séries et épisodes
        movies_count = await get_movies_count()
        series_count = await get_series_count()
        episodes_count = await get_episodes_count()
        
        logger.info(f"Statistiques: {movies_count} films, {series_count} séries, {episodes_count} épisodes")
        
        # Créer un client Discord avec les intents nécessaires
        intents = discord.Intents.default()
        intents.guilds = True
        
        client = discord.Client(intents=intents)
        
        success = False
        
        @client.event
        async def on_ready():
            nonlocal success
            try:
                # Mettre à jour le canal Films
                films_channel = client.get_channel(int(DISCORD_FILMS_CHANNEL_ID))
                if films_channel:
                    await films_channel.edit(name=f"🔊 Films : {movies_count}")
                    logger.info(f"Canal Films mis à jour: {movies_count}")
                else:
                    logger.error(f"Canal Films non trouvé: {DISCORD_FILMS_CHANNEL_ID}")
                
                # Mettre à jour le canal Séries
                series_channel = client.get_channel(int(DISCORD_SERIES_CHANNEL_ID))
                if series_channel:
                    await series_channel.edit(name=f"🔊 Séries : {series_count}")
                    logger.info(f"Canal Séries mis à jour: {series_count}")
                else:
                    logger.error(f"Canal Séries non trouvé: {DISCORD_SERIES_CHANNEL_ID}")
                
                # Mettre à jour le canal Épisodes (si configuré)
                if DISCORD_EPISODES_CHANNEL_ID:
                    episodes_channel = client.get_channel(int(DISCORD_EPISODES_CHANNEL_ID))
                    if episodes_channel:
                        await episodes_channel.edit(name=f"🔊 Épisodes : {episodes_count}")
                        logger.info(f"Canal Épisodes mis à jour: {episodes_count}")
                    else:
                        logger.error(f"Canal Épisodes non trouvé: {DISCORD_EPISODES_CHANNEL_ID}")
                
                success = True
                
            except discord.errors.HTTPException as e:
                if e.status == 429:
                    logger.warning("Rate limit Discord atteint, réessayez plus tard")
                else:
                    logger.error(f"Erreur HTTP Discord: {e}")
                success = False
            except Exception as e:
                logger.error(f"Erreur lors de la mise à jour des canaux: {e}")
                success = False
            finally:
                await client.close()
        
        # Démarrer le client Discord avec un timeout
        try:
            await asyncio.wait_for(client.start(DISCORD_BOT_TOKEN), timeout=15.0)
        except asyncio.TimeoutError:
            logger.error("Timeout lors de la connexion au bot Discord")
            success = False
        
        return success
        
    except Exception as e:
        logger.error(f"Erreur dans update_discord_stats: {e}")
        return False


def sync_update_discord_stats():
    """
    Version synchrone de update_discord_stats pour être appelée depuis du code synchrone
    """
    try:
        # Créer une nouvelle event loop si nécessaire
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Exécuter la mise à jour asynchrone dans un thread séparé
        asyncio.create_task(update_discord_stats())
        logger.info("Mise à jour Discord lancée en arrière-plan")
        
    except Exception as e:
        logger.error(f"Erreur dans sync_update_discord_stats: {e}")
