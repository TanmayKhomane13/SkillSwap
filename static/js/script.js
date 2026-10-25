/**
 * ==========================================================================
 * SKILLSWAP PLATFORM - SCRIPT.JS (FRONTEND CONTROLLER & STATE STORE)
 * ==========================================================================
 * Strictly Vanilla ES6+ (No external frameworks)
 * Modular architecture prepared for Python Flask + SQLite
 */

// ==========================================================================
// 1. CONFIGURATION & REST API CONTRACT
// ==========================================================================
const CONFIG = {
  API_BASE_URL: '', // same origin as the Flask page, so the login cookie is always sent
  USE_MOCK_BACKEND: false, // Switch to false when connecting to running Flask server
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    GET_PROFILE: '/api/profile',
    UPDATE_PROFILE: '/api/profile/update',
    GET_USERS: '/api/users',
    GET_SWAPS: '/api/swaps',
    CREATE_SWAP: '/api/swaps/create',
    UPDATE_SWAP_STATUS: (id) => `/api/swaps/${id}/status`,
    SUBMIT_REVIEW: (id) => `/api/swaps/${id}/review`,
    AI_CHAT: '/api/ai/chat',
    AI_SUMMARIZE: (id) => `/api/ai/summarize-profile/${id}`,
    REPORT_CONTENT: '/api/moderation/report'
  }
};

// ==========================================================================
// 2. SEED DATA & REACTIVE LOCAL STORE
// ==========================================================================
const DEFAULT_CURRENT_USER = {
  id: 'usr_alex_01',
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  role: 'user',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  location: 'San Francisco, CA',
  headline: 'Senior Python & Backend Developer',
  bio: 'Senior Python Developer with 5+ years building APIs, microservices, and databases. Passionate about learning UI/UX design and pottery!',
  visibility: 'public',
  availability: 'Weekends',
  experience: 'Advanced',
  skillsOffered: ['Python Programming', 'Flask Web Dev', 'SQL & Databases'],
  skillsOfferedDesc: {
    'Python Programming': 'Full-stack Python scripting, API architecture, and database automation.',
    'Flask Web Dev': 'Building clean REST APIs, auth flows, and microservices.',
    'SQL & Databases': 'Relational data modeling, indexing, and query optimization.'
  },
  skillsWanted: ['Figma UI/UX', 'Digital Illustration'],
  rating: 4.9,
  swapsCompleted: 8
};

const SEED_USERS = [
  {
    id: 'usr_02',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    location: 'Berlin, Germany',
    rating: 4.95,
    reviewCount: 14,
    availability: 'Weekends',
    visibility: 'public',
    primarySkill: 'Figma UI/UX Design Systems',
    skillDesc: 'I teach auto-layout mastery, design tokens, component libraries, and interactive prototyping.',
    skillsOffered: ['Figma UI/UX', 'Design Systems', 'User Research'],
    skillsWanted: ['Python Programming', 'Data Analysis']
  },
  {
    id: 'usr_03',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    location: 'Austin, TX',
    rating: 4.88,
    reviewCount: 9,
    availability: 'Weekday Evenings',
    visibility: 'public',
    primarySkill: 'Acoustic Guitar & Audio Mixing',
    skillDesc: 'Hands-on chord progressions, fingerstyle technique, and Logic Pro mixing essentials.',
    skillsOffered: ['Guitar Basics', 'Audio Mixing & Logic Pro', 'Songwriting'],
    skillsWanted: ['Flask Web Dev', 'SEO Marketing']
  },
  {
    id: 'usr_04',
    name: 'Sofia Martinez',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    location: 'Barcelona, Spain',
    rating: 4.92,
    reviewCount: 22,
    availability: 'Weekday Evenings',
    visibility: 'public',
    primarySkill: 'Conversational Spanish',
    skillDesc: 'Native Spanish coaching focusing on real-life dialogues, pronunciation, and culture.',
    skillsOffered: ['Spanish Conversational', 'DELE Exam Prep', 'Creative Writing'],
    skillsWanted: ['Python Programming', 'Excel & Financial Modeling']
  },
  {
    id: 'usr_05',
    name: 'Kenji Takahashi',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    location: 'Tokyo, Japan',
    rating: 5.0,
    reviewCount: 11,
    availability: 'Custom Availability',
    visibility: 'public',
    primarySkill: 'Street Photography & Lightroom',
    skillDesc: 'Manual camera controls, natural light framing, and cinematic color grading.',
    skillsOffered: ['Photography & Lightroom', 'Photo Editing', 'Japanese Basics'],
    skillsWanted: ['Figma UI/UX', 'Web Development']
  },
  {
    id: 'usr_06',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    location: 'Toronto, Canada',
    rating: 4.75,
    reviewCount: 16,
    availability: 'Weekends',
    visibility: 'public',
    primarySkill: 'SEO Growth Strategy',
    skillDesc: 'Technical website optimization, keyword research, and high-impact content funnels.',
    skillsOffered: ['SEO Marketing', 'Content Strategy', 'Google Analytics'],
    skillsWanted: ['Python Programming', 'SQL & Databases']
  },
  {
    id: 'usr_07',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    location: 'Seattle, WA',
    rating: 4.82,
    reviewCount: 7,
    availability: 'Weekday Evenings',
    visibility: 'public',
    primarySkill: 'Excel & Financial Modeling',
    skillDesc: 'Executive financial models, VBA automated macros, and dynamic dashboard creation.',
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
    status: 'pending',
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
    message: 'Hi Kenji! I want to learn Lightroom color grading, and I would love to build a custom portfolio website for you with Flask in return.',
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
    message: 'Scheduled 3 sessions completed so far.',
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
    hasReviewed: false,
    date: 'Completed Oct 14'
  }
];

