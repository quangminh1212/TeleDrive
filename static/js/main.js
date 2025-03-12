// TeleDrive Main JavaScript File

document.addEventListener('DOMContentLoaded', function() {
    // Gestion des alertes
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.style.display = 'none';
            }, 300);
        }, 5000);
    });

    // Gestion du menu mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }

    // Animation des éléments au scroll
    const animateElements = document.querySelectorAll('.animate-on-scroll');
    
    if (animateElements.length > 0) {
        function checkIfInView() {
            animateElements.forEach(element => {
                const rect = element.getBoundingClientRect();
                const windowHeight = window.innerHeight || document.documentElement.clientHeight;
                
                if (rect.top <= windowHeight * 0.8) {
                    element.classList.add('visible');
                }
            });
        }
        
        window.addEventListener('scroll', checkIfInView);
        checkIfInView(); // Check on page load
    }

    // Gestion du thème (clair/sombre)
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            
            // Sauvegarder la préférence
            const isDarkTheme = document.body.classList.contains('dark-theme');
            localStorage.setItem('darkTheme', isDarkTheme);
        });
        
        // Appliquer le thème sauvegardé
        const savedTheme = localStorage.getItem('darkTheme');
        if (savedTheme === 'true') {
            document.body.classList.add('dark-theme');
        }
    }
}); 