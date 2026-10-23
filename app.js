/**
 * ==========================================================================
 * SKILLSWAP PLATFORM - CORE FRONTEND JAVASCRIPT ARCHITECTURE
 * ==========================================================================
 * Strictly Vanilla ES6+ (No external frameworks)
 * Modular design ready for Python Flask + MongoDB + Google OAuth backend
 */

// ==========================================================================
// 1. BACKEND API SERVICE & CONFIGURATION
// ==========================================================================
const CONFIG = {
  API_BASE_URL: 'http://localhost:5000',
  USE_MOCK_BACKEND: true, // Set to false when connecting to running Flask backend
  ENDPOINTS: {
    // Auth Routes
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    GOOGLE_OAUTH: '/auth/google',
    ADMIN_LOGIN: '/api/auth/admin-login',
    LOGOUT: '/api/auth/logout',

    // Profile & Skills Routes
    GET_PROFILE: '/api/profile',
    UPDATE_PROFILE: '/api/profile/update',

    // Discovery & Users Routes
    GET_USERS: '/api/users',
    SEARCH_USERS: '/api/users/search',

    // Swaps & Ratings Routes
    GET_SWAPS: '/api/swaps',
    CREATE_SWAP: '/api/swaps/create',
    UPDATE_SWAP_STATUS: (id) => `/api/swaps/${id}/status`,
    SUBMIT_REVIEW: (id) => `/api/swaps/${id}/review`,

    // AI Intelligence Routes
    AI_CHAT: '/api/ai/chat',
    AI_SUMMARIZE_PROFILE: (id) => `/api/ai/summarize-profile/${id}`,
    AI_MATCH: '/api/ai/match',

    // Admin Routes
    ADMIN_MODERATION: '/api/admin/moderation',
    ADMIN_MODERATION_ACTION: (id) => `/api/admin/moderation/${id}/action`,
    ADMIN_SWAPS: '/api/admin/swaps',
    ADMIN_BROADCAST: '/api/admin/broadcast',
    ADMIN_EXPORT: (type, format) => `/api/admin/export/${type}?format=${format}`
  }
};

/**
 * Universal API Request Wrapper
 * Handles both real Flask backend HTTP requests and rich offline mock fallbacks
 */