const AppState = {
  currentUser: JSON.parse(localStorage.getItem('skillswap_user')) || DEFAULT_CURRENT_USER,
  users: JSON.parse(localStorage.getItem('skillswap_all_users')) || SEED_USERS,
  swaps: [], // loaded from the database: see loadSwapsFromBackend()
  broadcast: JSON.parse(localStorage.getItem('skillswap_broadcast')) || {
    active: true,
    type: 'announcement',
    text: '🚀 Welcome to SkillSwap! Connect your skills and discover mutual learning partnerships.'
  },
  currentView: 'explore',
  activeCategory: 'all',
  searchQuery: '',
  filterAvailability: 'all',
  filterRating: 0,
  activeSwapSubtab: 'incoming',
  isAiDrawerOpen: false,
  isMemberProfileOpen: false,
  activeMemberProfileId: null,
  chatMessages: []
};

function saveStateToStorage() {
  localStorage.setItem('skillswap_user', JSON.stringify(AppState.currentUser));
  localStorage.setItem('skillswap_all_users', JSON.stringify(AppState.users));
  localStorage.setItem('skillswap_swaps', JSON.stringify(AppState.swaps));
}

// Escapes text before it is inserted with innerHTML
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
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
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
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
// 4. FIX #1A: NAVBAR SCROLL EFFECT (FLOATING ROUNDED GLASS PILL)
// ==========================================================================
let isNavbarScrollTicking = false;
function handleNavbarScroll() {
  if (!isNavbarScrollTicking) {
    window.requestAnimationFrame(() => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        const isScrolled = window.scrollY > 20;
        if (navbar.classList.contains('scrolled') !== isScrolled) {
          navbar.classList.toggle('scrolled', isScrolled);
        }
      }
      isNavbarScrollTicking = false;
    });
    isNavbarScrollTicking = true;
  }
}
window.addEventListener('scroll', handleNavbarScroll, { passive: true });
window.addEventListener('DOMContentLoaded', handleNavbarScroll);

