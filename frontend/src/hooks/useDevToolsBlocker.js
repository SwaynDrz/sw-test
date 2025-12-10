import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useDevToolsBlocker = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si on est sur mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Si mobile, ne rien faire
    if (isMobile) {
      return;
    }

    // Désactiver le clic droit
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Bloquer les raccourcis clavier des DevTools
    const handleKeyDown = (e) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        navigate('/');
        return false;
      }
      
      // Ctrl+Shift+I ou Cmd+Shift+I (Inspecter)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        navigate('/');
        return false;
      }
      
      // Ctrl+Shift+J ou Cmd+Shift+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        navigate('/');
        return false;
      }
      
      // Ctrl+Shift+C ou Cmd+Shift+C (Sélecteur)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        navigate('/');
        return false;
      }
      
      // Ctrl+U ou Cmd+U (Voir source)
      if ((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
        e.preventDefault();
        navigate('/');
        return false;
      }
    };

    // Détecter l'ouverture des DevTools par la taille de la fenêtre
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        navigate('/');
      }
    };

    // Méthode alternative : détection par console
    const devToolsCheck = () => {
      const element = new Image();
      Object.defineProperty(element, 'id', {
        get: function() {
          navigate('/');
        }
      });
      console.log(element);
    };

    // Ajouter les écouteurs d'événements
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    
    // Vérifier périodiquement l'ouverture des DevTools
    const devToolsInterval = setInterval(detectDevTools, 1000);
    
    // Vérifier au resize
    window.addEventListener('resize', detectDevTools);

    // Nettoyer les écouteurs
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(devToolsInterval);
      window.removeEventListener('resize', detectDevTools);
    };
  }, [navigate]);
};

export default useDevToolsBlocker;