const ApiService = {
  async request(endpoint, options = {}) {
    if (!CONFIG.USE_MOCK_BACKEND) {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('skillswap_token') || ''}`,
            ...options.headers
          },
          ...options
        });
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.warn(`[ApiService] Flask backend request failed, falling back to local state:`, error);
      }
    }

    // Realistic asynchronous latency simulation (150ms) for local mock operations
    await new Promise(resolve => setTimeout(resolve, 150));
    return null;
  }
};

// ==========================================================================
// 2. INITIAL SEED DATA & LOCAL APPLICATION STATE
// ==========================================================================

const DEFAULT_CURRENT_USER = {
  id: 'usr_alex_01',
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  role: 'user', // 'user' or 'admin'
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  location: 'San Francisco, CA (PST)',
  headline: 'Senior Python & Backend Developer',
  bio: 'Senior Python & Backend Developer with 5+ years building APIs, microservices, and data pipelines. Passionate about learning UI/UX design and pottery!',
  visibility: 'public',
  availability: ['Weekends', 'Weekday Evenings'],
  skillsOffered: ['Python Programming', 'Flask Web Dev', 'SQL & Databases'],
  skillsWanted: ['Figma UI/UX', 'Digital Illustration'],
  rating: 4.9,
  swapsCompleted: 8
};

const SEED_USERS = [
  {
    id: 'usr_02',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    location: 'Berlin, Germany (CET)',
    rating: 4.95,
    reviewCount: 14,
    availability: 'Weekends',
    visibility: 'public',
    bio: 'Product Designer at a FinTech startup. I craft design systems, Figma component architectures, and micro-interactions.',
    skillsOffered: ['Figma UI/UX', 'Design Systems', 'User Research'],
    skillsWanted: ['Python Programming', 'Data Analysis']
  },
  {
    id: 'usr_03',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    location: 'Austin, TX (CST)',
    rating: 4.88,
    reviewCount: 9,
    availability: 'Weekday Evenings',
    visibility: 'public',
    bio: 'Audio engineer and indie guitarist. Offering hands-on acoustic guitar tutorials, chord theory, and home studio mixing.',
    skillsOffered: ['Guitar Basics', 'Audio Mixing & Logic Pro', 'Songwriting'],
    skillsWanted: ['Flask Web Dev', 'SEO Marketing']
  },
  {
    id: 'usr_04',
    name: 'Sofia Martinez',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    location: 'Barcelona, Spain (CET)',
    rating: 4.92,
    reviewCount: 22,
    availability: 'Weekday Evenings',
    visibility: 'public',
    bio: 'Native Spanish speaker and linguistic tutor. Enthusiastic about exchanging conversational Spanish for machine learning fundamentals.',
    skillsOffered: ['Spanish Conversational', 'DELE Exam Prep', 'Creative Writing'],
    skillsWanted: ['Python Programming', 'Excel & Financial Modeling']
  },
  {
    id: 'usr_05',
    name: 'Kenji Takahashi',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    location: 'Tokyo, Japan (JST)',
    rating: 5.0,
    reviewCount: 11,
    availability: 'Custom Availability',
    visibility: 'public',
    bio: 'Landscape & street photographer. I teach manual mirrorless camera controls, Lightroom color grading, and street composition.',
    skillsOffered: ['Photography & Lightroom', 'Photo Editing', 'Japanese Basics'],
    skillsWanted: ['Figma UI/UX', 'Web Development']
  },
  {
    id: 'usr_06',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    location: 'Toronto, Canada (EST)',
    rating: 4.75,
    reviewCount: 16,
    availability: 'Weekends',
    visibility: 'public',
    bio: 'Growth Marketing Lead with 6+ years experience in B2B SaaS, Google Ads, and technical search engine optimization.',
    skillsOffered: ['SEO Marketing', 'Content Strategy', 'Google Analytics'],
    skillsWanted: ['Python Programming', 'SQL & Databases']
  },
  {
    id: 'usr_07',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    location: 'Seattle, WA (PST)',
    rating: 4.82,
    reviewCount: 7,
    availability: 'Weekday Evenings',
    visibility: 'public',
    bio: 'Financial analyst skilled in advanced Excel dashboards, financial modeling, VBA scripting, and pitch decks.',
    skillsOffered: ['Excel & Financial Modeling', 'Business Valuation', 'VBA Automation'],
    skillsWanted: ['Flask Web Dev', 'Public Speaking']
  }
];

const SEED_SWAPS = [
  {
    id: 'swp_101',
    type: 'incoming',
    partnerId: 'usr_02',
    partnerName: 'Elena Rostova',
    partnerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    partnerLocation: 'Berlin, Germany',
    skillWantedFromUser: 'Python Programming',
    skillOfferedToUser: 'Figma UI/UX',
    status: 'pending', // 'pending', 'accepted', 'completed', 'cancelled'
    message: 'Hey Alex! I saw you build Python APIs. I want to automate data processing for my design research, and I can teach you Figma autolayout and design tokens in exchange!',
    date: '2 hours ago',
    compatibilityScore: '98% Dual Match'
  },
  {
    id: 'swp_102',
    type: 'incoming',
    partnerId: 'usr_04',
    partnerName: 'Sofia Martinez',
    partnerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    partnerLocation: 'Barcelona, Spain',
    skillWantedFromUser: 'SQL & Databases',
    skillOfferedToUser: 'Spanish Conversational',
    status: 'pending',
    message: 'Hola! I would love to learn basic SQL queries for business data. In return, I can help you practice fluent conversational Spanish every Saturday morning!',
    date: 'Yesterday',
    compatibilityScore: '86% Match'
  },
  {
    id: 'swp_103',
    type: 'outgoing',
    partnerId: 'usr_05',
    partnerName: 'Kenji Takahashi',
    partnerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    partnerLocation: 'Tokyo, Japan',
    skillWantedFromPartner: 'Photography & Lightroom',
    skillOfferedFromUser: 'Flask Web Dev',
    status: 'pending',
    message: 'Hi Kenji! I love your street photography. I want to learn Lightroom color grading, and I would love to build a custom portfolio website for you with Flask in return.',
    date: '3 days ago'
  },
  {
    id: 'swp_104',
    type: 'active',
    partnerId: 'usr_03',
    partnerName: 'Marcus Vance',
    partnerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    partnerLocation: 'Austin, TX',
    skillWantedFromPartner: 'Guitar Basics',
    skillOfferedFromUser: 'Python Programming',
    status: 'accepted',
    message: 'Swap agreed on Oct 18. Scheduled 3 sessions completed so far.',
    date: 'Active since Oct 18'
  },
  {
    id: 'swp_105',
    type: 'completed',
    partnerId: 'usr_07',
    partnerName: 'David Kim',
    partnerAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    partnerLocation: 'Seattle, WA',
    skillWantedFromPartner: 'Excel & Financial Modeling',
    skillOfferedFromUser: 'SQL & Databases',
    status: 'completed',
    message: 'Exchange completed on Oct 14.',
    hasReviewed: false,
    date: 'Completed Oct 14'
  }
];

const SEED_MODERATION = [
  {
    id: 'mod_01',
    type: 'skill',
    targetUser: 'crypto_trader_99',
    userEmail: 'trader99@tempmail.com',
    content: 'Guaranteed 500% ROI Forex Signals and Telegram VIP Pump Group Access',
    aiCategory: 'Commercial Spam',
    aiConfidence: '99.4%',
    aiReason: 'Direct violation of non-monetary peer barter policy. Advertising commercial financial advisory & speculative Telegram groups.',
    flaggedDate: '2026-10-23 10:14'
  },
  {
    id: 'mod_02',
    type: 'user',
    targetUser: 'bot_scripter_x',
    userEmail: 'crawler2@botfarm.io',
    content: 'Selling cracked Adobe Photoshop and AutoCAD licenses in exchange for gift cards',
    aiCategory: 'Fraudulent Offering',
    aiConfidence: '98.7%',
    aiReason: 'Offering pirated software and requesting monetary gift cards rather than organic peer skill exchange.',
    flaggedDate: '2026-10-23 12:45'
  },
  {
    id: 'mod_03',
    type: 'skill',
    targetUser: 'anonymous_learner',
    userEmail: 'anon198@protonmail.com',
    content: 'Will teach basic keyboard typing for $50/hour cash only',
    aiCategory: 'Policy Breach (Cash Demand)',
    aiConfidence: '96.2%',
    aiReason: 'Platform strictly forbids monetary charges. All exchanges must be mutual knowledge barter.',
    flaggedDate: '2026-10-23 14:10'
  },
  {
    id: 'mod_04',
    type: 'user',
    targetUser: 'rude_user_77',
    userEmail: 'user77@mail.com',
    content: 'Harassing messages reported in swap request chat regarding partner nationality.',
    aiCategory: 'Harassment & Abuse',
    aiConfidence: '97.1%',
    aiReason: 'Violates community respect guidelines. AI sentiment analysis detected hostile and discriminatory language.',
    flaggedDate: '2026-10-23 15:30'
  }
];

// Persistent State Handler (Loaded from LocalStorage or seed fallback)
const AppState = {
  currentUser: JSON.parse(localStorage.getItem('skillswap_user')) || DEFAULT_CURRENT_USER,
  role: localStorage.getItem('skillswap_role') || 'user',
  users: JSON.parse(localStorage.getItem('skillswap_all_users')) || SEED_USERS,
  swaps: JSON.parse(localStorage.getItem('skillswap_swaps')) || SEED_SWAPS,
  moderationItems: JSON.parse(localStorage.getItem('skillswap_moderation')) || SEED_MODERATION,
  broadcast: JSON.parse(localStorage.getItem('skillswap_broadcast')) || {
    active: true,
    type: 'announcement',
    text: '🚀 Welcome to SkillSwap 2.0! Try the new AI Assistant to find mutual swap matches instantly.'
  },
  currentView: 'explore',
  activeCategory: 'all',
  searchQuery: '',
  filterAvailability: 'all',
  filterRating: 0,
  activeSwapSubtab: 'incoming',
  activeAdminTab: 'moderation',
  adminSwapFilter: 'all',
  chatMessages: [
    {
      sender: 'ai',
      text: "Hello Alex! I am your SkillSwap AI Assistant. I can help you find complementary swappers, draft swap proposals, or summarize user profiles using RAG intelligence. How can I assist you today?",
      actions: null
    }
  ]
};

function saveStateToStorage() {
  localStorage.setItem('skillswap_user', JSON.stringify(AppState.currentUser));
  localStorage.setItem('skillswap_role', AppState.role);
  localStorage.setItem('skillswap_all_users', JSON.stringify(AppState.users));
  localStorage.setItem('skillswap_swaps', JSON.stringify(AppState.swaps));
  localStorage.setItem('skillswap_moderation', JSON.stringify(AppState.moderationItems));
  localStorage.setItem('skillswap_broadcast', JSON.stringify(AppState.broadcast));
}

// ==========================================================================
// 3. TOAST NOTIFICATIONS & UI FEEDBACK
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  } else if (type === 'error') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  } else {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-closing');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ==========================================================================
// 4. NAVIGATION & VIEW ROUTING
// ==========================================================================
function navigateTo(viewId) {
  AppState.currentView = viewId;

  // Update navbar button classes
  document.querySelectorAll('.nav-link-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`navBtn-${viewId}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Toggle view sections
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) targetSec.classList.add('active');

  // Specific render triggers
  if (viewId === 'explore') renderExploreProfiles();
  if (viewId === 'profile') syncProfileFormData();
  if (viewId === 'swaps') renderSwapsList();
  if (viewId === 'ai') renderAiChatHistory();
  if (viewId === 'admin') renderAdminView();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleUserDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('show');
}

// Close user dropdown on outside click
document.addEventListener('click', () => {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.remove('show');
});