function navigateTo(viewId) {
  AppState.currentView = viewId;
  document.body.classList.toggle('on-profile-view', viewId === 'profile');

  // Update center navigation pills
  const activeBtn = document.getElementById(`navBtn-${viewId}`);
  if (activeBtn) {
    document.querySelectorAll('.nav-pill-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  // Toggle view sections
  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    targetSec.classList.add('active');
  }

  if (viewId === 'explore' && document.getElementById('profilesGrid')) renderExploreProfiles();
  if (viewId === 'matches' && document.getElementById('matchesGrid')) renderMatchesView();
  if (viewId === 'swaps' && document.getElementById('swapsListContainer')) {
    renderSwapsList();
    loadSwapsFromBackend(); // pick up requests other people sent
  }
  if (viewId === 'profile' && document.getElementById('sidebarAvatarPreview')) syncProfileFormData();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleUserDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('show');
}

document.addEventListener('click', () => {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.remove('show');
  closeAllDropdowns();
});

function updateNavbarUserSnippet() {
  const nameEl = document.getElementById('navUserName');
  const avatarEl = document.getElementById('navUserAvatar');

  if (nameEl) nameEl.textContent = AppState.currentUser.name;
  if (avatarEl) avatarEl.src = AppState.currentUser.avatar;

  const pendingCount = AppState.swaps.filter(s => s.type === 'incoming' && s.status === 'pending').length;
  const swapsCounter = document.getElementById('swapsNavCounter');
  if (swapsCounter) {
    swapsCounter.textContent = pendingCount;
    swapsCounter.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
}

function handleLogout() {
  localStorage.removeItem('skillswap_role');
  showToast('Logged out. Redirecting...', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

// ==========================================================================
// 5. CUSTOM GLASS DROPDOWNS
// ==========================================================================
function toggleDropdown(dropdownId) {
  const el = document.getElementById(dropdownId);
  const isOpen = el.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) {
    el.classList.add('open');
  }
  event.stopPropagation();
}

function closeAllDropdowns() {
  document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
}

function selectDropdownOption(type, value, label) {
  if (type === 'availability') {
    AppState.filterAvailability = value;
    document.getElementById('selectedAvailabilityLabel').textContent = label;
    updateDropdownActiveItem('dropdownAvailability', label);
  } else if (type === 'rating') {
    AppState.filterRating = parseFloat(value);
    document.getElementById('selectedRatingLabel').textContent = label;
    updateDropdownActiveItem('dropdownRating', label);
  }
  closeAllDropdowns();
  applyFilters();
}

function updateDropdownActiveItem(dropdownId, selectedLabel) {
  const items = document.querySelectorAll(`#${dropdownId} .custom-dropdown-item`);
  items.forEach(item => {
    const isMatch = item.querySelector('span').textContent.trim() === selectedLabel.trim();
    item.classList.toggle('selected', isMatch);
    let check = item.querySelector('.check-icon');
    if (isMatch && !check) {
      check = document.createElement('span');
      check.className = 'check-icon';
      check.textContent = '✓';
      item.appendChild(check);
    } else if (!isMatch && check) {
      check.remove();
    }
  });
}

// ==========================================================================
// 6. RIGHT-HAND SIDE PANELS DOCK & DYNAMIC VERTICAL STACKING SYSTEM
// ==========================================================================

function updateRightPanelsLayout() {
  const dock = document.getElementById('rightPanelsDock');
  const overlay = document.getElementById('aiDrawerOverlay');
  if (!dock) return;

  const isAi = !!AppState.isAiDrawerOpen;
  const isProfile = !!AppState.isMemberProfileOpen;

  const classes = ['right-panels-dock'];
  if (isAi && isProfile) {
    classes.push('active', 'stacked');
    if (overlay && window.innerWidth < 820) overlay.classList.add('active');
  } else if (isAi && !isProfile) {
    classes.push('active', 'ai-only');
    if (overlay && window.innerWidth < 820) overlay.classList.add('active');
  } else if (!isAi && isProfile) {
    classes.push('active', 'profile-only');
    if (overlay && window.innerWidth < 820) overlay.classList.add('active');
  } else {
    if (overlay) overlay.classList.remove('active');
  }

  dock.className = classes.join(' ');
}

// --- Always-open Copilot dock (desktop). Keep the query in sync with the
// @media (min-width: 1100px) block in style.css.
const AI_DOCK_MEDIA = window.matchMedia('(min-width: 1100px)');

function isAiDocked() {
  return document.body.classList.contains('ai-docked');
}

function syncAiDock() {
  if (!document.getElementById('rightPanelsDock')) return; // pages without the dock
  document.body.classList.toggle('ai-docked', AI_DOCK_MEDIA.matches);
  if (AI_DOCK_MEDIA.matches) {
    openAiDrawer();
  } else {
    closeAiDrawer();
  }
}

function toggleAiDrawer() {
  if (isAiDocked()) {
    // Already open: just put the cursor in the chat box
    const input = document.getElementById('aiChatInput');
    if (input) input.focus();
    return;
  }
  if (AppState.isAiDrawerOpen) {
    closeAiDrawer();
  } else {
    openAiDrawer();
  }
}

function openAiDrawer() {
  AppState.isAiDrawerOpen = true;
  renderAiDrawerMessages();
  updateRightPanelsLayout();
}

function closeAiDrawer() {
  if (isAiDocked()) return; // the docked Copilot stays open
  AppState.isAiDrawerOpen = false;
  updateRightPanelsLayout();
}

function openPublicMemberProfile(userId) {
  const user = AppState.users.find(u => u.id === userId);
  if (!user) return;

  AppState.activeMemberProfileId = userId;
  AppState.isMemberProfileOpen = true;

  const container = document.getElementById('memberProfileBody');
  if (container) {
    const mainTeachesTitle = user.primarySkill || user.skillsOffered[0];
    const mainTeachesDesc = (user.skillsOfferedDesc && user.skillsOfferedDesc[mainTeachesTitle]) || user.skillDesc || 'Experienced mentor sharing practical real-world workflows.';

    container.innerHTML = `
      <div class="member-profile-top">
        <img src="${user.avatar}" alt="${user.name}" class="member-profile-avatar">
        <div class="member-profile-info">
          <div class="member-profile-name-row">
            <h3 class="member-profile-name">${user.name}</h3>
            <span class="badge badge-amber" style="font-weight: 700;">★ ${user.rating}</span>
          </div>
          <div class="member-profile-badges">
            <span class="badge badge-neutral">${user.location}</span>
            <span class="badge badge-mint">${user.availability}</span>
          </div>
        </div>
      </div>

      <div class="member-profile-headline">
        ${user.headline || (user.name + ' • Community Swapper')}
      </div>

      <div class="member-profile-bio">
        ${user.bio || 'Passionate about barter education, peer mentoring, and exchanging knowledge.'}
      </div>

      <div class="member-skills-section">
        <div class="member-skills-title">Teaches & Mentors</div>
        <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${mainTeachesTitle}</div>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">${mainTeachesDesc}</p>
        ${user.skillsOffered.length > 1 ? `
          <div class="member-skills-pills" style="margin-top: 4px;">
            ${user.skillsOffered.slice(1).map(s => `<span class="badge badge-mint">${s}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="member-skills-section">
        <div class="member-skills-wanted-title">Wants to Learn</div>
        <div class="member-skills-pills">
          ${user.skillsWanted.map(s => `<span class="badge badge-plum">${s}</span>`).join('')}
        </div>
      </div>

      <div class="member-profile-actions">
        <button type="button" class="btn btn-primary" style="flex: 1;" onclick="openSwapRequestModal('${user.id}')">
          <span>Propose Swap</span>
        </button>
        <button type="button" class="btn btn-glass btn-sm" onclick="sendAiPrompt('Can you evaluate my swap match with ${user.name}?')" title="Ask AI about compatibility">
          <span class="ai-dot-indicator" style="position: static; margin-right: 4px;"></span>
          <span>Ask AI</span>
        </button>
      </div>
    `;
  }

  updateRightPanelsLayout();
}

function closePublicMemberProfile() {
  AppState.isMemberProfileOpen = false;
  AppState.activeMemberProfileId = null;
  updateRightPanelsLayout();
}

function closeAllRightPanels() {
  closePublicMemberProfile();
  closeAiDrawer();
}

function renderAiDrawerMessages() {
  const container = document.getElementById('aiDrawerMessages');
  if (!container) return;

  container.innerHTML = AppState.chatMessages.map(msg => `
    <div class="ai-msg ${msg.sender === 'ai' ? 'ai-msg-ai' : 'ai-msg-user'}">
      <div class="ai-msg-bubble">
        ${msg.text}
        ${msg.actionsHtml ? msg.actionsHtml : ''}
      </div>
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

function buildAiProfileCards(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return '';
  }

  const toList = value => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch (_) {
        // Keep ordinary strings as they are.
      }

      return value;
    }

    return '';
  };

  return `
    <div class="ai-profile-results">
      <div class="ai-profile-results-title">
        Similar profiles (${profiles.length})
      </div>

      ${profiles.map(profile => {
        const user = AppState.users.find(
          u => String(u.id) === String(profile.user_id)
        );

        const name = user?.name || profile.name || 'SkillSwap Member';
        const offered = user?.skillsOffered ?? user?.skills_offered ?? [];
        const wanted = user?.skillsWanted ?? user?.skills_wanted ?? [];
        const availability = user?.availability || '';
        const location = user?.location || '';
        const rating = user?.rating;

        return `
          <article class="ai-profile-card">
            <div class="ai-profile-card-name">
              ${escapeHtml(name)}
            </div>

            ${location ? `
              <div class="ai-profile-card-detail">
                ${escapeHtml(location)}
              </div>
            ` : ''}

            <div class="ai-profile-card-detail">
              <strong>Teaches:</strong>
              ${escapeHtml(toList(offered) || 'See profile')}
            </div>

            <div class="ai-profile-card-detail">
              <strong>Wants to learn:</strong>
              ${escapeHtml(toList(wanted) || 'See profile')}
            </div>

            ${availability ? `
              <div class="ai-profile-card-detail">
                <strong>Availability:</strong>
                ${escapeHtml(toList(availability))}
              </div>
            ` : ''}

            ${rating !== undefined && rating !== null ? `
              <div class="ai-profile-card-detail">
                <strong>Rating:</strong> ★ ${escapeHtml(rating)}
              </div>
            ` : ''}

            ${user ? `
              <button
                type="button"
                class="btn btn-primary ai-profile-view-btn"
                data-profile-id="${escapeHtml(String(user.id))}"
              >
                View Profile
              </button>
            ` : `
              <div class="ai-profile-card-detail">
                Profile details are not currently loaded.
              </div>
            `}
          </article>
        `;
      }).join('')}
    </div>
  `;
}


document.getElementById('aiDrawerMessages')?.addEventListener(
  'click',
  function (event) {
    const button = event.target.closest('.ai-profile-view-btn');

    if (!button) return;

    const profileId = button.dataset.profileId;

    // Match IDs consistently, even if one is a number and one is a string.
    const user = AppState.users.find(
      u => String(u.id) === String(profileId)
    );

    if (user) {
      openPublicMemberProfile(user.id);
    }
  }
);


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

  // msg.text is inserted with innerHTML, so user text is escaped first.
  AppState.chatMessages.push({
    sender: 'user',
    text: escapeHtml(userText)
  });

  input.value = '';
  renderAiDrawerMessages();

  try {
    const res = await fetch(
      `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.AI_CHAT}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userText
        })
      }
    );

    const data = await res.json().catch(() => ({}));

    AppState.chatMessages.push({
      sender: 'ai',

      text: res.ok
        ? escapeHtml(data.reply || 'No response received.')
        : escapeHtml(
            data.error || `Request failed (${res.status})`
          ),

      actionsHtml: res.ok
        ? buildAiProfileCards(data.profiles)
        : ''
    });

  } catch (err) {
    AppState.chatMessages.push({
      sender: 'ai',
      text: escapeHtml(`AI request failed: ${err.message}`)
    });
  }

  renderAiDrawerMessages();
}

