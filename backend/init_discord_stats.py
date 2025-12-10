"""
Script pour initialiser manuellement les statistiques Discord
Lance une mise à jour immédiate des canaux vocaux avec les statistiques actuelles
"""
import asyncio
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

sys.path.append('/app/backend')

from discord_service import update_discord_stats

async def main():
    print("🚀 Initialisation des statistiques Discord...")
    print("📊 Comptage des films et séries dans la base de données...")
    
    success = await update_discord_stats()
    
    if success:
        print("✅ Statistiques Discord mises à jour avec succès!")
    else:
        print("❌ Erreur lors de la mise à jour des statistiques Discord")
        print("Vérifiez les logs pour plus de détails")

if __name__ == "__main__":
    asyncio.run(main())
