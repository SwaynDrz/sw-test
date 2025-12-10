# 🎬 SW-STREAMING - Plateforme de Streaming Multimédia

> Plateforme complète de streaming de films et séries avec système d'authentification, gestion des rôles, abonnements, et intégration TMDB.

## 📊 Statistiques

- **Utilisateurs:** 2,611
- **Épisodes:** 9,896
- **Films:** 623
- **Séries:** 114
- **Badges:** 45

## 🏗️ Architecture

### Stack Technique
- **Backend:** FastAPI (Python) + Gunicorn + UvicornWorker
- **Frontend:** React 19 + Tailwind CSS + Radix UI
- **Base de données:** MongoDB
- **Serveur:** PM2 (mode cluster) + Nginx (optionnel)

### Structure
```
sw-streaming/
├── backend/              # API FastAPI
│   ├── server.py        # Point d'entrée
│   ├── gunicorn_conf.py # Config Gunicorn multithread
│   └── requirements.txt
├── frontend/            # Application React
│   ├── src/
│   ├── public/
│   └── package.json
├── ecosystem.config.js  # Configuration PM2 cluster
├── nginx.conf          # Config Nginx load balancing
└── scripts/            # Scripts de déploiement
```

## 🚀 Déploiement Production

### Configuration Multithread PM2

Cette application est configurée pour fonctionner en **mode cluster/multithread** pour gérer efficacement un grand nombre d'utilisateurs simultanés.

#### Backend
- **Mode:** Fork (Gunicorn gère le multithreading)
- **Workers:** Auto-détecté (1 par CPU)
- **Worker Class:** UvicornWorker (async ASGI)

#### Frontend
- **Mode:** Cluster
- **Instances:** Max (utilise tous les CPU)
- **Load Balancing:** Automatique via PM2

### Installation et Démarrage

#### Méthode 1: Guide Interactif (Recommandé)
```bash
./deploy-guide.sh
```

#### Méthode 2: Démarrage Manuel
```bash
# 1. Installer les dépendances
cd backend && pip3 install -r requirements.txt
cd ../frontend && yarn install && yarn build

# 2. Démarrer avec PM2
./start-pm2.sh

# 3. Vérifier le status
pm2 list
```

#### Méthode 3: Résoudre "Process not found"
```bash
./pm2-fix.sh
```

## 📦 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `./deploy-guide.sh` | Guide d'installation interactif complet |
| `./start-pm2.sh` | Démarrage automatique de l'application |
| `./pm2-fix.sh` | Résout le problème "Process 8 not found" |
| `./monitor-pm2.sh` | Dashboard de monitoring en temps réel |

## 🔧 Gestion PM2

### Commandes de base
```bash
pm2 list                 # Liste des processus
pm2 logs                 # Logs en temps réel
pm2 monit                # Monitoring interactif
pm2 restart all          # Redémarrer tous les services
pm2 reload all           # Reload sans downtime (cluster)
pm2 stop all             # Arrêter tous les services
```

### Monitoring
```bash
./monitor-pm2.sh         # Dashboard complet
pm2 monit                # Interface interactive
```

## 🌐 Configuration Nginx (Optionnel)

Pour activer le load balancing avec Nginx:

```bash
# Installation
sudo apt install nginx -y

# Configuration
sudo cp nginx.conf /etc/nginx/sites-available/sw-streaming
sudo ln -s /etc/nginx/sites-available/sw-streaming /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Voir `NGINX-SETUP.md` pour le guide complet.

## 🎯 Fonctionnalités

### Authentification et Rôles
- **Fondateur:** Contrôle total, seul à pouvoir gérer les rôles
- **Co-Fondateur:** Accès administrateur étendu
- **Super Admin:** Gestion avancée
- **Admin:** Gestion standard
- **User:** Accès utilisateur normal

### Abonnements
- **Gratuit:** Accès de base
- **Premium:** Fonctionnalités avancées
- **VIP:** Accès complet

### Intégrations
- **TMDB API:** Métadonnées films et séries
- **Système de badges:** Gamification
- **Panel Admin:** Gestion complète

## 📈 Performance

### Configuration recommandée

| Serveur | Backend Workers | Frontend Instances | Utilisateurs |
|---------|----------------|-------------------|--------------|
| 2 CPU / 2GB | 2 | 1 | 100-200 |
| 4 CPU / 4GB | 4 | 2 | 300-500 |
| 8 CPU / 8GB | 6-8 | 3-4 | 500-1000 |
| 16 CPU / 16GB | 12-16 | max | 1000+ |

### Avec Nginx + PM2 Cluster
- ✅ 500-1000+ utilisateurs simultanés
- ✅ 1000-5000+ requêtes/seconde
- ✅ 100-200+ streams vidéo simultanés
- ✅ Latence < 50ms (avec cache)

## 🛠️ Résolution de Problèmes

### "Process 8 not found"
```bash
./pm2-fix.sh
```

### Services ne démarrent pas
```bash
# Vérifier les ports
sudo netstat -tulpn | grep -E ':8001|:3000'

# Vérifier les logs
pm2 logs --err

# Vérifier MongoDB
sudo systemctl status mongod
```

### Voir les logs détaillés
```bash
# Backend
pm2 logs sw-streaming-backend
tail -f logs/backend-error.log

# Frontend
pm2 logs sw-streaming-frontend
tail -f logs/frontend-error.log
```

## 📚 Documentation

- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** - Guide de déploiement complet
- **[PM2-README.md](PM2-README.md)** - Documentation PM2 détaillée
- **[NGINX-SETUP.md](NGINX-SETUP.md)** - Configuration Nginx complète

## 🔐 Sécurité

### À configurer en production:
- [ ] SSL/HTTPS avec Let's Encrypt
- [ ] Firewall (UFW)
- [ ] Rate limiting
- [ ] MongoDB authentication
- [ ] Variables d'environnement sécurisées
- [ ] Backups automatiques

## 🆘 Support

Pour toute question ou problème:
1. Consulter les logs: `pm2 logs`
2. Vérifier le status: `./monitor-pm2.sh`
3. Consulter la documentation dans `/docs`

## 📄 Licence

Propriétaire - SW-Streaming © 2025

---

**Note:** Cette application est optimisée pour la production avec multithreading, load balancing, et haute disponibilité.

Pour démarrer: `./deploy-guide.sh`