function generateAiCopilotResponse(query) {
  const q = query.toLowerCase();
  // Chatbot should only use real data, not the demo seed members/swaps
  const demoUserIds = SEED_USERS.map(u => u.id);
  const demoSwapIds = SEED_SWAPS.map(sw => sw.id);
  const realUsers = AppState.users.filter(u => !demoUserIds.includes(u.id));
  const realSwaps = AppState.swaps.filter(sw => !demoSwapIds.includes(sw.id));

  if (q.includes('figma') || q.includes('design')) {
    const matched = realUsers.filter(u => u.skillsOffered.some(s => s.toLowerCase().includes('figma')));
    return {
      sender: 'ai',
      text: `🎨 Found <strong>${matched.length} swappers</strong> teaching Figma UI/UX:`,
      actionsHtml: `
        <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
          ${matched.map(u => `
            <div style="padding: 8px 10px; background: rgba(255,255,255,0.8); border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${u.name}</strong> (${u.location})
              </div>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn btn-glass btn-sm" onclick="openPublicMemberProfile('${u.id}')">Profile</button>
                <button type="button" class="btn btn-primary btn-sm" onclick="openSwapRequestModal('${u.id}');">Swap</button>
              </div>
            </div>
          `).join('')}
        </div>
      `
    };
  }

  if (q.includes('pending') || q.includes('my swaps')) {
    const pendingIncoming = realSwaps.filter(s => s.type === 'incoming' && s.status === 'pending');
    return {
      sender: 'ai',
      text: `🔄 You have <strong>${pendingIncoming.length} pending incoming requests</strong>. Top request: <strong>${pendingIncoming[0] ? pendingIncoming[0].partnerName : 'None'}</strong> offering <em>${pendingIncoming[0] ? pendingIncoming[0].skillOfferedToUser : ''}</em>.`
    };
  }

  if (q.includes('match') || q.includes('reciprocal')) {
    return {
      sender: 'ai',
      text: `Check the Matches tab to see your best reciprocal matches.`
    };
  }

  return {
    sender: 'ai',
    text: `Understood! I've analyzed your skill exchange directory for "${query}". Check the Matches tab or Explore feed for live barter listings.`
  };
}

// ==========================================================================
// 7. AIRY, MINIMAL USER CARDS & EXPLORE VIEW
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
  document.getElementById('searchInput').value = '';
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
  renderExploreProfiles();
}