function toggleDemoRole() {
  if (AppState.role === 'user') {
    AppState.role = 'admin';
    AppState.currentUser.role = 'admin';
    showToast('Switched to Administrator Mode', 'info');
    navigateTo('admin');
  } else {
    AppState.role = 'user';
    AppState.currentUser.role = 'user';
    showToast('Switched to User Mode', 'info');
    navigateTo('explore');
  }
  saveStateToStorage();
  updateNavbarUserSnippet();
}

function updateNavbarUserSnippet() {
  const nameEl = document.getElementById('navUserName');
  const avatarEl = document.getElementById('navUserAvatar');
  const roleBadge = document.getElementById('navRoleBadge');
  const roleToggleText = document.getElementById('roleToggleText');

  if (nameEl) nameEl.textContent = AppState.currentUser.name;
  if (avatarEl) avatarEl.src = AppState.currentUser.avatar;
  if (roleBadge) {
    if (AppState.role === 'admin') {
      roleBadge.textContent = 'Admin';
      roleBadge.className = 'role-tag-mini role-tag-admin';
      if (roleToggleText) roleToggleText.textContent = 'Switch to User Mode';
    } else {
      roleBadge.textContent = 'User';
      roleBadge.className = 'role-tag-mini role-tag-user';
      if (roleToggleText) roleToggleText.textContent = 'Switch to Admin Mode';
    }
  }

  // Update pending swaps badge
  const pendingCount = AppState.swaps.filter(s => s.type === 'incoming' && s.status === 'pending').length;
  const swapsCounter = document.getElementById('swapsNavCounter');
  if (swapsCounter) {
    swapsCounter.textContent = pendingCount;
    swapsCounter.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
}

function handleLogout() {
  showToast('Logging out...', 'info');
  localStorage.removeItem('skillswap_user');
  localStorage.removeItem('skillswap_role');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

// ==========================================================================
// 5. GLOBAL BROADCAST BANNER COMPONENT
// ==========================================================================
function renderBroadcastBanner() {
  const container = document.getElementById('broadcastContainer');
  const banner = document.getElementById('broadcastBanner');
  const tag = document.getElementById('broadcastTypeTag');
  const text = document.getElementById('broadcastMessageText');

  if (!AppState.broadcast || !AppState.broadcast.active) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  text.textContent = AppState.broadcast.text;

  banner.className = 'glass-elevated broadcast-banner';
  if (AppState.broadcast.type === 'warning') {
    banner.classList.add('alert-warning');
    tag.textContent = 'Advisory';
  } else if (AppState.broadcast.type === 'critical') {
    banner.classList.add('alert-critical');
    tag.textContent = 'Urgent Notice';
  } else {
    tag.textContent = 'Announcement';
  }
}

function dismissBroadcast() {
  const container = document.getElementById('broadcastContainer');
  container.style.display = 'none';
  showToast('Broadcast banner dismissed for this session', 'info');
}

// ==========================================================================
// 6. VIEW 1: SEARCH & DISCOVERY (EXPLORE)
// ==========================================================================
function handleSearchInput() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  AppState.searchQuery = input.value.trim().toLowerCase();

  if (AppState.searchQuery) {
    clearBtn.classList.add('visible');
  } else {
    clearBtn.classList.remove('visible');
  }
  applyFilters();
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  input.value = '';
  document.getElementById('searchClearBtn').classList.remove('visible');
  AppState.searchQuery = '';
  applyFilters();
}

function setCategoryFilter(category, buttonEl) {
  AppState.activeCategory = category;
  document.querySelectorAll('#categoryChips .category-chip').forEach(c => c.classList.remove('active'));
  if (buttonEl) buttonEl.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const availSelect = document.getElementById('filterAvailability');
  const ratingSelect = document.getElementById('filterRating');

  AppState.filterAvailability = availSelect ? availSelect.value : 'all';
  AppState.filterRating = ratingSelect ? parseFloat(ratingSelect.value) : 0;

  renderExploreProfiles();
}

function renderExploreProfiles() {
  const grid = document.getElementById('profilesGrid');
  if (!grid) return;

  const filtered = AppState.users.filter(user => {
    // Visibility Check (Skip private profiles unless it's self)
    if (user.visibility === 'private') return false;

    // Search query check
    if (AppState.searchQuery) {
      const matchName = user.name.toLowerCase().includes(AppState.searchQuery);
      const matchLoc = user.location.toLowerCase().includes(AppState.searchQuery);
      const matchOffered = user.skillsOffered.some(s => s.toLowerCase().includes(AppState.searchQuery));
      const matchWanted = user.skillsWanted.some(s => s.toLowerCase().includes(AppState.searchQuery));
      if (!matchName && !matchLoc && !matchOffered && !matchWanted) return false;
    }

    // Category chip check
    if (AppState.activeCategory !== 'all') {
      const cat = AppState.activeCategory.toLowerCase();
      const matchOfferedCat = user.skillsOffered.some(s => s.toLowerCase().includes(cat));
      const matchWantedCat = user.skillsWanted.some(s => s.toLowerCase().includes(cat));
      if (!matchOfferedCat && !matchWantedCat) return false;
    }

    // Availability check
    if (AppState.filterAvailability !== 'all') {
      if (user.availability !== AppState.filterAvailability) return false;
    }

    // Rating check
    if (AppState.filterRating > 0) {
      if (user.rating < AppState.filterRating) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="glass-card empty-state-card" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <h3 class="empty-state-title">No swappers match your current filters</h3>
        <p class="empty-state-sub">Try searching for a different skill or reset your availability and rating filters.</p>
        <button type="button" class="btn btn-primary" onclick="resetAllFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(user => `
    <article class="glass-card profile-card" id="card-${user.id}">
      <div>
        <div class="profile-card-header">
          <div class="profile-avatar-container">
            <img src="${user.avatar}" alt="${user.name}" class="profile-avatar-img">
            <span class="profile-status-dot" title="Active Swapper"></span>
          </div>
          <div class="profile-meta">
            <div class="profile-name-row">
              <h3 class="profile-name">${user.name}</h3>
              <span class="profile-rating">★ ${user.rating} (${user.reviewCount || 6})</span>
            </div>
            <div class="profile-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span>${user.location}</span>
            </div>
            <span class="profile-availability-badge">🕒 ${user.availability}</span>
          </div>
        </div>

        <p class="profile-bio">${user.bio}</p>

        <!-- Skills Section -->
        <div class="card-skills-section">
          <div class="skill-group-offered">
            <div class="skill-group-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Skills Offered (Teaches)
            </div>
            <div class="skill-tags-wrap">
              ${user.skillsOffered.map(s => `<span class="skill-tag-pill skill-tag-offered">${s}</span>`).join('')}
            </div>
          </div>

          <div class="skill-group-wanted">
            <div class="skill-group-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Skills Wanted (Learns)
            </div>
            <div class="skill-tags-wrap">
              ${user.skillsWanted.map(s => `<span class="skill-tag-pill skill-tag-wanted">${s}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="profile-card-footer">
        <button type="button" class="btn btn-primary btn-swap" onclick="openSwapRequestModal('${user.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"></path></svg>
          <span>Request Swap</span>
        </button>
        <button type="button" class="btn btn-glass" onclick="triggerAiProfileSummary('${user.id}')" title="Generate AI Compatibility Insight">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span>AI Insight</span>
        </button>
      </div>
    </article>
  `).join('');
}

function resetAllFilters() {
  AppState.searchQuery = '';
  AppState.activeCategory = 'all';
  AppState.filterAvailability = 'all';
  AppState.filterRating = 0;

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  const filterAvail = document.getElementById('filterAvailability');
  if (filterAvail) filterAvail.value = 'all';
  const filterRating = document.getElementById('filterRating');
  if (filterRating) filterRating.value = '0';
  document.querySelectorAll('#categoryChips .category-chip').forEach((c, i) => {
    c.classList.toggle('active', i === 0);
  });
  renderExploreProfiles();
}

// ==========================================================================
// 7. VIEW 2: USER PROFILE & SKILLS MANAGEMENT
// ==========================================================================
function syncProfileFormData() {
  const user = AppState.currentUser;

  // Sidebar
  document.getElementById('sidebarAvatarPreview').src = user.avatar;
  document.getElementById('sidebarName').textContent = user.name;
  document.getElementById('sidebarEmail').textContent = user.email;
  document.getElementById('sidebarRating').textContent = `★ ${user.rating} Rating`;
  document.getElementById('sidebarSwapsCount').textContent = `${user.swapsCompleted} Swaps`;

  const toggle = document.getElementById('profileVisibilityToggle');
  toggle.checked = user.visibility === 'public';
  updateVisibilityText(toggle.checked);

  // Form Fields
  document.getElementById('profileFullName').value = user.name;
  document.getElementById('profileLocation').value = user.location || '';
  document.getElementById('profileBio').value = user.bio || '';

  // Availability Checkboxes
  document.querySelectorAll('input[name="availability"]').forEach(cb => {
    cb.checked = user.availability.includes(cb.value);
  });

  // Render Skill Tags
  renderEditableSkillTags('offered');
  renderEditableSkillTags('wanted');
}

function updateVisibilityText(isPublic) {
  const desc = document.getElementById('visibilityDesc');
  if (isPublic) {
    desc.innerHTML = `<strong>Public:</strong> Discoverable in global search. Other users can propose swaps.`;
  } else {
    desc.innerHTML = `<strong style="color: var(--amber);">Private:</strong> Hidden from explore & search. You can still send outgoing swap requests.`;
  }
}

function toggleVisibility(checkbox) {
  AppState.currentUser.visibility = checkbox.checked ? 'public' : 'private';
  updateVisibilityText(checkbox.checked);
  saveStateToStorage();
  showToast(`Profile visibility updated to ${AppState.currentUser.visibility}`, 'info');
}

function promptAvatarUrl() {
  const current = AppState.currentUser.avatar;
  const newUrl = prompt("Enter a valid profile photo image URL:", current);
  if (newUrl && newUrl.trim() !== '') {
    AppState.currentUser.avatar = newUrl.trim();
    document.getElementById('sidebarAvatarPreview').src = AppState.currentUser.avatar;
    document.getElementById('navUserAvatar').src = AppState.currentUser.avatar;
    saveStateToStorage();
    showToast('Profile photo updated!', 'success');
  }
}

function renderEditableSkillTags(type) {
  const container = document.getElementById(type === 'offered' ? 'offeredTagsContainer' : 'wantedTagsContainer');
  const input = document.getElementById(type === 'offered' ? 'inputOfferedTag' : 'inputWantedTag');
  const countBadge = document.getElementById(type === 'offered' ? 'offeredCount' : 'wantedCount');
  const skills = type === 'offered' ? AppState.currentUser.skillsOffered : AppState.currentUser.skillsWanted;

  countBadge.textContent = `${skills.length} Skill${skills.length === 1 ? '' : 's'}`;

  // Clear existing pills except input
  container.querySelectorAll('.tag-editable-pill').forEach(el => el.remove());

  skills.forEach((skill, index) => {
    const pill = document.createElement('span');
    pill.className = `tag-editable-pill ${type}`;
    pill.innerHTML = `
      <span>${skill}</span>
      <button type="button" class="tag-remove-btn" onclick="removeSkillTag('${type}', ${index})" title="Remove skill">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;
    container.insertBefore(pill, input);
  });
}

function removeSkillTag(type, index) {
  if (type === 'offered') {
    AppState.currentUser.skillsOffered.splice(index, 1);
  } else {
    AppState.currentUser.skillsWanted.splice(index, 1);
  }
  renderEditableSkillTags(type);
}

function addSkillTag(type, skillName) {
  const cleanName = skillName.trim();
  if (!cleanName) return;

  const targetList = type === 'offered' ? AppState.currentUser.skillsOffered : AppState.currentUser.skillsWanted;
  if (targetList.includes(cleanName)) {
    showToast(`"${cleanName}" is already added!`, 'error');
    return;
  }

  targetList.push(cleanName);
  renderEditableSkillTags(type);
  showToast(`Added "${cleanName}" to ${type === 'offered' ? 'Skills Offered' : 'Skills Wanted'}`, 'success');
}

function addSkillQuick(type, skillName) {
  addSkillTag(type, skillName);
}

// Attach Enter listener to inline tag inputs
document.addEventListener('DOMContentLoaded', () => {
  const inputOffered = document.getElementById('inputOfferedTag');
  if (inputOffered) {
    inputOffered.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkillTag('offered', inputOffered.value);
        inputOffered.value = '';
      }
    });
  }

  const inputWanted = document.getElementById('inputWantedTag');
  if (inputWanted) {
    inputWanted.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkillTag('wanted', inputWanted.value);
        inputWanted.value = '';
      }
    });
  }
});

async function saveUserProfile(e) {
  e.preventDefault();
  const name = document.getElementById('profileFullName').value.trim();
  const location = document.getElementById('profileLocation').value.trim();
  const bio = document.getElementById('profileBio').value.trim();

  const selectedAvail = [];
  document.querySelectorAll('input[name="availability"]:checked').forEach(cb => {
    selectedAvail.push(cb.value);
  });

  if (selectedAvail.length === 0) {
    showToast('Please select at least one availability slot', 'error');
    return;
  }

  AppState.currentUser.name = name;
  AppState.currentUser.location = location;
  AppState.currentUser.bio = bio;
  AppState.currentUser.availability = selectedAvail;

  // Placeholder for Flask /api/profile/update POST:
  /*
  await ApiService.request(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
    method: 'POST',
    body: JSON.stringify(AppState.currentUser)
  });
  */

  saveStateToStorage();
  updateNavbarUserSnippet();
  showToast('Profile and Skill preferences saved successfully!', 'success');
}

// ==========================================================================
// 8. VIEW 3: SWAP REQUESTS & RATINGS WORKFLOW
// ==========================================================================
function switchSwapSubtab(tab) {
  AppState.activeSwapSubtab = tab;
  document.querySelectorAll('.swap-subtab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`subtab-${tab}`);
  if (activeBtn) activeBtn.classList.add('active');
  renderSwapsList();
}

function renderSwapsList() {
  const container = document.getElementById('swapsListContainer');
  if (!container) return;

  const incomingCount = AppState.swaps.filter(s => s.type === 'incoming' && s.status === 'pending').length;
  const outgoingCount = AppState.swaps.filter(s => s.type === 'outgoing' && s.status === 'pending').length;
  const activeCount = AppState.swaps.filter(s => s.status === 'accepted' || s.status === 'completed').length;

  document.getElementById('subtabIncomingCount').textContent = incomingCount;
  document.getElementById('subtabOutgoingCount').textContent = outgoingCount;
  document.getElementById('subtabActiveCount').textContent = activeCount;

  let filteredSwaps = [];
  if (AppState.activeSwapSubtab === 'incoming') {
    filteredSwaps = AppState.swaps.filter(s => s.type === 'incoming');
  } else if (AppState.activeSwapSubtab === 'outgoing') {
    filteredSwaps = AppState.swaps.filter(s => s.type === 'outgoing');
  } else {
    filteredSwaps = AppState.swaps.filter(s => s.status === 'accepted' || s.status === 'completed');
  }

  if (filteredSwaps.length === 0) {
    container.innerHTML = `
      <div class="glass-card empty-state-card">
        <div class="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"></path></svg>
        </div>
        <h3 class="empty-state-title">No ${AppState.activeSwapSubtab} swaps right now</h3>
        <p class="empty-state-sub">Explore discoverable peers to initiate a new skill trade proposition!</p>
        <button type="button" class="btn btn-primary" onclick="navigateTo('explore')">Browse Swappers</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredSwaps.map(swap => {
    if (AppState.activeSwapSubtab === 'incoming') {
      return `
        <div class="swap-item-card" id="swap-${swap.id}">
          <div class="swap-item-left">
            <img src="${swap.partnerAvatar}" alt="${swap.partnerName}" class="swap-user-avatar">
            <div class="swap-details-body">
              <h4>${swap.partnerName} <span style="font-size: 0.78rem; font-weight: normal; color: var(--text-muted);">${swap.partnerLocation} • ${swap.date}</span></h4>
              <div class="swap-skills-exchange-row">
                <span>They teach: <strong style="color: var(--emerald-dark);">${swap.skillOfferedToUser}</strong></span>
                <span class="swap-exchange-arrow">⇄</span>
                <span>You teach: <strong style="color: var(--primary);">${swap.skillWantedFromUser}</strong></span>
                ${swap.compatibilityScore ? `<span class="badge badge-mint" style="font-size: 0.72rem;">✨ ${swap.compatibilityScore}</span>` : ''}
              </div>
              <div class="swap-message-preview">"${swap.message}"</div>
            </div>
          </div>
          <div class="swap-item-right">
            ${swap.status === 'pending' ? `
              <div class="swap-actions-row">
                <button type="button" class="btn btn-emerald btn-sm" onclick="handleAcceptSwap('${swap.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>Accept Swap</span>
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick="handleRejectSwap('${swap.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  <span>Decline</span>
                </button>
              </div>
            ` : `
              <span class="swap-status-badge badge-${swap.status === 'accepted' ? 'mint' : 'danger'}">${swap.status.toUpperCase()}</span>
            `}
          </div>
        </div>
      `;
    } else if (AppState.activeSwapSubtab === 'outgoing') {
      return `
        <div class="swap-item-card" id="swap-${swap.id}">
          <div class="swap-item-left">
            <img src="${swap.partnerAvatar}" alt="${swap.partnerName}" class="swap-user-avatar">
            <div class="swap-details-body">
              <h4>To: ${swap.partnerName} <span style="font-size: 0.78rem; font-weight: normal; color: var(--text-muted);">${swap.partnerLocation} • ${swap.date}</span></h4>
              <div class="swap-skills-exchange-row">
                <span>You requested: <strong style="color: var(--primary);">${swap.skillWantedFromPartner}</strong></span>
                <span class="swap-exchange-arrow">⇄</span>
                <span>You offered: <strong style="color: var(--emerald-dark);">${swap.skillOfferedFromUser}</strong></span>
              </div>
              <div class="swap-message-preview">"${swap.message}"</div>
            </div>
          </div>
          <div class="swap-item-right">
            <span class="badge badge-amber" style="margin-bottom: 8px;">Pending Response</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="handleCancelOutgoingSwap('${swap.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Cancel Request</span>
            </button>
          </div>
        </div>
      `;
    } else {
      // Active & Completed Tab
      const isCompleted = swap.status === 'completed';
      return `
        <div class="swap-item-card" id="swap-${swap.id}">
          <div class="swap-item-left">
            <img src="${swap.partnerAvatar}" alt="${swap.partnerName}" class="swap-user-avatar">
            <div class="swap-details-body">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                <h4>${swap.partnerName}</h4>
                <span class="badge badge-${isCompleted ? 'mint' : 'plum'}">${isCompleted ? 'Completed Swap' : 'Active Exchange'}</span>
              </div>
              <div class="swap-skills-exchange-row">
                <span>Exchange: <strong>${swap.skillWantedFromPartner || swap.skillWantedFromUser}</strong> ⇄ <strong>${swap.skillOfferedFromUser || swap.skillOfferedToUser}</strong></span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${swap.date}</div>
            </div>
          </div>
          <div class="swap-item-right">
            <div class="swap-actions-row">
              ${!isCompleted ? `
                <button type="button" class="btn btn-emerald btn-sm" onclick="handleMarkCompleted('${swap.id}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>Mark Completed</span>
                </button>
              ` : ''}

              <button type="button" class="btn btn-glass btn-sm" onclick="openRatingModal('${swap.id}', '${swap.partnerName}')" style="${swap.hasReviewed ? 'color: var(--amber); border-color: var(--amber-border);' : ''}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${swap.hasReviewed ? '#ea580c' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span>${swap.hasReviewed ? 'Reviewed ★' : 'Leave Rating & Review'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');
}

function handleAcceptSwap(swapId) {
  const swap = AppState.swaps.find(s => s.id === swapId);
  if (!swap) return;
  swap.status = 'accepted';
  saveStateToStorage();
  updateNavbarUserSnippet();
  renderSwapsList();
  showToast(`Accepted swap proposal from ${swap.partnerName}! Added to Active Swaps.`, 'success');
}

function handleRejectSwap(swapId) {
  const swap = AppState.swaps.find(s => s.id === swapId);
  if (!swap) return;
  swap.status = 'cancelled';
  saveStateToStorage();
  updateNavbarUserSnippet();
  renderSwapsList();
  showToast(`Declined swap request from ${swap.partnerName}.`, 'info');
}

function handleCancelOutgoingSwap(swapId) {
  AppState.swaps = AppState.swaps.filter(s => s.id !== swapId);
  saveStateToStorage();
  renderSwapsList();
  showToast('Cancelled and deleted outgoing swap request.', 'info');
}

function handleMarkCompleted(swapId) {
  const swap = AppState.swaps.find(s => s.id === swapId);
  if (!swap) return;
  swap.status = 'completed';
  AppState.currentUser.swapsCompleted = (AppState.currentUser.swapsCompleted || 0) + 1;
  saveStateToStorage();
  renderSwapsList();
  showToast(`Congratulations on completing your swap with ${swap.partnerName}! Don't forget to leave feedback.`, 'success');
}

// ==========================================================================
// 9. VIEW 4: DEDICATED AI ASSISTANT SECTION (3 CORE AI FEATURES)
// ==========================================================================
function renderAiChatHistory() {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  container.innerHTML = AppState.chatMessages.map(msg => `
    <div class="chat-msg ${msg.sender === 'ai' ? 'msg-ai' : 'msg-user'}">
      <div class="chat-msg-avatar">
        ${msg.sender === 'ai' ? 'AI' : 'You'}
      </div>
      <div>
        <div class="chat-msg-bubble">
          ${msg.text}
        </div>
        ${msg.actionsHtml ? msg.actionsHtml : ''}
      </div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

function activateAiFeature(featureKey) {
  document.querySelectorAll('.ai-feature-card').forEach(c => c.classList.remove('active'));
  event.currentTarget.classList.add('active');

  if (featureKey === 'automation') {
    sendAiPrompt("Show me how agent automation works with my swaps");
  } else if (featureKey === 'rag') {
    sendAiPrompt("Generate a RAG analysis of Elena Rostova's profile compatibility");
  } else if (featureKey === 'matchmaker') {
    runAiInstantMatch();
  }
}

function sendAiPrompt(promptText) {
  const input = document.getElementById('aiChatInput');
  input.value = promptText;
  handleAiChatSubmit(new Event('submit'));
}

async function handleAiChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('aiChatInput');
  const userText = input.value.trim();
  if (!userText) return;

  // Add User Message
  AppState.chatMessages.push({
    sender: 'user',
    text: userText
  });
  input.value = '';
  renderAiChatHistory();

  // Show thinking indicator
  const container = document.getElementById('aiChatMessages');
  const thinkingId = 'thinking-' + Date.now();
  const thinkingEl = document.createElement('div');
  thinkingEl.className = 'chat-msg msg-ai';
  thinkingEl.id = thinkingId;
  thinkingEl.innerHTML = `
    <div class="chat-msg-avatar">AI</div>
    <div class="chat-msg-bubble" style="color: var(--text-muted); font-style: italic;">
      Analyzing SkillSwap directory and processing intent...
    </div>
  `;
  container.appendChild(thinkingEl);
  container.scrollTop = container.scrollHeight;

  // Simulate AI LLM Response logic
  setTimeout(() => {
    thinkingEl.remove();
    const reply = generateAiAgentResponse(userText);
    AppState.chatMessages.push(reply);
    renderAiChatHistory();
  }, 650);
}

function generateAiAgentResponse(query) {
  const q = query.toLowerCase();

  // Intent 1: Agent Automation - Filter Swappers
  if (q.includes('figma') || q.includes('design')) {
    const matched = AppState.users.filter(u => u.skillsOffered.some(s => s.toLowerCase().includes('figma') || s.toLowerCase().includes('design')));
    return {
      sender: 'ai',
      text: `🤖 <strong>Agent Automation:</strong> I scanned the platform directory and found <strong>${matched.length} verified swappers</strong> teaching Figma UI/UX:`,
      actionsHtml: `
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
          ${matched.map(u => `
            <div class="ai-inline-result-card">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${u.avatar}" class="user-avatar-sm" alt="${u.name}">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem;">${u.name} (${u.location})</div>
                  <div style="font-size: 0.76rem; color: var(--emerald-dark);">Teaches: ${u.skillsOffered.join(', ')}</div>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-sm" onclick="openSwapRequestModal('${u.id}')">Request Swap</button>
            </div>
          `).join('')}
        </div>
      `
    };
  }

  // Intent 2: Agent Automation - Pending Swaps Summary
  if (q.includes('pending') || q.includes('my swaps') || q.includes('summarize my pending')) {
    const pendingIncoming = AppState.swaps.filter(s => s.type === 'incoming' && s.status === 'pending');
    return {
      sender: 'ai',
      text: `🔄 <strong>Swap Manager Automation:</strong> You have <strong>${pendingIncoming.length} incoming pending swap offers</strong> awaiting your response:`,
      actionsHtml: `
        <div style="margin-top: 10px; background: rgba(255, 255, 255, 0.7); border-radius: var(--radius-md); padding: 12px; border: 1px solid rgba(255, 255, 255, 0.9);">
          ${pendingIncoming.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.05);">
              <div>
                <strong>${s.partnerName}</strong> proposes <em>${s.skillOfferedToUser}</em> for your <em>${s.skillWantedFromUser}</em>.
              </div>
              <button type="button" class="btn btn-emerald btn-sm" onclick="handleAcceptSwap('${s.id}')">Accept Now</button>
            </div>
          `).join('')}
          <div style="text-align: right; margin-top: 4px;">
            <button type="button" class="btn btn-glass btn-sm" onclick="navigateTo('swaps')">Open Swaps Tab</button>
          </div>
        </div>
      `
    };
  }

  // Intent 3: Smart Matchmaker (Reciprocal Barter Algorithm)
  if (q.includes('match') || q.includes('reciprocal') || q.includes('compatibility')) {
    const bestMatch = AppState.users.find(u => u.name.includes('Elena')) || AppState.users[0];
    return {
      sender: 'ai',
      text: `🎯 <strong>Smart Matchmaker (Dual-Barter Overlap):</strong><br>
      Your optimal mutual match is <strong>${bestMatch.name}</strong> with an algorithmic compatibility score of <span class="ai-match-score-badge">98% Match</span>.<br><br>
      • <strong>Why:</strong> Elena wants to learn <em>Python Programming</em> (your primary offered skill), and can teach <em>Figma UI/UX & Design Systems</em> (your primary wanted skill). Both of you are available on weekends!`,
      actionsHtml: `
        <div class="ai-inline-result-card" style="margin-top: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${bestMatch.avatar}" class="user-avatar-sm" alt="${bestMatch.name}">
            <div>
              <div style="font-weight: 700;">${bestMatch.name}</div>
              <div style="font-size: 0.76rem; color: var(--text-muted);">Availability: ${bestMatch.availability}</div>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" onclick="openSwapRequestModal('${bestMatch.id}')">Propose Swap Now</button>
        </div>
      `
    };
  }

  // Default Agent Assistant Response
  return {
    sender: 'ai',
    text: `I understood your query about "${query}". As your SkillSwap Assistant, I can automate search filters, evaluate reciprocal skills, or create personalized lesson plans for your next swap session. You can also click the quick prompt pills below!`,
    actionsHtml: null
  };
}

function clearAiChat() {
  AppState.chatMessages = [
    {
      sender: 'ai',
      text: "Chat history cleared. What skill would you like to explore next, Alex?",
      actionsHtml: null
    }
  ];
  renderAiChatHistory();
  showToast('AI conversation reset', 'info');
}

function runAiInstantMatch() {
  navigateTo('ai');
  sendAiPrompt("Who is my highest compatibility dual-swap match?");
}

// ==========================================================================
// 10. VIEW 5: ADMIN ROLE DASHBOARD
// ==========================================================================
function switchAdminTab(tabKey) {
  AppState.activeAdminTab = tabKey;
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById(`adminTab-${tabKey}`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.admin-subcontent').forEach(c => c.style.display = 'none');
  const targetContent = document.getElementById(`adminContent-${tabKey}`);
  if (targetContent) targetContent.style.display = 'block';

  if (tabKey === 'moderation') renderModerationQueue();
  if (tabKey === 'swaps') renderAdminSwapsMonitor();
}

function renderAdminView() {
  // Update stats counters
  document.getElementById('statTotalUsers').textContent = AppState.users.length + 1420;
  document.getElementById('statActiveSwaps').textContent = AppState.swaps.filter(s => s.status === 'accepted').length + 340;
  document.getElementById('statModQueue').textContent = AppState.moderationItems.length;

  switchAdminTab(AppState.activeAdminTab);
}

function renderModerationQueue() {
  const tbody = document.getElementById('moderationTableBody');
  if (!tbody) return;

  if (AppState.moderationItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 32px; color: var(--emerald-dark); font-weight: 600;">
          🎉 All clear! No flagged skills or users in the moderation queue.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = AppState.moderationItems.map(item => `
    <tr id="mod-row-${item.id}">
      <td>
        <strong>@${item.targetUser}</strong>
        <div style="font-size: 0.74rem; color: var(--text-muted);">${item.userEmail}</div>
      </td>
      <td style="max-width: 240px; font-size: 0.84rem;">
        "${item.content}"
      </td>
      <td>
        <span class="ai-report-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          ${item.aiCategory}
        </span>
        <div style="font-size: 0.7rem; color: var(--text-light); margin-top: 3px;">Confidence: ${item.aiConfidence}</div>
      </td>
      <td style="max-width: 260px; font-size: 0.78rem; color: var(--text-muted);">
        ${item.aiReason}
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn btn-danger btn-sm" onclick="handleModerationAction('${item.id}', 'reject')">
            Reject Skill
          </button>
          <button type="button" class="btn btn-glass btn-sm" style="color: var(--danger);" onclick="handleModerationAction('${item.id}', 'ban')">
            Ban User
          </button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="handleModerationAction('${item.id}', 'dismiss')">
            Dismiss
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function handleModerationAction(modId, action) {
  const item = AppState.moderationItems.find(m => m.id === modId);
  if (!item) return;

  AppState.moderationItems = AppState.moderationItems.filter(m => m.id !== modId);
  saveStateToStorage();
  renderModerationQueue();
  document.getElementById('statModQueue').textContent = AppState.moderationItems.length;

  if (action === 'reject') {
    showToast(`Rejected & pruned flagged skill listing from @${item.targetUser}`, 'success');
  } else if (action === 'ban') {
    showToast(`Banned user @${item.targetUser} and revoked OAuth credentials`, 'error');
  } else {
    showToast(`Dismissed moderation flag for @${item.targetUser}`, 'info');
  }
}

function filterAdminSwaps(statusFilter, btnEl) {
  AppState.adminSwapFilter = statusFilter;
  document.querySelectorAll('#adminContent-swaps .category-chip').forEach(c => c.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderAdminSwapsMonitor();
}

function renderAdminSwapsMonitor() {
  const tbody = document.getElementById('adminSwapsTableBody');
  if (!tbody) return;

  let list = AppState.swaps;
  if (AppState.adminSwapFilter !== 'all') {
    list = AppState.swaps.filter(s => s.status === AppState.adminSwapFilter);
  }

  tbody.innerHTML = list.map(s => {
    let statusClass = 'neutral';
    if (s.status === 'accepted') statusClass = 'mint';
    if (s.status === 'pending') statusClass = 'amber';
    if (s.status === 'cancelled') statusClass = 'danger';

    return `
      <tr>
        <td><code>#${s.id}</code></td>
        <td><strong>${s.type === 'incoming' ? s.partnerName : AppState.currentUser.name}</strong></td>
        <td><strong>${s.type === 'incoming' ? AppState.currentUser.name : s.partnerName}</strong></td>
        <td>${s.skillWantedFromUser || s.skillWantedFromPartner} ⇄ ${s.skillOfferedToUser || s.skillOfferedFromUser}</td>
        <td>${s.date}</td>
        <td><span class="badge badge-${statusClass}">${s.status.toUpperCase()}</span></td>
      </tr>
    `;
  }).join('');
}

function updateBroadcastPreview() {
  const type = document.getElementById('broadcastTypeSelect').value;
  const text = document.getElementById('broadcastTextInput').value;

  const previewBanner = document.getElementById('adminPreviewBanner');
  const previewBadge = document.getElementById('previewBadgeTag');
  const previewText = document.getElementById('previewMessageText');

  previewText.textContent = text || 'Your broadcast message preview here...';
  previewBanner.className = 'broadcast-banner';

  if (type === 'warning') {
    previewBanner.classList.add('alert-warning');
    previewBadge.textContent = 'Advisory';
  } else if (type === 'critical') {
    previewBanner.classList.add('alert-critical');
    previewBadge.textContent = 'Urgent Notice';
  } else {
    previewBadge.textContent = 'Announcement';
  }
}

function handleSendBroadcast(e) {
  e.preventDefault();
  const type = document.getElementById('broadcastTypeSelect').value;
  const text = document.getElementById('broadcastTextInput').value.trim();

  AppState.broadcast = {
    active: true,
    type: type,
    text: text
  };

  saveStateToStorage();
  renderBroadcastBanner();
  showToast('Platform broadcast banner published live!', 'success');
}

function handleClearBroadcast() {
  AppState.broadcast.active = false;
  saveStateToStorage();
  renderBroadcastBanner();
  showToast('Platform broadcast banner cleared.', 'info');
}

/**
 * Client-Side CSV & JSON Exporter for Admin Reports
 */
function exportData(reportType, format) {
  let dataToExport = [];
  let filename = `skillswap_${reportType}_${Date.now()}`;

  if (reportType === 'users') {
    dataToExport = AppState.users.map(u => ({
      id: u.id,
      name: u.name,
      location: u.location,
      rating: u.rating,
      availability: u.availability,
      skillsOffered: u.skillsOffered.join('; '),
      skillsWanted: u.skillsWanted.join('; ')
    }));
  } else if (reportType === 'swaps') {
    dataToExport = AppState.swaps.map(s => ({
      swapId: s.id,
      partner: s.partnerName,
      status: s.status,
      date: s.date,
      type: s.type
    }));
  } else {
    // Feedback & Review Logs
    dataToExport = [
      { swapId: 'swp_105', reviewer: 'Alex Rivera', reviewee: 'David Kim', stars: 5, comment: 'Phenomenal Excel coaching! Really helped with financial formulas.' },
      { swapId: 'swp_104', reviewer: 'Marcus Vance', reviewee: 'Alex Rivera', stars: 5, comment: 'Super clear Python API examples. Great communication!' }
    ];
  }

  let blob, mimeType, fileExt;
  if (format === 'json') {
    blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    fileExt = 'json';
  } else {
    // Generate CSV string
    const headers = Object.keys(dataToExport[0] || {}).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    fileExt = 'csv';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${fileExt}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Downloaded ${reportType} report as ${fileExt.toUpperCase()}!`, 'success');
}

// ==========================================================================
// 11. MODAL CONTROLLERS & FORM HANDLERS
// ==========================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Close modal when clicking on backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

/**
 * Open Swap Request Modal with target candidate preloaded
 */
function openSwapRequestModal(partnerId) {
  const partner = AppState.users.find(u => u.id === partnerId);
  if (!partner) return;

  document.getElementById('swapTargetUserId').value = partner.id;
  document.getElementById('swapModalPartnerAvatar').src = partner.avatar;
  document.getElementById('swapModalPartnerName').textContent = partner.name;
  document.getElementById('swapModalPartnerLocation').textContent = `${partner.location} • Available ${partner.availability}`;

  // Populate "Skill I want from them" (their offered skills)
  const wantSelect = document.getElementById('swapSkillIWant');
  wantSelect.innerHTML = partner.skillsOffered.map(s => `<option value="${s}">${s}</option>`).join('');

  // Populate "Skill I will offer" (current user's offered skills)
  const offerSelect = document.getElementById('swapSkillIOffer');
  offerSelect.innerHTML = AppState.currentUser.skillsOffered.map(s => `<option value="${s}">${s}</option>`).join('');

  // Pre-fill friendly message
  document.getElementById('swapCustomMessage').value = `Hi ${partner.name}! I love your profile and would love to exchange weekly sessions. I can teach you ${AppState.currentUser.skillsOffered[0] || 'programming'} in return for your expertise!`;

  openModal('modalSwapRequest');
}

async function handleSendSwapSubmit(e) {
  e.preventDefault();
  const targetId = document.getElementById('swapTargetUserId').value;
  const skillWanted = document.getElementById('swapSkillIWant').value;
  const skillOffered = document.getElementById('swapSkillIOffer').value;
  const message = document.getElementById('swapCustomMessage').value.trim();

  const partner = AppState.users.find(u => u.id === targetId);
  if (!partner) return;

  const newSwap = {
    id: 'swp_' + Date.now(),
    type: 'outgoing',
    partnerId: partner.id,
    partnerName: partner.name,
    partnerAvatar: partner.avatar,
    partnerLocation: partner.location,
    skillWantedFromPartner: skillWanted,
    skillOfferedFromUser: skillOffered,
    status: 'pending',
    message: message,
    date: 'Just now'
  };

  AppState.swaps.unshift(newSwap);
  saveStateToStorage();
  closeModal('modalSwapRequest');
  showToast(`Swap offer sent to ${partner.name}! You can track it under 'My Swaps'.`, 'success');
}

/**
 * Open Rating & Review Modal
 */
function openRatingModal(swapId, partnerName) {
  document.getElementById('ratingSwapId').value = swapId;
  document.getElementById('modalRatingTitle').textContent = `Rate Exchange with ${partnerName}`;
  setStarRating(5);
  openModal('modalRating');
}

function setStarRating(rating) {
  document.getElementById('selectedStarValue').value = rating;
  const starButtons = document.querySelectorAll('#starRatingSelect .star-btn');
  starButtons.forEach((btn, index) => {
    btn.classList.toggle('active', index < rating);
  });
}

function handleSubmitRating(e) {
  e.preventDefault();
  const swapId = document.getElementById('ratingSwapId').value;
  const stars = document.getElementById('selectedStarValue').value;
  const comment = document.getElementById('ratingComment').value.trim();

  const swap = AppState.swaps.find(s => s.id === swapId);
  if (swap) {
    swap.hasReviewed = true;
  }

  saveStateToStorage();
  closeModal('modalRating');
  renderSwapsList();
  showToast(`Thank you! Submitted ${stars}-star rating and review feedback.`, 'success');
}

/**
 * AI Profile Summary (RAG Feature 2)
 */
function triggerAiProfileSummary(userId) {
  const user = AppState.users.find(u => u.id === userId);
  if (!user) return;

  const contentArea = document.getElementById('aiSummaryContentArea');
  contentArea.innerHTML = `
    <div style="text-align: center; padding: 24px;">
      <div class="ai-sparkle-dot" style="margin: 0 auto 12px auto;"></div>
      <div style="font-weight: 700; color: var(--primary);">Synthesizing Profile with RAG Intelligence...</div>
      <div style="font-size: 0.8rem; color: var(--text-muted);">Cross-referencing skills, availability, and past ratings</div>
    </div>
  `;
  openModal('modalAiSummary');

  setTimeout(() => {
    // Calculate simulated compatibility match
    const sharedGoals = user.skillsWanted.filter(w => AppState.currentUser.skillsOffered.some(o => o.toLowerCase().includes(w.toLowerCase())));
    const compatibilityPercentage = sharedGoals.length > 0 ? 94 : 82;

    contentArea.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
        <img src="${user.avatar}" class="profile-avatar-img" style="width: 58px; height: 58px;" alt="${user.name}">
        <div>
          <h4 style="font-size: 1.2rem; font-weight: 800; color: var(--text-main);">${user.name}</h4>
          <div style="font-size: 0.82rem; color: var(--text-muted);">${user.location} • Available ${user.availability}</div>
        </div>
      </div>

      <div style="background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.84rem; font-weight: 700; color: var(--primary);">Compatibility Match Score</span>
          <span class="badge badge-mint">${compatibilityPercentage}% Strong Fit</span>
        </div>
        <div style="height: 6px; background: rgba(0,0,0,0.06); border-radius: 9999px; overflow: hidden;">
          <div style="width: ${compatibilityPercentage}%; height: 100%; background: linear-gradient(90deg, var(--emerald) 0%, #a855f7 100%);"></div>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <h5 style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">🧠 AI RAG Executive Summary:</h5>
        <p style="font-size: 0.86rem; color: var(--text-muted); line-height: 1.5;">
          ${user.name} is a high-reputation peer with an outstanding <strong>${user.rating}★ rating</strong> over ${user.reviewCount} completed swaps. Their strengths center on <em>${user.skillsOffered.join(', ')}</em>. They are looking to expand their knowledge in <em>${user.skillsWanted.join(', ')}</em>.
        </p>
      </div>

      <div style="background: rgba(109, 59, 107, 0.08); border-left: 3px solid var(--primary); padding: 12px 14px; border-radius: var(--radius-sm); margin-bottom: 20px;">
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--primary); margin-bottom: 2px;">💡 Recommended Swap Structure:</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Offer 45-minute alternating weekly Zoom sessions. You can mentor on <strong>${AppState.currentUser.skillsOffered[0]}</strong> while learning <strong>${user.skillsOffered[0]}</strong>.
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-glass" onclick="closeModal('modalAiSummary')">Close</button>
        <button type="button" class="btn btn-primary" onclick="closeModal('modalAiSummary'); openSwapRequestModal('${user.id}')">
          <span>Propose Swap with ${user.name}</span>
        </button>
      </div>
    `;
  }, 400);
}

// ==========================================================================
// 12. DOM BOOTSTRAPPER & INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Check URL query parameters for direct view routing (e.g. ?view=admin)
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');

  if (viewParam && ['explore', 'swaps', 'profile', 'ai', 'admin'].includes(viewParam)) {
    AppState.currentView = viewParam;
  }

  // Synchronize UI
  updateNavbarUserSnippet();
  renderBroadcastBanner();
  navigateTo(AppState.currentView);
});
