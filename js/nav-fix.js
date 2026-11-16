// VertexCapitals - Universal Navigation & Link Synchronizer
(function() {
  function normalizeHref(href) {
    if (!href) return href;
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:') || href.startsWith('tel:')) {
      return href;
    }
    let clean = href.trim();
    if (clean === '/' || clean === '') return 'index.html';
    if (clean.startsWith('/')) clean = clean.substring(1);
    // If dashboard path e.g. dashboard/deposit -> deposit.html
    if (clean.startsWith('dashboard/')) {
      clean = clean.replace('dashboard/', '');
    }
    // If admin path
    if (clean === 'admin/adminchat') return 'adminchat.html';
    if (!clean.endsWith('.html') && !clean.includes('#')) {
      clean = clean + '.html';
    }
    return clean;
  }

  // Intercept all link clicks in capture phase before Next.js SPA router can block them
  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var rawHref = a.getAttribute('href');
    if (!rawHref) return;

    if (rawHref.startsWith('http://') || rawHref.startsWith('https://') || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('javascript:')) {
      return;
    }

    var targetHref = normalizeHref(rawHref);
    if (targetHref) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = targetHref;
    }
  }, true);

  // Setup UI event handlers once DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Helper to get active user
    function getLoggedInUser() {
      try {
        var raw = localStorage.getItem('vertexcapitals_auth_user_live');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      try {
        var adminToken = sessionStorage.getItem('vx_admin_session_token');
        if (adminToken) return { role: 'admin', full_name: 'Administrator' };
      } catch (e) {}
      return null;
    }

    var currentUser = getLoggedInUser();

    // Dynamically update Desktop Header Auth Buttons on landing pages if logged in
    if (currentUser) {
      var targetDashboard = (currentUser.role === 'admin') ? 'admin.html' : 'dashboard.html';
      var displayName = currentUser.full_name ? currentUser.full_name.split(' ')[0] : 'Account';
      
      // Find desktop auth buttons container in header
      var headerNavContainers = document.querySelectorAll('header .xl\\:flex.hidden');
      headerNavContainers.forEach(function(container) {
        // If container contains login.html or register.html links
        if (container.querySelector('a[href*="login.html"], a[href*="register.html"]')) {
          container.innerHTML = `
            <a href="${targetDashboard}" class="vx-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Go to Dashboard</span>
            </a>
          `;
        }
      });
    }

    // Mobile Drawer Toggle (skip pages that declare their own onclick handler like index.html)
    var menuButtons = document.querySelectorAll('button.flex-col');
    menuButtons.forEach(function(btn) {
      if (btn.getAttribute('onclick')) return;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var drawer = document.getElementById('mobile-nav-drawer');
        if (!drawer) {
          drawer = document.createElement('div');
          drawer.id = 'mobile-nav-drawer';
          drawer.className = 'fixed inset-x-0 top-20 bottom-0 bg-white/95 dark:bg-[#0C121E]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-[998] flex flex-col p-6 space-y-3 text-base font-semibold text-slate-900 dark:text-white shadow-2xl overflow-y-auto';
          
          var authMobileLinks = '';
          if (currentUser) {
            var targetDashboard = (currentUser.role === 'admin') ? 'admin.html' : 'dashboard.html';
            authMobileLinks = `
              <a href="${targetDashboard}" class="vx-btn-primary text-center py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mt-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Go to Dashboard</span>
              </a>
            `;
          } else {
            authMobileLinks = `
              <a href="login.html" class="vx-btn-secondary text-center py-3 rounded-xl text-sm mt-2">Sign In</a>
              <a href="register.html" class="vx-btn-primary text-center py-3 rounded-xl text-sm">Get Started</a>
            `;
          }

          drawer.innerHTML = `
            <a href="index.html" class="vx-sidebar-link py-3 px-4 rounded-xl">Home</a>
            <a href="index.html#homepage-plans-section" class="vx-sidebar-link py-3 px-4 rounded-xl">Investment Plans</a>
            <a href="about.html" class="vx-sidebar-link py-3 px-4 rounded-xl">About Us</a>
            <a href="apply.html" class="vx-sidebar-link py-3 px-4 rounded-xl">Apply for Partnership</a>
            <a href="support.html" class="vx-sidebar-link py-3 px-4 rounded-xl">Support</a>
            ${authMobileLinks}
          `;
          document.body.appendChild(drawer);
        } else {
          drawer.classList.toggle('hidden');
        }
      });
    });

    // Community dropdown toggle
    var commButtons = document.querySelectorAll('button:not(.flex-col)');
    commButtons.forEach(function(btn) {
      if (btn.innerText && btn.innerText.includes('Community')) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var parent = btn.parentElement;
          var existingMenu = parent.querySelector('.community-dropdown-menu');
          if (existingMenu) {
            existingMenu.style.display = (existingMenu.style.display === 'none') ? 'block' : 'none';
          } else {
            var menu = document.createElement('div');
            menu.className = 'community-dropdown-menu absolute bg-dark py-4 space-y-3 right-0 mt-2 w-[206px] text-white text-center rounded-md shadow-lg z-50';
            menu.innerHTML = `
              <a href="https://instagram.com" target="_blank" class="block px-4 py-2 text-sm hover:text-primary transition-colors">Instagram</a>
              <a href="https://twitter.com" target="_blank" class="block px-4 py-2 text-sm hover:text-primary transition-colors">Twitter</a>
              <a href="https://facebook.com" target="_blank" class="block px-4 py-2 text-sm hover:text-primary transition-colors">Facebook</a>
            `;
            parent.appendChild(menu);
          }
        });
      }
    });

    // Universal Floating Chat Widget Scrubber
    function removeFloatingChatWidget() {
      var elements = document.querySelectorAll('.fixed.bottom-5.right-5, div.fixed.bottom-5.right-5.z-50, a[href="support.html"][title="Contact Support"]');
      elements.forEach(function(el) {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
      // Also catch any button with round float styles
      var roundButtons = document.querySelectorAll('button.w-14.h-14.rounded-full.shadow-lg');
      roundButtons.forEach(function(btn) {
        var parent = btn.closest('.fixed.bottom-5.right-5') || btn.closest('.fixed');
        if (parent && parent.parentNode) {
          parent.parentNode.removeChild(parent);
        } else if (btn.parentNode) {
          btn.parentNode.removeChild(btn);
        }
      });
    }

    removeFloatingChatWidget();
    setInterval(removeFloatingChatWidget, 300);

    var observer = new MutationObserver(function() {
      removeFloatingChatWidget();
    });
    observer.observe(document.body, { childList: true, subtree: true });

  });
})();


