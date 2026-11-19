// PrimeHavenCapital - Universal Navigation & Link Synchronizer
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

  // Expose synchronous mobile menu toggle immediately for onclick handlers (before DOMContentLoaded)
  if (typeof window.toggleMobileNavDrawer !== 'function') {
    window.toggleMobileNavDrawer = function(e, triggerBtn) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      var btn = triggerBtn || document.getElementById('mobile-menu-btn') || document.querySelector('button.flex-col');
      var drawer = document.getElementById('mobile-nav-drawer');
      if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'mobile-nav-drawer';
        drawer.style.display = 'none';
        drawer.className = 'xl:hidden fixed inset-x-0 top-20 bottom-0 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-[998] flex-col p-6 space-y-3 text-base font-semibold text-slate-900 dark:text-white shadow-2xl overflow-y-auto';

        var activeUser = getLoggedInUser();
        var authMobileLinks = '';
        if (activeUser) {
          var targetDashboard = (activeUser.role === 'admin') ? 'admin.html' : 'dashboard.html';
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
      }

      if (drawer.parentElement && drawer.parentElement !== document.body) {
        document.body.appendChild(drawer);
      }

      var isCurrentlyOpen = drawer.style.display === 'flex' || (drawer.style.display !== 'none' && !drawer.classList.contains('hidden') && window.getComputedStyle(drawer).display !== 'none');
      if (isCurrentlyOpen) {
        drawer.style.display = 'none';
        drawer.classList.add('hidden');
        drawer.classList.remove('flex');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      } else {
        drawer.style.display = 'flex';
        drawer.classList.remove('hidden');
        drawer.classList.add('flex');
        if (btn) btn.setAttribute('aria-expanded', 'true');
      }
    };
  }

  // ==========================================================
  // PRIMEHAVEN MULTI-LANGUAGE TRANSLATOR ENGINE
  // ==========================================================
  var LANG_STORAGE_KEY = 'primehavencapital_lang';
  var SUPPORTED_LANGUAGES = {
    en: { code: 'en', label: 'EN · English', dir: 'ltr' },
    es: { code: 'es', label: 'ES · Español', dir: 'ltr' },
    fr: { code: 'fr', label: 'FR · Français', dir: 'ltr' },
    de: { code: 'de', label: 'DE · Deutsch', dir: 'ltr' },
    pt: { code: 'pt', label: 'PT · Português', dir: 'ltr' },
    ar: { code: 'ar', label: 'AR · العربية', dir: 'rtl' },
    'zh-CN': { code: 'zh-CN', label: 'ZH · 中文', dir: 'ltr' },
    ru: { code: 'ru', label: 'RU · Русский', dir: 'ltr' },
    ja: { code: 'ja', label: 'JA · 日本語', dir: 'ltr' },
    tr: { code: 'tr', label: 'TR · Türkçe', dir: 'ltr' }
  };

  var PHRASE_DICT = {
    'Wealth & OTC Desk': {
      es: 'Mesa Patrimonial y OTC',
      fr: 'Gestion Privée & OTC',
      de: 'Vermögen & OTC-Desk',
      pt: 'Mesa Patrimonial & OTC',
      ar: 'إدارة الثروات ومكتب OTC',
      'zh-CN': '财富管理与场外交易台',
      ru: 'Управление капиталом и OTC',
      ja: '資産運用・OTCデスク',
      tr: 'Varlık ve OTC Masası'
    },
    'Home': {
      es: 'Inicio', fr: 'Accueil', de: 'Startseite', pt: 'Início', ar: 'الرئيسية',
      'zh-CN': '首页', ru: 'Главная', ja: 'ホーム', tr: 'Ana Sayfa'
    },
    'Investment Plans': {
      es: 'Planes de Inversión', fr: "Plans d'Investissement", de: 'Anlagepläne', pt: 'Planos de Investimento', ar: 'خطط الاستثمار',
      'zh-CN': '投资计划', ru: 'Инвестиционные планы', ja: '投資プラン', tr: 'Yatırım Planları'
    },
    'How It Works': {
      es: 'Cómo Funciona', fr: 'Comment ça marche', de: 'So funktioniert es', pt: 'Como Funciona', ar: 'كيف يعمل',
      'zh-CN': '运作方式', ru: 'Как это работает', ja: '仕組み', tr: 'Nasıl Çalışır'
    },
    'Testimonials': {
      es: 'Testimonios', fr: 'Témoignages', de: 'Referenzen', pt: 'Depoimentos', ar: 'آراء العملاء',
      'zh-CN': '客户评价', ru: 'Отзывы', ja: 'お客様の声', tr: 'Referanslar'
    },
    'Client Testimonials': {
      es: 'Testimonios de Clientes', fr: 'Témoignages Clients', de: 'Kundenstimmen', pt: 'Depoimentos de Clientes', ar: 'شهادات العملاء',
      'zh-CN': '客户见证', ru: 'Отзывы клиентов', ja: 'お客様の声', tr: 'Müşteri Yorumları'
    },
    'Features': {
      es: 'Características', fr: 'Fonctionnalités', de: 'Funktionen', pt: 'Recursos', ar: 'المميزات',
      'zh-CN': '平台优势', ru: 'Преимущества', ja: '特徴', tr: 'Özellikler'
    },
    'Security': {
      es: 'Seguridad', fr: 'Sécurité', de: 'Sicherheit', pt: 'Segurança', ar: 'الأمان',
      'zh-CN': '安全保障', ru: 'Безопасность', ja: 'セキュリティ', tr: 'Güvenlik'
    },
    'Security & Transparency': {
      es: 'Seguridad y Transparencia', fr: 'Sécurité & Transparence', de: 'Sicherheit & Transparenz', pt: 'Segurança e Transparência', ar: 'الأمان والشفافية',
      'zh-CN': '安全与透明', ru: 'Безопасность и прозрачность', ja: 'セキュリティと透明性', tr: 'Güvenlik ve Şeffaflık'
    },
    'FAQ': {
      es: 'Preguntas Frecuentes', fr: 'FAQ', de: 'FAQ', pt: 'Perguntas Frequentes', ar: 'الأسئلة الشائعة',
      'zh-CN': '常见问题', ru: 'Частые вопросы', ja: 'よくある質問', tr: 'SSS'
    },
    'Frequently Asked Questions': {
      es: 'Preguntas Frecuentes', fr: 'Foire Aux Questions', de: 'Häufig gestellte Fragen', pt: 'Perguntas Frequentes', ar: 'الأسئلة المتكررة',
      'zh-CN': '常见问题解答', ru: 'Часто задаваемые вопросы', ja: 'よくある質問', tr: 'Sıkça Sorulan Sorular'
    },
    'About': {
      es: 'Nosotros', fr: 'À propos', de: 'Über uns', pt: 'Sobre', ar: 'من نحن',
      'zh-CN': '关于我们', ru: 'О нас', ja: '会社概要', tr: 'Hakkımızda'
    },
    'About Us': {
      es: 'Sobre Nosotros', fr: 'À propos de nous', de: 'Über uns', pt: 'Sobre Nós', ar: 'من نحن',
      'zh-CN': '关于我们', ru: 'О компании', ja: '当社について', tr: 'Hakkımızda'
    },
    'About PrimeHavenCapital': {
      es: 'Sobre PrimeHavenCapital', fr: 'À propos de PrimeHavenCapital', de: 'Über PrimeHavenCapital', pt: 'Sobre PrimeHavenCapital', ar: 'عن PrimeHavenCapital',
      'zh-CN': '关于 PrimeHavenCapital', ru: 'О PrimeHavenCapital', ja: 'PrimeHavenCapitalについて', tr: 'PrimeHavenCapital Hakkında'
    },
    'Partners': {
      es: 'Socios', fr: 'Partenaires', de: 'Partner', pt: 'Parceiros', ar: 'الشركاء',
      'zh-CN': '合作伙伴', ru: 'Партнёры', ja: 'パートナー', tr: 'İş Ortakları'
    },
    'Partner Program': {
      es: 'Programa de Socios', fr: 'Programme Partenaire', de: 'Partnerprogramm', pt: 'Programa de Parceiros', ar: 'برنامج الشركاء',
      'zh-CN': '合作伙伴计划', ru: 'Партнёрская программа', ja: 'パートナープログラム', tr: 'İş Ortaklığı Programı'
    },
    'Apply for Partnership': {
      es: 'Solicitar Asociación', fr: 'Demander un Partenariat', de: 'Partnerschaft beantragen', pt: 'Solicitar Parceria', ar: 'التقديم للشراكة',
      'zh-CN': '申请成为合作伙伴', ru: 'Подать заявку на партнёрство', ja: 'パートナー申請', tr: 'Ortaklık Başvurusu'
    },
    'Sign In': {
      es: 'Iniciar Sesión', fr: 'Se connecter', de: 'Anmelden', pt: 'Entrar', ar: 'تسجيل الدخول',
      'zh-CN': '登录', ru: 'Войти', ja: 'サインイン', tr: 'Giriş Yap'
    },
    'Get Started': {
      es: 'Comenzar', fr: 'Commencer', de: 'Jetzt starten', pt: 'Começar', ar: 'ابدأ الآن',
      'zh-CN': '立即开始', ru: 'Начать', ja: '始める', tr: 'Hemen Başla'
    },
    'Go to Dashboard': {
      es: 'Ir al Panel', fr: 'Accéder au Tableau de Bord', de: 'Zum Dashboard', pt: 'Ir para o Painel', ar: 'الذهاب إلى لوحة التحكم',
      'zh-CN': '进入控制台', ru: 'Перейти в кабинет', ja: 'ダッシュボードへ', tr: 'Panele Git'
    },
    'Sign Out': {
      es: 'Cerrar Sesión', fr: 'Déconnexion', de: 'Abmelden', pt: 'Sair', ar: 'تسجيل الخروج',
      'zh-CN': '退出登录', ru: 'Выйти', ja: 'ログアウト', tr: 'Çıkış Yap'
    },
    'Structured Capital Allocation & Transparent Simple-Interest Returns': {
      es: 'Asignación Estructurada de Capital y Retornos Transparentes de Interés Simple',
      fr: 'Allocation Structurée de Capital et Rendements Transparents à Intérêt Simple',
      de: 'Strukturierte Kapitalallokation & transparente Zinserträge',
      pt: 'Alocação Estruturada de Capital e Retornos Transparentes em Juros Simples',
      ar: 'تخصيص رأس المال المنظم وعوائد فائدة بسيطة وشفافة',
      'zh-CN': '结构化资本配置与透明单利回报',
      ru: 'Структурированное распределение капитала и прозрачная доходность',
      ja: '体系的な資産配分と透明性の高い単利リターン',
      tr: 'Yapılandırılmış Sermaye Dağılımı ve Şeffaf Basit Faiz Getirileri'
    },
    'Allocate liquid Exchange funds into Short-Term or Long-Term investment plans with locked contractual terms, real-time accrual visibility, and automated maturity settlement credited back to your wallet.': {
      es: 'Asigne fondos líquidos a planes de inversión a corto o largo plazo con términos contractuales fijos, visibilidad en tiempo real y liquidación automática en su billetera.',
      fr: 'Allouez vos fonds liquides vers des plans à court ou long terme avec des conditions contractuelles verrouillées, suivi en temps réel et règlement automatique à échéance.',
      de: 'Allokieren Sie liquide Mittel in kurz- oder langfristige Anlagepläne mit festen Vertragskonditionen, Echtzeit-Übersicht und automatischer Auszahlung bei Fälligkeit.',
      pt: 'Aloque fundos líquidos em planos de investimento de curto ou longo prazo com termos contratuais bloqueados, acompanhamento em tempo real e liquidação automática.',
      ar: 'خصص أموالك السائلة في خطط استثمار قصيرة أو طويلة الأجل بشروط تعاقدية ثابتة ومتابعة فورية وتسوية تلقائية عند الاستحقاق إلى محفظتك.',
      'zh-CN': '将流动资金配置到锁定合约条款的短期或长期投资计划中，享受实时收益追踪和到期自动结算至钱包。',
      ru: 'Размещайте ликвидные средства в краткосрочных или долгосрочных инвестиционных планах с фиксированными условиями и автоматическим расчётом на кошелёк.',
      ja: '流動資金を固定契約条件の短期・長期投資プランに配分し、リアルタイムの収益確認と満期時のウォレット自動決済を提供します。',
      tr: 'Likit fonlarınızı sabit sözleşme şartları, anlık getiri takibi ve vade sonunda cüzdanınıza otomatik ödeme ile Kısa veya Uzun Vadeli planlara tahsis edin.'
    },
    'Browse Active Plans →': {
      es: 'Ver Planes Activos →', fr: 'Voir les Plans Actifs →', de: 'Aktive Pläne ansehen →', pt: 'Ver Planos Ativos →', ar: 'تصفح الخطط النشطة ←',
      'zh-CN': '浏览有效计划 →', ru: 'Смотреть активные планы →', ja: '運用プランを見る →', tr: 'Aktif Planlara Göz At →'
    },
    'Interest Model': {
      es: 'Modelo de Interés', fr: 'Modèle d’Intérêt', de: 'Zinsmodell', pt: 'Modelo de Juros', ar: 'نموذج الفائدة',
      'zh-CN': '计息模式', ru: 'Модель дохода', ja: '金利モデル', tr: 'Faiz Modeli'
    },
    'Simple Interest': {
      es: 'Interés Simple', fr: 'Intérêt Simple', de: 'Einfacher Zins', pt: 'Juros Simples', ar: 'فائدة بسيطة',
      'zh-CN': '单利计算', ru: 'Простой процент', ja: '単利計算', tr: 'Basit Faiz'
    },
    'Plan Categories': {
      es: 'Categorías', fr: 'Catégories', de: 'Kategorien', pt: 'Categorias', ar: 'فئات الخطط',
      'zh-CN': '计划类别', ru: 'Категории', ja: 'プラン種別', tr: 'Plan Kategorileri'
    },
    'Short & Long Term': {
      es: 'Corto y Largo Plazo', fr: 'Court & Long Terme', de: 'Kurz- & Langfristig', pt: 'Curto e Longo Prazo', ar: 'قصير وطويل الأجل',
      'zh-CN': '短期与长期', ru: 'Кратко- и долгосрочные', ja: '短期・長期', tr: 'Kısa ve Uzun Vade'
    },
    'Live catalogue sync': {
      es: 'Catálogo sincronizado', fr: 'Catalogue en direct', de: 'Live-Katalog-Sync', pt: 'Catálogo sincronizado', ar: 'مزامنة مباشرة',
      'zh-CN': '实时目录同步', ru: 'Синхронизация каталога', ja: 'ライブ同期', tr: 'Canlı katalog senkronu'
    },
    'Account Structure': {
      es: 'Estructura de Cuenta', fr: 'Structure du Compte', de: 'Kontostruktur', pt: 'Estrutura da Conta', ar: 'هيكل الحساب',
      'zh-CN': '账户结构', ru: 'Структура счёта', ja: '口座構成', tr: 'Hesap Yapısı'
    },
    'Dual-Wallet': {
      es: 'Billetera Dual', fr: 'Double Portefeuille', de: 'Dual-Wallet', pt: 'Carteira Dupla', ar: 'محفظة مزدوجة',
      'zh-CN': '双钱包架构', ru: 'Двойной кошелёк', ja: 'デュアルウォレット', tr: 'Çift Cüzdan'
    },
    'Exchange + OTC Vault': {
      es: 'Intercambio + Bóveda OTC', fr: 'Échange + Coffre OTC', de: 'Exchange + OTC-Tresor', pt: 'Câmbio + Cofre OTC', ar: 'محفظة التداول + OTC',
      'zh-CN': '交易钱包 + OTC 金库', ru: 'Биржевой + OTC-сейф', ja: '取引 + OTCボールト', tr: 'Borsa + OTC Kasası'
    },
    'Maturity Payout': {
      es: 'Pago al Vencimiento', fr: 'Paiement à Échéance', de: 'Fälligkeitszahlung', pt: 'Pagamento no Vencimento', ar: 'عائد الاستحقاق',
      'zh-CN': '到期结算', ru: 'Выплата по сроку', ja: '満期払い出し', tr: 'Vade Ödemesi'
    },
    'Atomic Credit': {
      es: 'Crédito Atómico', fr: 'Crédit Atomique', de: 'Atomare Gutschrift', pt: 'Crédito Atômico', ar: 'رصيد فوري آمن',
      'zh-CN': '原子级入账', ru: 'Атомарное зачисление', ja: 'アトミック入金', tr: 'Atomik Alacak'
    },
    'Principal + Profit': {
      es: 'Capital + Ganancia', fr: 'Capital + Profit', de: 'Kapital + Gewinn', pt: 'Principal + Lucro', ar: 'رأس المال + الأرباح',
      'zh-CN': '本金 + 收益', ru: 'Тело + Прибыль', ja: '元本＋利益', tr: 'Anapara + Kâr'
    },
    'Simple-Interest Yield Simulator': {
      es: 'Simulador de Rendimiento', fr: 'Simulateur de Rendement', de: 'Rendite-Simulator', pt: 'Simulador de Rendimento', ar: 'محاكي العائد البسيط',
      'zh-CN': '单利收益模拟器', ru: 'Калькулятор доходности', ja: '単利収益シミュレーター', tr: 'Basit Faiz Getiri Simülatörü'
    },
    'Interactive payout calculation from active PostgreSQL plans': {
      es: 'Cálculo interactivo desde los planes activos en la plataforma',
      fr: 'Calcul interactif basé sur les plans actifs de la plateforme',
      de: 'Interaktive Auszahlungsberechnung aus aktiven Anlageplänen',
      pt: 'Cálculo interativo a partir dos planos ativos da plataforma',
      ar: 'حساب تفاعلي للعوائد من خطط الاستثمار النشطة',
      'zh-CN': '基于平台有效计划的交互式收益试算',
      ru: 'Интерактивный расчёт выплат по активным планам платформы',
      ja: '有効な投資プランに基づくインタラクティブ収益試算',
      tr: 'Aktif platform planlarından etkileşimli ödeme hesaplaması'
    },
    'Select Investment Tier': {
      es: 'Seleccionar Nivel de Inversión', fr: 'Choisir le Palier', de: 'Anlagestufe wählen', pt: 'Selecionar Plano', ar: 'اختر فئة الاستثمار',
      'zh-CN': '选择投资等级', ru: 'Выберите план', ja: '投資プランを選択', tr: 'Yatırım Katmanını Seçin'
    },
    'Investment Amount (USD)': {
      es: 'Monto de Inversión (USD)', fr: 'Montant Investi (USD)', de: 'Anlagebetrag (USD)', pt: 'Valor do Investimento (USD)', ar: 'مبلغ الاستثمار (دولار)',
      'zh-CN': '投资金额 (USD)', ru: 'Сумма инвестиций (USD)', ja: '投資金額 (USD)', tr: 'Yatırım Tutarı (USD)'
    },
    'Est. Simple Profit': {
      es: 'Ganancia Estimada', fr: 'Profit Estimé', de: 'Geschätzter Gewinn', pt: 'Lucro Estimado', ar: 'الربح التقديري',
      'zh-CN': '预估单利收益', ru: 'Ожидаемая прибыль', ja: '推定利益', tr: 'Tahmini Basit Kâr'
    },
    'Projected Total Payout': {
      es: 'Pago Total Proyectado', fr: 'Paiement Total Projeté', de: 'Voraussichtliche Auszahlung', pt: 'Pagamento Total Projetado', ar: 'إجمالي العائد المتوقع',
      'zh-CN': '预计总回款', ru: 'Итоговая выплата', ja: '予想総受取額', tr: 'Tahmini Toplam Ödeme'
    },
    'Simulate & Invest Now →': {
      es: 'Simular e Invertir Ahora →', fr: 'Simuler & Investir →', de: 'Berechnen & Investieren →', pt: 'Simular e Investir →', ar: 'احسب واستثمر الآن ←',
      'zh-CN': '模拟并立即投资 →', ru: 'Рассчитать и инвестировать →', ja: '試算して投資する →', tr: 'Simüle Et ve Yatırım Yap →'
    },
    'Loading...': {
      es: 'Cargando...', fr: 'Chargement...', de: 'Wird geladen...', pt: 'Carregando...', ar: 'جاري التحميل...',
      'zh-CN': '加载中...', ru: 'Загрузка...', ja: '読み込み中...', tr: 'Yükleniyor...'
    },
    'All Categories': {
      es: 'Todas las Categorías', fr: 'Toutes Catégories', de: 'Alle Kategorien', pt: 'Todas as Categorias', ar: 'جميع الفئات',
      'zh-CN': '全部分类', ru: 'Все категории', ja: 'すべて', tr: 'Tüm Kategoriler'
    },
    'Short-Term': {
      es: 'Corto Plazo', fr: 'Court Terme', de: 'Kurzfristig', pt: 'Curto Prazo', ar: 'قصير الأجل',
      'zh-CN': '短期', ru: 'Краткосрочный', ja: '短期', tr: 'Kısa Vadeli'
    },
    'Long-Term': {
      es: 'Largo Plazo', fr: 'Long Terme', de: 'Langfristig', pt: 'Longo Prazo', ar: 'طويل الأجل',
      'zh-CN': '长期', ru: 'Долгосрочный', ja: '長期', tr: 'Uzun Vadeli'
    },
    'Total ROI': {
      es: 'ROI Total', fr: 'ROI Total', de: 'Gesamt-ROI', pt: 'ROI Total', ar: 'العائد الإجمالي',
      'zh-CN': '总收益率', ru: 'Общий ROI', ja: '合計ROI', tr: 'Toplam Getiri'
    },
    'Duration': {
      es: 'Duración', fr: 'Durée', de: 'Laufzeit', pt: 'Duração', ar: 'المدة',
      'zh-CN': '周期', ru: 'Срок', ja: '期間', tr: 'Süre'
    },
    'Days': {
      es: 'Días', fr: 'Jours', de: 'Tage', pt: 'Dias', ar: 'أيام',
      'zh-CN': '天', ru: 'дней', ja: '日', tr: 'Gün'
    },
    'Minimum': {
      es: 'Mínimo', fr: 'Minimum', de: 'Minimum', pt: 'Mínimo', ar: 'الحد الأدنى',
      'zh-CN': '最低投资', ru: 'Минимум', ja: '最小額', tr: 'Minimum'
    },
    'Min': {
      es: 'Mín', fr: 'Min', de: 'Min', pt: 'Mín', ar: 'الأدنى',
      'zh-CN': '最低', ru: 'Мин', ja: '最小', tr: 'Min'
    },
    'Maximum': {
      es: 'Máximo', fr: 'Maximum', de: 'Maximum', pt: 'Máximo', ar: 'الحد الأقصى',
      'zh-CN': '最高投资', ru: 'Максимум', ja: '最大額', tr: 'Maksimum'
    },
    'Max': {
      es: 'Máx', fr: 'Max', de: 'Max', pt: 'Máx', ar: 'الأقصى',
      'zh-CN': '最高', ru: 'Макс', ja: '最大', tr: 'Maks'
    },
    'Est. Profit': {
      es: 'Ganancia Est.', fr: 'Profit Est.', de: 'Gesch. Gewinn', pt: 'Lucro Est.', ar: 'الربح التقديري',
      'zh-CN': '预估收益', ru: 'Ожид. прибыль', ja: '予想利益', tr: 'Tah. Kâr'
    },
    'Total Payout': {
      es: 'Pago Total', fr: 'Paiement Total', de: 'Gesamtauszahlung', pt: 'Pagamento Total', ar: 'إجمالي العائد',
      'zh-CN': '总回款', ru: 'Итого выплата', ja: '合計受取額', tr: 'Toplam Ödeme'
    },
    'Invest Now': {
      es: 'Invertir Ahora', fr: 'Investir Maintenant', de: 'Jetzt investieren', pt: 'Investir Agora', ar: 'استثمر الآن',
      'zh-CN': '立即投资', ru: 'Инвестировать', ja: '今すぐ投資', tr: 'Şimdi Yatırım Yap'
    },
    'Unlimited': {
      es: 'Ilimitado', fr: 'Illimité', de: 'Unbegrenzt', pt: 'Ilimitado', ar: 'غير محدود',
      'zh-CN': '无上限', ru: 'Без лимита', ja: '無制限', tr: 'Limitsiz'
    },
    'Trusted by Discerning Investors': {
      es: 'La Confianza de Inversores Exigentes', fr: 'La Confiance des Investisseurs Avertis', de: 'Vertraut von anspruchsvollen Anlegern', pt: 'A Confiança de Investidores Exigentes', ar: 'موثوق من قبل نخبة المستثمرين',
      'zh-CN': '深受资深投资者信赖', ru: 'Доверие требовательных инвесторов', ja: '洗練された投資家からの信頼', tr: 'Seçkin Yatırımcıların Güveni'
    },
    'Client Experiences': {
      es: 'Experiencias de Clientes', fr: 'Témoignages Clients', de: 'Kundenerfahrungen', pt: 'Experiências de Clientes', ar: 'تجارب العملاء',
      'zh-CN': '客户体验', ru: 'Опыт клиентов', ja: 'お客様の評価', tr: 'Müşteri Deneyimleri'
    },
    'Platform Features': {
      es: 'Características de la Plataforma', fr: 'Fonctionnalités Plateforme', de: 'Plattformfunktionen', pt: 'Recursos da Plataforma', ar: 'مزايا المنصة',
      'zh-CN': '平台核心功能', ru: 'Возможности платформы', ja: 'プラットフォーム機能', tr: 'Platform Özellikleri'
    },
    'Client Information': {
      es: 'Información al Cliente', fr: 'Informations Client', de: 'Kundeninformationen', pt: 'Informações ao Cliente', ar: 'معلومات العملاء',
      'zh-CN': '客户指南', ru: 'Информация для клиентов', ja: 'ご案内', tr: 'Müşteri Bilgisi'
    },
    'Ready to Configure Your Portfolio?': {
      es: '¿Listo para Configurar su Portafolio?', fr: 'Prêt à Configurer Votre Portefeuille ?', de: 'Bereit, Ihr Portfolio einzurichten?', pt: 'Pronto para Configurar sua Carteira?', ar: 'هل أنت مستعد لإعداد محفظتك؟',
      'zh-CN': '准备好配置您的投资组合了吗？', ru: 'Готовы настроить свой портфель?', ja: 'ポートフォリオを構築しませんか？', tr: 'Portföyünüzü Yapılandırmaya Hazır mısınız?'
    },
    'Overview': {
      es: 'Resumen', fr: 'Vue d’ensemble', de: 'Übersicht', pt: 'Visão Geral', ar: 'نظرة عامة',
      'zh-CN': '概览', ru: 'Обзор', ja: '概要', tr: 'Genel Bakış'
    },
    'Invest OTC': {
      es: 'Invertir OTC', fr: 'Investir OTC', de: 'OTC Investieren', pt: 'Investir OTC', ar: 'استثمار OTC',
      'zh-CN': 'OTC 投资', ru: 'OTC Инвестиции', ja: 'OTC投資', tr: 'OTC Yatırım'
    },
    'Deposit': {
      es: 'Depositar', fr: 'Dépôt', de: 'Einzahlen', pt: 'Depositar', ar: 'إيداع',
      'zh-CN': '充值', ru: 'Пополнить', ja: '入金', tr: 'Para Yatır'
    },
    'Withdraw': {
      es: 'Retirar', fr: 'Retrait', de: 'Auszahlen', pt: 'Sacar', ar: 'سحب',
      'zh-CN': '提现', ru: 'Вывести', ja: '出金', tr: 'Para Çek'
    },
    'Transactions': {
      es: 'Transacciones', fr: 'Transactions', de: 'Transaktionen', pt: 'Transações', ar: 'المعاملات',
      'zh-CN': '交易记录', ru: 'Транзакции', ja: '取引履歴', tr: 'İşlemler'
    },
    'Profile Settings': {
      es: 'Configuración de Perfil', fr: 'Paramètres du Profil', de: 'Profileinstellungen', pt: 'Configurações de Perfil', ar: 'إعدادات الملف',
      'zh-CN': '个人设置', ru: 'Настройки профиля', ja: 'プロフィール設定', tr: 'Profil Ayarları'
    },
    'Support': {
      es: 'Soporte', fr: 'Support', de: 'Support', pt: 'Suporte', ar: 'الدعم',
      'zh-CN': '客户支持', ru: 'Поддержка', ja: 'サポート', tr: 'Destek'
    },
    'Total Wallet Balance': {
      es: 'Saldo Total de Billetera', fr: 'Solde Total du Portefeuille', de: 'Gesamtguthaben', pt: 'Saldo Total da Carteira', ar: 'إجمالي رصيد المحفظة',
      'zh-CN': '钱包总余额', ru: 'Общий баланс кошелька', ja: '総ウォレット残高', tr: 'Toplam Cüzdan Bakiyesi'
    },
    'Exchange Wallet': {
      es: 'Billetera Exchange', fr: 'Portefeuille Exchange', de: 'Exchange-Wallet', pt: 'Carteira Exchange', ar: 'محفظة التداول',
      'zh-CN': '交易钱包', ru: 'Биржевой кошелёк', ja: '取引ウォレット', tr: 'Borsa Cüzdanı'
    },
    'Invested Capital': {
      es: 'Capital Invertido', fr: 'Capital Investi', de: 'Investiertes Kapital', pt: 'Capital Investido', ar: 'رأس المال المستثمر',
      'zh-CN': '已投本金', ru: 'Инвестированный капитал', ja: '投資元本', tr: 'Yatırılan Sermaye'
    },
    'Accrued Profit': {
      es: 'Beneficio Acumulado', fr: 'Profit Accumulé', de: 'Aufgelaufener Gewinn', pt: 'Lucro Acumulado', ar: 'الأرباح المستحقة',
      'zh-CN': '累计收益', ru: 'Начисленная прибыль', ja: '発生利益', tr: 'Birikmiş Kâr'
    },
    'Verified Portfolio': {
      es: 'Portafolio Verificado', fr: 'Portefeuille Vérifié', de: 'Verifiziertes Portfolio', pt: 'Portfólio Verificado', ar: 'محفظة موثقة',
      'zh-CN': '已认证投资组合', ru: 'Верифицированный портфель', ja: '認証済みポートフォリオ', tr: 'Onaylı Portföy'
    },
    'Investor': {
      es: 'Inversor', fr: 'Investisseur', de: 'Investor', pt: 'Investidor', ar: 'مستثمر',
      'zh-CN': '投资者', ru: 'Инвестор', ja: '投資家', tr: 'Yatırımcı'
    },
    'Back to PrimeHavenCapital': {
      es: 'Volver a PrimeHavenCapital', fr: 'Retour à PrimeHavenCapital', de: 'Zurück zu PrimeHavenCapital', pt: 'Voltar para PrimeHavenCapital', ar: 'العودة إلى PrimeHavenCapital',
      'zh-CN': '返回 PrimeHavenCapital', ru: 'Назад на PrimeHavenCapital', ja: 'PrimeHavenCapitalに戻る', tr: 'PrimeHavenCapital’a Dön'
    },
    'Institutional Custody Portal': {
      es: 'Portal de Custodia Institucional', fr: 'Portail de Conservation Institutionnelle', de: 'Institutionelles Verwahrportal', pt: 'Portal de Custódia Institucional', ar: 'بوابة الحفظ المؤسسي',
      'zh-CN': '机构托管门户', ru: 'Портал институционального хранения', ja: '機関カストディポータル', tr: 'Kurumsal Saklama Portalı'
    },
    'Private Wealth & Audited OTC Execution': {
      es: 'Patrimonio Privado y Ejecución OTC Auditada', fr: 'Gestion Privée & Exécution OTC Auditée', de: 'Private Wealth & geprüfte OTC-Ausführung', pt: 'Gestão Privada e Execução OTC Auditada', ar: 'إدارة الثروات وتنفيذ OTC مدقق',
      'zh-CN': '私人财富管理与经审计场外执行', ru: 'Частный капитал и аудированное OTC-исполнение', ja: 'プライベートウェルス＆監査済みOTC執行', tr: 'Özel Varlık ve Denetlenen OTC İşlemleri'
    },
    'Sign In to Your Account': {
      es: 'Inicia Sesión en tu Cuenta', fr: 'Connectez-vous à votre compte', de: 'In Ihr Konto einloggen', pt: 'Entre na sua Conta', ar: 'تسجيل الدخول إلى حسابك',
      'zh-CN': '登录您的账户', ru: 'Вход в аккаунт', ja: 'アカウントにサインイン', tr: 'Hesabınıza Giriş Yapın'
    },
    'Create Investor Account': {
      es: 'Crear Cuenta de Inversor', fr: 'Créer un Compte Investisseur', de: 'Anlegerkonto erstellen', pt: 'Criar Conta de Investidor', ar: 'إنشاء حساب مستثمر',
      'zh-CN': '创建投资者账户', ru: 'Создать счёт инвестора', ja: '投資家アカウント作成', tr: 'Yatırımcı Hesabı Oluştur'
    },
    'Reset Password': {
      es: 'Restablecer Contraseña', fr: 'Réinitialiser le Mot de Passe', de: 'Passwort zurücksetzen', pt: 'Redefinir Senha', ar: 'إعادة تعيين كلمة المرور',
      'zh-CN': '重置密码', ru: 'Сбросить пароль', ja: 'パスワード再設定', tr: 'Şifreyi Sıfırla'
    },
    'Platform': {
      es: 'Plataforma', fr: 'Plateforme', de: 'Plattform', pt: 'Plataforma', ar: 'المنصة',
      'zh-CN': '平台', ru: 'Платформа', ja: 'プラットフォーム', tr: 'Platform'
    },
    'Client Portal': {
      es: 'Portal del Cliente', fr: 'Portail Client', de: 'Kundenportal', pt: 'Portal do Cliente', ar: 'بوابة العميل',
      'zh-CN': '客户门户', ru: 'Кабинет клиента', ja: 'クライアントポータル', tr: 'Müşteri Portalı'
    },
    'Select Language': {
      es: 'Seleccionar Idioma', fr: 'Choisir la langue', de: 'Sprache wählen', pt: 'Selecionar Idioma', ar: 'اختر اللغة',
      'zh-CN': '选择语言', ru: 'Выберите язык', ja: '言語を選択', tr: 'Dil Seçin'
    }
  };

  var UNIT_DAYS = {
    es: 'Días', fr: 'Jours', de: 'Tage', pt: 'Dias', ar: 'أيام',
    'zh-CN': '天', ru: 'дней', ja: '日', tr: 'Gün'
  };
  var UNIT_ACTIVE_PLANS = {
    es: 'Planes Activos', fr: 'Plans Actifs', de: 'Aktive Pläne', pt: 'Planos Ativos', ar: 'خطط نشطة',
    'zh-CN': '个有效计划', ru: 'активных планов', ja: '件の有効プラン', tr: 'Aktif Plan'
  };

  var _isTranslatingDOM = false;
  var _googleScriptLoaded = false;

  function translateTextString(origText, lang) {
    if (!origText || lang === 'en') return origText;
    var trimmed = origText.trim();
    if (!trimmed) return origText;

    // Never touch pure numbers, currency figures, or percentages
    if (/^[\s+$€£0-9.,%\-\/]+$/.test(trimmed)) return origText;

    var lead = origText.slice(0, origText.indexOf(trimmed));
    var trail = origText.slice(origText.indexOf(trimmed) + trimmed.length);

    if (PHRASE_DICT[trimmed] && PHRASE_DICT[trimmed][lang]) {
      return lead + PHRASE_DICT[trimmed][lang] + trail;
    }

    var daysMatch = trimmed.match(/^(\d+)\s+Days?$/i);
    if (daysMatch && UNIT_DAYS[lang]) {
      return lead + daysMatch[1] + ' ' + UNIT_DAYS[lang] + trail;
    }

    var activePlansMatch = trimmed.match(/^(\d+)\s+Active\s+Plans?$/i);
    if (activePlansMatch && UNIT_ACTIVE_PLANS[lang]) {
      return lead + activePlansMatch[1] + ' ' + UNIT_ACTIVE_PLANS[lang] + trail;
    }

    return origText;
  }

  function isSkippedElement(el) {
    if (!el || !el.tagName) return true;
    var tag = el.tagName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE' || tag === 'PRE' || tag === 'SVG' || tag === 'SELECT' || tag === 'OPTION' || tag === 'TEXTAREA' || tag === 'INPUT') {
      return true;
    }
    if (el.id === 'google_translate_element') return true;
    if (el.classList && (el.classList.contains('notranslate') || el.classList.contains('skiptranslate'))) {
      return true;
    }
    return false;
  }

  function collectTextNodes(root, out) {
    if (!root || !root.childNodes) return;
    for (var i = 0; i < root.childNodes.length; i++) {
      var node = root.childNodes[i];
      if (!node) continue;
      if (node.nodeType === 3) {
        out.push(node);
      } else if (node.nodeType === 1 && !isSkippedElement(node)) {
        collectTextNodes(node, out);
      }
    }
  }

  function writeGoogTransCookie(lang) {
    try {
      if (typeof document.cookie !== 'string') return;
      if (!lang || lang === 'en') {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      } else {
        document.cookie = 'googtrans=/en/' + lang + '; path=/;';
      }
    } catch (e) {}
  }

  function syncGoogleTranslateWidget(lang) {
    try {
      var combo = typeof document.querySelector === 'function' ? document.querySelector('.goog-te-combo') : null;
      if (combo) {
        combo.value = (lang === 'en') ? '' : lang;
        if (typeof combo.dispatchEvent === 'function' && typeof Event === 'function') {
          combo.dispatchEvent(new Event('change'));
        }
        return;
      }
      if (lang !== 'en' && !_googleScriptLoaded && typeof window.location !== 'undefined' && window.location && String(window.location.protocol || '').indexOf('http') === 0 && typeof document.createElement === 'function' && document.head && typeof document.head.appendChild === 'function') {
        _googleScriptLoaded = true;
        if (!document.getElementById('google_translate_element') && document.body && typeof document.body.appendChild === 'function') {
          var holder = document.createElement('div');
          holder.id = 'google_translate_element';
          holder.className = 'notranslate';
          document.body.appendChild(holder);
        }
        window.googleTranslateElementInit = function() {
          try {
            if (window.google && window.google.translate && window.google.translate.TranslateElement) {
              new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: Object.keys(SUPPORTED_LANGUAGES).join(','),
                autoDisplay: false
              }, 'google_translate_element');
            }
          } catch (err) {}
        };
        var gtScript = document.createElement('script');
        gtScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        gtScript.async = true;
        document.head.appendChild(gtScript);
      }
    } catch (e) {}
  }

  function mountLanguageSwitcherIfMissing() {
    try {
      if (typeof document.querySelector !== 'function' || typeof document.createElement !== 'function') return;
      if (document.getElementById('vx-lang-select')) return;
      var themeBtn = document.querySelector('.theme-toggle-btn');
      if (!themeBtn || !themeBtn.parentNode) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'vx-lang-switcher notranslate';
      var select = document.createElement('select');
      select.id = 'vx-lang-select';
      select.className = 'vx-lang-select';
      select.setAttribute('aria-label', 'Select Language');
      Object.keys(SUPPORTED_LANGUAGES).forEach(function(code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = SUPPORTED_LANGUAGES[code].label;
        select.appendChild(opt);
      });
      select.value = getSavedLanguage();
      select.addEventListener('change', function() {
        window.PrimeHavenTranslator.setLanguage(this.value);
      });
      wrapper.appendChild(select);
      themeBtn.parentNode.insertBefore(wrapper, themeBtn);
    } catch (e) {}
  }

  function getSavedLanguage() {
    try {
      var saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES[saved]) return saved;
    } catch (e) {}
    return 'en';
  }

  window.PrimeHavenTranslator = {
    STORAGE_KEY: LANG_STORAGE_KEY,
    LANGUAGES: SUPPORTED_LANGUAGES,
    DICTIONARY: PHRASE_DICT,
    getLanguage: getSavedLanguage,
    translateDOM: function(lang, root) {
      var targetLang = (lang && SUPPORTED_LANGUAGES[lang]) ? lang : 'en';
      var container = root || document.body;
      if (!container) return;
      _isTranslatingDOM = true;
      try {
        var textNodes = [];
        collectTextNodes(container, textNodes);
        for (var i = 0; i < textNodes.length; i++) {
          var tn = textNodes[i];
          if (typeof tn.__vxOrig === 'undefined') {
            tn.__vxOrig = tn.nodeValue;
          }
          var nextVal = (targetLang === 'en') ? tn.__vxOrig : translateTextString(tn.__vxOrig, targetLang);
          if (tn.nodeValue !== nextVal) {
            tn.nodeValue = nextVal;
          }
        }
        if (typeof container.querySelectorAll === 'function') {
          var placeholders = container.querySelectorAll('input[placeholder], textarea[placeholder]');
          for (var j = 0; j < placeholders.length; j++) {
            var el = placeholders[j];
            var origPh = el.getAttribute('data-vx-orig-placeholder');
            if (!origPh) {
              origPh = el.getAttribute('placeholder') || '';
              el.setAttribute('data-vx-orig-placeholder', origPh);
            }
            var translatedPh = (targetLang === 'en') ? origPh : translateTextString(origPh, targetLang);
            if (el.getAttribute('placeholder') !== translatedPh) {
              el.setAttribute('placeholder', translatedPh);
            }
          }
        }
      } finally {
        _isTranslatingDOM = false;
      }
    },
    setLanguage: function(lang) {
      var validLang = (lang && SUPPORTED_LANGUAGES[lang]) ? lang : 'en';
      var langMeta = SUPPORTED_LANGUAGES[validLang];
      try {
        localStorage.setItem(LANG_STORAGE_KEY, validLang);
      } catch (e) {}

      if (document.documentElement) {
        if (typeof document.documentElement.setAttribute === 'function') {
          document.documentElement.setAttribute('lang', validLang);
          document.documentElement.setAttribute('dir', langMeta.dir || 'ltr');
        }
        document.documentElement.lang = validLang;
        document.documentElement.dir = langMeta.dir || 'ltr';
      }

      writeGoogTransCookie(validLang);

      try {
        if (typeof document.querySelectorAll === 'function') {
          var selects = document.querySelectorAll('.vx-lang-select, #vx-lang-select');
          for (var i = 0; i < selects.length; i++) {
            if (selects[i].value !== validLang) selects[i].value = validLang;
          }
        }
      } catch (e) {}

      this.translateDOM(validLang, document.body);
      syncGoogleTranslateWidget(validLang);
      return validLang;
    }
  };

  // Setup UI event handlers once DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    mountLanguageSwitcherIfMissing();
    var activeLang = window.PrimeHavenTranslator.getLanguage();
    window.PrimeHavenTranslator.setLanguage(activeLang);

    var currentUser = getLoggedInUser();

    // Dynamically update Desktop Header Auth Buttons on landing pages if logged in
    if (currentUser) {
      var targetDashboard = (currentUser.role === 'admin') ? 'admin.html' : 'dashboard.html';
      
      // Find desktop auth buttons container in header
      var headerNavContainers = document.querySelectorAll('header .xl\\:flex.hidden');
      headerNavContainers.forEach(function(container) {
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

    var menuButtons = document.querySelectorAll('button.flex-col, #mobile-menu-btn');
    menuButtons.forEach(function(btn) {
      if (btn.getAttribute('onclick')) return;
      btn.addEventListener('click', function(e) {
        window.toggleMobileNavDrawer(e, btn);
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

    var observer = new MutationObserver(function(mutations) {
      removeFloatingChatWidget();
      if (_isTranslatingDOM) return;
      var curLang = window.PrimeHavenTranslator ? window.PrimeHavenTranslator.getLanguage() : 'en';
      if (curLang === 'en') return;
      var hasNewContent = false;
      if (mutations && mutations.length) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.addedNodes && m.addedNodes.length > 0) {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var added = m.addedNodes[j];
              if (added.nodeType === 1 && !isSkippedElement(added)) {
                hasNewContent = true;
                break;
              } else if (added.nodeType === 3) {
                hasNewContent = true;
                break;
              }
            }
          }
          if (hasNewContent) break;
        }
      }
      if (hasNewContent) {
        window.PrimeHavenTranslator.translateDOM(curLang, document.body);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

  });
})();