function renderExploreProfiles() {
  const grid = document.getElementById('profilesGrid');
  if (!grid) return;

  const filtered = AppState.users.filter(user => {
    if (user.visibility === 'private') return false;

    if (AppState.searchQuery) {
      const matchName = user.name.toLowerCase().includes(AppState.searchQuery);
      const matchLoc = user.location.toLowerCase().includes(AppState.searchQuery);
      const matchOffered = user.skillsOffered.some(s => s.toLowerCase().includes(AppState.searchQuery));
      const matchWanted = user.skillsWanted.some(s => s.toLowerCase().includes(AppState.searchQuery));
      if (!matchName && !matchLoc && !matchOffered && !matchWanted) return false;
    }

    if (AppState.activeCategory !== 'all') {
      const cat = AppState.activeCategory.toLowerCase();
      const matchOfferedCat = user.skillsOffered.some(s => s.toLowerCase().includes(cat));
      const matchWantedCat = user.skillsWanted.some(s => s.toLowerCase().includes(cat));
      if (!matchOfferedCat && !matchWantedCat) return false;
    }

    if (AppState.filterAvailability !== 'all') {
      if (user.availability !== AppState.filterAvailability) return false;
    }

    if (AppState.filterRating > 0) {
      if (user.rating < AppState.filterRating) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 48px 20px;">
        <h3 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
          No swappers found
        </h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px;">
          Try adjusting your search terms or availability filters.
        </p>
        <button type="button" class="btn btn-primary" onclick="resetFilters()">Reset Filters</button>
      </div>
    `;
    return;
  }

  // Airy, Minimal User Card Layout
  grid.innerHTML = filtered.map(user => {
    const mainTeachesTitle = user.primarySkill || user.skillsOffered[0];
    const mainTeachesDesc = user.skillDesc || 'Experienced mentor eager to share practical workflows and guide step-by-step.';

    return `
      <article class="glass-card profile-card-minimal" id="card-${user.id}">
        <div>
          <!-- Top Row: Avatar + Name + City + Rating Pill -->
          <div class="card-top-row" onclick="openPublicMemberProfile('${user.id}')" style="cursor: pointer;" title="View ${user.name}'s Profile">
            <img src="${user.avatar}" alt="${user.name}" class="card-avatar">
            <div class="card-user-info">
              <div class="card-name-row">
                <span class="card-name">${user.name}</span>
                <span class="card-rating-pill">★ ${user.rating}</span>
              </div>
              <div class="card-city">${user.location} • ${user.availability}</div>
            </div>
          </div>

          <!-- TEACHES: 1 bold skill title + 1 line description -->
          <div class="card-teaches-block">
            <div class="card-label-small">TEACHES</div>
            <div class="card-teaches-title">${mainTeachesTitle}</div>
            <div class="card-teaches-desc">${mainTeachesDesc}</div>
          </div>

          <!-- Wants to learn: compact frosted inner box -->
          <div class="card-wants-box">
            <div class="card-wants-label">Wants to learn:</div>
            <div class="card-wants-pills">
              ${user.skillsWanted.map(skill => `<span class="pill-wanted">${skill}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- Clean Card Footer: Full-width button + subtle icon buttons -->
        <div class="card-footer-clean">
          <button type="button" class="btn btn-primary btn-propose-swap" onclick="openSwapRequestModal('${user.id}')">
            <span>Propose Skill Swap</span>
          </button>
          <button type="button" class="btn-card-action" title="View Member Profile" onclick="openPublicMemberProfile('${user.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </button>
          <button type="button" class="btn-card-action" title="AI Insight Summary" onclick="triggerAiProfileSummary('${user.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </button>
          <button type="button" class="btn-card-action" title="Report Inappropriate Content" onclick="openReportModal('${user.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClearBtn').classList.remove('visible');
  AppState.searchQuery = '';
  AppState.activeCategory = 'all';
  selectDropdownOption('availability', 'all', 'Any Availability');
  selectDropdownOption('rating', 0, 'Any Rating');
  document.querySelectorAll('#categoryChips .category-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  renderExploreProfiles();
}

// ==========================================================================
// 8. VIEW: MATCHES (SMART RECIPROCAL BARTER MATCHMAKER)
// ==========================================================================
function renderMatchesView() {
  const grid = document.getElementById('matchesGrid');
  if (!grid) return;

  const matches = AppState.users.map(u => {
    const theyWantWhatIOffer = u.skillsWanted.some(w => AppState.currentUser.skillsOffered.some(o => o.toLowerCase().includes(w.toLowerCase())));
    const iWantWhatTheyOffer = u.skillsOffered.some(o => AppState.currentUser.skillsWanted.some(w => w.toLowerCase().includes(o.toLowerCase())));

    let score = 75;
    if (theyWantWhatIOffer && iWantWhatTheyOffer) score = 98;
    else if (theyWantWhatIOffer || iWantWhatTheyOffer) score = 88;

    return { ...u, compatibilityScore: score };
  }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  grid.innerHTML = matches.map(u => `
    <article class="glass-card match-card">
      <span class="match-score-badge-large">✨ ${u.compatibilityScore}% Match</span>
      
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; cursor: pointer;" onclick="openPublicMemberProfile('${u.id}')" title="View ${u.name}'s Profile">
        <img src="${u.avatar}" class="card-avatar" alt="${u.name}">
        <div>
          <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">${u.name}</h4>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${u.location}</span>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.6); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.85);">
        <div style="font-size: 0.78rem; font-weight: 700; color: var(--emerald-dark); margin-bottom: 2px;">THEY TEACH:</div>
        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">${u.skillsOffered.join(', ')}</div>
        <div style="font-size: 0.78rem; font-weight: 700; color: var(--primary); margin-bottom: 2px;">THEY WANT TO LEARN:</div>
        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-main);">${u.skillsWanted.join(', ')}</div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button type="button" class="btn btn-glass" style="flex: 0 0 auto;" onclick="openPublicMemberProfile('${u.id}')" title="View Public Member Profile">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span style="margin-left: 4px;">Profile</span>
        </button>
        <button type="button" class="btn btn-primary" style="flex: 1;" onclick="openSwapRequestModal('${u.id}')">
          <span>Initiate Swap</span>
        </button>
      </div>
    </article>
  `).join('');
}

// ==========================================================================
// 9. VIEW: SWAP REQUESTS & RATINGS WORKFLOW
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
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        No ${AppState.activeSwapSubtab} swap propositions at this time.
      </div>
    `;
    return;
  }

  container.innerHTML = filteredSwaps.map(swap => {
    if (AppState.activeSwapSubtab === 'incoming') {
      return `
        <div class="swap-item-card" id="swap-${swap.id}">
          <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
            <img src="${swap.partnerAvatar}" alt="${escapeHtml(swap.partnerName)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid white;">
            <div>
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">${escapeHtml(swap.partnerName)} <span style="font-size: 0.78rem; font-weight: normal; color: var(--text-muted);">${swap.date}</span></h4>
              <div style="font-size: 0.85rem; margin-top: 2px;">
                They teach: <strong style="color: var(--emerald-dark);">${escapeHtml(swap.skillOfferedToUser)}</strong> ⇄ You teach: <strong style="color: var(--primary);">${escapeHtml(swap.skillWantedFromUser)}</strong>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-muted); font-style: italic; margin-top: 4px;">"${escapeHtml(swap.message)}"</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            ${swap.status === 'pending' ? `
              <button type="button" class="btn btn-emerald btn-sm" onclick="handleAcceptSwap('${swap.id}')">Accept</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="handleRejectSwap('${swap.id}')">Decline</button>
            ` : `<span class="badge badge-mint">${swap.status.toUpperCase()}</span>`}
          </div>
        </div>
      `;
    } else if (AppState.activeSwapSubtab === 'outgoing') {
      return `
        <div class="swap-item-card" id="swap-${swap.id}">
          <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
            <img src="${swap.partnerAvatar}" alt="${escapeHtml(swap.partnerName)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid white;">
            <div>
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">To: ${escapeHtml(swap.partnerName)} <span style="font-size: 0.78rem; font-weight: normal; color: var(--text-muted);">${swap.date}</span></h4>
              <div style="font-size: 0.85rem; margin-top: 2px;">
                Requested: <strong>${escapeHtml(swap.skillWantedFromPartner)}</strong> ⇄ Offered: <strong>${escapeHtml(swap.skillOfferedFromUser)}</strong>
              </div>
            </div>
          </div>
          <div>
            ${swap.status === 'pending'
              ? `<button type="button" class="btn btn-danger btn-sm" onclick="handleCancelOutgoingSwap('${swap.id}')">Cancel Request</button>`
              : `<span class="badge badge-neutral">${swap.status.toUpperCase()}</span>`}
          </div>
        </div>
      `;
    } else {
      const isCompleted = swap.status === 'completed';
      return `
        <div class="swap-item-card" id="swap-${swap.id}">
          <div style="display: flex; align-items: center; gap: 14px; flex: 1;">
            <img src="${swap.partnerAvatar}" alt="${escapeHtml(swap.partnerName)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid white;">
            <div>
              <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main);">${escapeHtml(swap.partnerName)}</h4>
              <div style="font-size: 0.85rem;">Status: <span class="badge badge-${isCompleted ? 'mint' : 'plum'}">${isCompleted ? 'Completed' : 'Active'}</span></div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            ${!isCompleted ? `<button type="button" class="btn btn-emerald btn-sm" onclick="handleMarkCompleted('${swap.id}')">Mark Complete</button>` : ''}
            <button type="button" class="btn btn-glass btn-sm" onclick="openRatingModal('${swap.id}')">
              <span>${swap.hasReviewed ? 'Reviewed ★' : 'Leave Rating'}</span>
            </button>
          </div>
        </div>
      `;
    }
  }).join('');
}

// --------------------------------------------------------------------------
// Swap requests live in the database: A sends -> A sees "outgoing", B sees "incoming"
// --------------------------------------------------------------------------
// SQLite gives UTC time like "2026-10-25 10:30:00"; show it as "3 hours ago"
function timeAgo(dateText) {
  const then = new Date(String(dateText).replace(' ', 'T') + 'Z');
  const minutes = Math.floor((Date.now() - then.getTime()) / 60000);
  if (isNaN(minutes) || minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

async function loadSwapsFromBackend() {
  try {
    const res = await fetch(CONFIG.ENDPOINTS.GET_SWAPS);
    if (!res.ok) return;
    const swaps = await res.json();

    // "Reviewed" is not saved in the database yet, so remember it here
    const reviewed = new Set(AppState.swaps.filter(s => s.hasReviewed).map(s => s.id));
    AppState.swaps = swaps.map(s => ({ ...s, date: timeAgo(s.created_at), hasReviewed: reviewed.has(s.id) }));

    saveStateToStorage();
    updateNavbarUserSnippet();
    if (document.getElementById('swapsListContainer')) renderSwapsList();
  } catch (err) {
    // Backend not reachable: keep what is on screen
  }
}

// Set a request to accepted / declined / cancelled / completed. Returns true if it worked.
async function changeSwapStatus(swapId, status) {
  try {
    const res = await fetch(CONFIG.ENDPOINTS.UPDATE_SWAP_STATUS(swapId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(escapeHtml(data.error || 'Could not update the request'), 'error');
      await loadSwapsFromBackend(); // the other person may have changed it already
      return false;
    }
  } catch (err) {
    showToast('Server error updating the request', 'error');
    return false;
  }
  await loadSwapsFromBackend();
  return true;
}

async function handleAcceptSwap(swapId) {
  const swap = AppState.swaps.find(s => s.id === swapId);
  if (!swap) return;
  if (await changeSwapStatus(swapId, 'accepted')) {
    showToast(`Accepted swap with ${escapeHtml(swap.partnerName)}! Added to Active Exchanges.`, 'success');
  }
}

async function handleRejectSwap(swapId) {
  if (await changeSwapStatus(swapId, 'declined')) {
    showToast('Declined swap proposal', 'info');
  }
}

async function handleCancelOutgoingSwap(swapId) {
  if (await changeSwapStatus(swapId, 'cancelled')) {
    showToast('Cancelled outgoing request', 'info');
  }
}

async function handleMarkCompleted(swapId) {
  const swap = AppState.swaps.find(s => s.id === swapId);
  if (!swap) return;
  if (await changeSwapStatus(swapId, 'completed')) {
    showToast(`Swap completed with ${escapeHtml(swap.partnerName)}!`, 'success');
  }
}

// ==========================================================================
// 10. USER PROFILE & SKILLS MANAGEMENT
// ==========================================================================
function syncProfileFormData() {
  const user = AppState.currentUser;
  document.getElementById('sidebarAvatarPreview').src = user.avatar;
  document.getElementById('sidebarName').textContent = user.name;
  document.getElementById('sidebarEmail').textContent = user.email;
  document.getElementById('sidebarRating').textContent = `★ ${user.rating} Rating`;
  document.getElementById('sidebarSwapsCount').textContent = `${user.swapsCompleted} Swaps`;

  const toggle = document.getElementById('profileVisibilityToggle');
  toggle.checked = user.visibility === 'public';
  document.getElementById('visibilityDesc').innerHTML = toggle.checked ?
    '<strong>Public:</strong> Discoverable in global search.' :
    '<strong style="color: var(--amber);">Private:</strong> Hidden from directory.';

  document.getElementById('profileFullName').value = user.name;
  document.getElementById('profileLocation').value = user.location || '';
  document.getElementById('profileBio').value = user.bio || '';

  // Older saved data stored availability as a list; the dropdown needs one value
  const availability = Array.isArray(user.availability) ? user.availability[0] : user.availability;
  document.getElementById('profileAvailability').value = availability || 'Weekends';
  document.getElementById('profileExperience').value = user.experience || 'Beginner';

  renderEditableSkillTags('offered');
  renderEditableSkillTags('wanted');
}

function toggleVisibility(checkbox) {
  AppState.currentUser.visibility = checkbox.checked ? 'public' : 'private';
  document.getElementById('visibilityDesc').innerHTML = checkbox.checked ?
    '<strong>Public:</strong> Discoverable in global search.' :
    '<strong style="color: var(--amber);">Private:</strong> Hidden from directory.';
  saveStateToStorage();
  showToast(`Profile visibility: ${AppState.currentUser.visibility}`, 'info');
}

async function uploadProfilePic(input) {
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('photo', file);

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/profile/picture`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Photo upload failed', 'error');
      return;
    }

    AppState.currentUser.avatar = data.avatar;
    document.getElementById('sidebarAvatarPreview').src = data.avatar;
    document.getElementById('navUserAvatar').src = data.avatar;
    saveStateToStorage();
    showToast('Profile photo updated!', 'success');
  } catch (err) {
    showToast('Server error uploading photo', 'error');
  }
  input.value = '';
}

function renderEditableSkillTags(type) {
  const container = document.getElementById(type === 'offered' ? 'offeredTagsContainer' : 'wantedTagsContainer');
  const input = document.getElementById(type === 'offered' ? 'inputOfferedTag' : 'inputWantedTag');
  const countBadge = document.getElementById(type === 'offered' ? 'offeredCount' : 'wantedCount');
  const skills = type === 'offered' ? AppState.currentUser.skillsOffered : AppState.currentUser.skillsWanted;

  countBadge.textContent = `${skills.length} Skill${skills.length === 1 ? '' : 's'}`;
  container.querySelectorAll('.tag-editable-pill').forEach(el => el.remove());

  skills.forEach((skill, index) => {
    const pill = document.createElement('span');
    pill.className = `tag-editable-pill ${type}`;
    pill.innerHTML = `
      <span>${skill}</span>
      <button type="button" class="tag-remove-btn" onclick="removeSkillTag('${type}', ${index})" title="Remove">×</button>
    `;
    container.insertBefore(pill, input);
  });
}

function removeSkillTag(type, index) {
  if (type === 'offered') AppState.currentUser.skillsOffered.splice(index, 1);
  else AppState.currentUser.skillsWanted.splice(index, 1);
  renderEditableSkillTags(type);
}

function addSkillTag(type, skillName) {
  const cleanName = skillName.trim();
  if (!cleanName) return;
  const target = type === 'offered' ? AppState.currentUser.skillsOffered : AppState.currentUser.skillsWanted;
  if (!target.includes(cleanName)) {
    target.push(cleanName);
    renderEditableSkillTags(type);
    showToast(`Added ${cleanName}`, 'success');
  }
}

async function saveUserProfile(e) {
  e.preventDefault();
  const user = AppState.currentUser;

  user.name = document.getElementById('profileFullName').value.trim();
  user.location = document.getElementById('profileLocation').value.trim();
  user.bio = document.getElementById('profileBio').value.trim();
  user.experience = document.getElementById('profileExperience').value;
  user.availability = document.getElementById('profileAvailability').value;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.UPDATE_PROFILE}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        bio: user.bio,
        experience: user.experience,
        availability: user.availability,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Could not save profile', 'error');
      return;
    }
  } catch (err) {
    showToast('Server error saving profile', 'error');
    return;
  }

  saveStateToStorage();
  updateNavbarUserSnippet();
  showToast('Profile preferences saved!', 'success');
}

// ==========================================================================
// 11. MODAL CONTROLLERS (+ POST SKILL & REPORT USER)
// ==========================================================================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Post Skill
function openPostSkillModal() {
  openModal('modalPostSkill');
}

function handlePostSkillSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('newSkillTitle').value.trim();
  const desc = document.getElementById('newSkillDesc').value.trim();

  if (title) {
    if (!AppState.currentUser.skillsOffered.includes(title)) {
      AppState.currentUser.skillsOffered.push(title);
    }
    if (!AppState.currentUser.skillsOfferedDesc) AppState.currentUser.skillsOfferedDesc = {};
    AppState.currentUser.skillsOfferedDesc[title] = desc;

    saveStateToStorage();
    closeModal('modalPostSkill');
    document.getElementById('formPostSkill').reset();
    showToast(`Posted skill listing: "${title}"!`, 'success');
    renderExploreProfiles();
  }
}

// Propose Swap Request
function openSwapRequestModal(partnerId) {
  const partner = AppState.users.find(u => u.id === partnerId);
  if (!partner) return;

  document.getElementById('swapTargetUserId').value = partner.id;
  document.getElementById('swapModalPartnerAvatar').src = partner.avatar;
  document.getElementById('swapModalPartnerName').textContent = partner.name;
  document.getElementById('swapModalPartnerLocation').textContent = `${partner.location} • Available ${partner.availability}`;

  const wantSelect = document.getElementById('swapSkillIWant');
  wantSelect.innerHTML = partner.skillsOffered.map(s => `<option value="${s}">${s}</option>`).join('');

  const offerSelect = document.getElementById('swapSkillIOffer');
  offerSelect.innerHTML = AppState.currentUser.skillsOffered.map(s => `<option value="${s}">${s}</option>`).join('');

  document.getElementById('swapCustomMessage').value = `Hi ${partner.name}! I would love to exchange learning sessions. I can teach you ${AppState.currentUser.skillsOffered[0]} in return for your expertise!`;

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

  try {
    const res = await fetch(CONFIG.ENDPOINTS.CREATE_SWAP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: targetId, skillWanted, skillOffered, message })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(escapeHtml(data.error || 'Could not send the request'), 'error');
      return;
    }
  } catch (err) {
    showToast('Server error sending the request', 'error');
    return;
  }

  closeModal('modalSwapRequest');
  showToast(`Swap proposition sent to ${escapeHtml(partner.name)}!`, 'success');
  loadSwapsFromBackend();
}

// Rating Modal
function openRatingModal(swapId) {
  const swap = AppState.swaps.find(s => s.id === swapId);
  const partnerName = swap ? swap.partnerName : '';
  document.getElementById('ratingSwapId').value = swapId;
  document.getElementById('modalRatingTitle').textContent = `Rate Exchange with ${partnerName}`;
  setStarRating(5);
  openModal('modalRating');
}

function setStarRating(rating) {
  document.getElementById('selectedStarValue').value = rating;
  document.querySelectorAll('#starRatingSelect .star-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < rating);
  });
}

function handleSubmitRating(e) {
  e.preventDefault();
  const swapId = document.getElementById('ratingSwapId').value;
  const swap = AppState.swaps.find(s => s.id === swapId);
  if (swap) swap.hasReviewed = true;
  saveStateToStorage();
  closeModal('modalRating');
  renderSwapsList();
  showToast('Feedback review submitted! Thank you.', 'success');
}

// AI Profile Summary
function triggerAiProfileSummary(userId) {
  const user = AppState.users.find(u => u.id === userId);
  if (!user) return;

  const contentArea = document.getElementById('aiSummaryContentArea');
  contentArea.innerHTML = `
    <div style="text-align: center; padding: 24px;">
      <div class="ai-dot-indicator" style="position: static; margin: 0 auto 10px auto;"></div>
      <div style="font-weight: 700; color: var(--primary);">Synthesizing RAG Compatibility Profile...</div>
    </div>
  `;
  openModal('modalAiSummary');

  setTimeout(() => {
    contentArea.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
        <img src="${user.avatar}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid white;" alt="${user.name}">
        <div>
          <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">${user.name}</h4>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${user.location} • Available ${user.availability}</span>
        </div>
      </div>

      <div style="background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.84rem; font-weight: 700; color: var(--primary); margin-bottom: 6px;">
          <span>Compatibility Match</span>
          <span class="badge badge-mint">98% Reciprocal Overlap</span>
        </div>
        <div style="height: 6px; background: rgba(0,0,0,0.06); border-radius: 9999px; overflow: hidden;">
          <div style="width: 98%; height: 100%; background: linear-gradient(90deg, var(--emerald) 0%, var(--primary) 100%);"></div>
        </div>
      </div>

      <p style="font-size: 0.86rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">
        ${user.name} has maintained a <strong>${user.rating}★ rating</strong> over ${user.reviewCount} swaps. Their teaching expertise in <em>${user.skillsOffered.join(', ')}</em> aligns directly with your wanted skills.
      </p>

      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" class="btn btn-glass" onclick="closeModal('modalAiSummary')">Close</button>
        <button type="button" class="btn btn-primary" onclick="closeModal('modalAiSummary'); openSwapRequestModal('${user.id}')">
          <span>Propose Swap with ${user.name}</span>
        </button>
      </div>
    `;
  }, 350);
}

// Report User / Content
function openReportModal(userId) {
  document.getElementById('reportTargetUserId').value = userId;
  openModal('modalReport');
}

function handleReportSubmit(e) {
  e.preventDefault();
  const reason = document.getElementById('reportReasonSelect').value;
  const targetId = document.getElementById('reportTargetUserId').value;
  const targetUser = AppState.users.find(u => u.id === targetId) || { name: 'Reported User' };

  // Save the report in the database (reports table)
  fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.REPORT_CONTENT}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reported_user_id: targetId,
      category: reason,
      description: document.getElementById('reportDetails').value.trim()
    })
  }).catch(() => { });

  const currentMod = JSON.parse(localStorage.getItem('skillswap_moderation')) || [];
  currentMod.unshift({
    id: 'mod_' + Date.now(),
    targetUser: targetUser.name.toLowerCase().replace(/\s+/g, '_'),
    userEmail: 'reported@skillswap.user',
    content: `Reported by peer for: ${reason}`,
    aiCategory: reason,
    aiConfidence: '99.1%',
    aiReason: 'Submitted by verified community member. Auto-flagged for administrative review.',
    date: 'Just now'
  });
  localStorage.setItem('skillswap_moderation', JSON.stringify(currentMod));

  closeModal('modalReport');
  document.getElementById('formReportUser').reset();
  showToast('Report submitted. Flagged for administrative and AI moderation.', 'info');
}

// ==========================================================================
// 12. INITIALIZATION
// ==========================================================================
// Replace the demo members with real users from the SQLite database
// Show the AI chat greeting once per page load: "Hi <name>! ..."
function showChatGreeting(name) {
  if (AppState.chatMessages.length > 0) return;

  // Escape the name, because chat messages are inserted into the page as HTML
  const safeName = String(name || 'there').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);

  AppState.chatMessages.push({
    sender: 'ai',
    text: `Hi ${safeName}! Chat with <strong>sAI</strong> for finding swap partners, matching skills and getting profile insights.`  });
  renderAiDrawerMessages();
}

// Load the logged-in user from the database, then greet them in the chat
async function loadCurrentUserFromBackend() {
  try {
    // Relative URL = same address as this page, so the login cookie is always sent
    const response = await fetch(CONFIG.ENDPOINTS.GET_PROFILE);

    if (response.ok) {
      const profile = await response.json();
      const current = AppState.currentUser;

      // Database values win, but keep the fields the database does not store
      AppState.currentUser = {
        ...current,
        ...profile,
        location: current.location || profile.location,
        visibility: current.visibility || profile.visibility,
        swapsCompleted: current.swapsCompleted ?? profile.swapsCompleted
      };

      saveStateToStorage();
      updateNavbarUserSnippet();
    } else {
      console.warn('Could not load the logged-in user profile.');
    }
  } catch (error) {
    console.error('Error loading the current user:', error);
  }

  // Greet with the name we have (from the database, or from the saved login)
  showChatGreeting(AppState.currentUser.name);
}

async function loadUsersFromBackend() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.GET_USERS}`, {
      credentials: 'include'
    });
    if (!res.ok) return;
    const users = await res.json();
    AppState.users = users.filter(u => u.id !== AppState.currentUser.id);
    saveStateToStorage();
    if (document.getElementById('profilesGrid')) renderExploreProfiles();
  } catch (err) {
    // Backend not running: keep the demo members
  }
}

document.addEventListener('DOMContentLoaded', async () => {
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

  syncAiDock();
  AI_DOCK_MEDIA.addEventListener('change', syncAiDock);

  updateNavbarUserSnippet();

  // Load the authenticated user before loading the other members.
  await loadCurrentUserFromBackend();

  if (document.getElementById('profilesGrid')) {
    navigateTo(AppState.currentView);
    loadUsersFromBackend();
    loadSwapsFromBackend();
    setInterval(loadSwapsFromBackend, 30000); // new incoming requests show up without a refresh
  }
});