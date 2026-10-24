
/* ==========================================================================
   3. TOAST NOTIFICATIONS & API HELPERS
   ========================================================================== */

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = document.createElement('span');
  icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ⓘ';

  const text = document.createElement('span');
  text.textContent = message;

  toast.append(icon, text);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-closing');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

function getRecordId(record) {
  return String(record?.id ?? record?._id ?? '');
}

function getUserId(user) {
  return getRecordId(user);
}

function getSkillArray(user, type) {
  const skills = type === 'offered'
    ? user?.skillsOffered ?? user?.skills_offered
    : user?.skillsWanted ?? user?.skills_wanted;

  return Array.isArray(skills) ? skills : [];
}

function getAvailability(user) {
  const availability = user?.availability;
  return Array.isArray(availability)
    ? availability.join(', ')
    : availability || 'Not specified';
}

function getProfileSummary(user) {
  return user?.primarySkill ||
    getSkillArray(user, 'offered')[0] ||
    'Skills not specified';
}

async function loadAppData() {
  try {
    const profileResponse = await apiRequest(CONFIG.ENDPOINTS.GET_PROFILE);

    AppState.currentUser =
      profileResponse.user || profileResponse.profile || profileResponse;

    const [usersResponse, swapsResponse] = await Promise.all([
      apiRequest(CONFIG.ENDPOINTS.GET_USERS),
      apiRequest(CONFIG.ENDPOINTS.GET_SWAPS)
    ]);

    AppState.users = usersResponse.users || [];
    AppState.swaps = swapsResponse.swaps || [];

    updateNavbarUserSnippet();

    if (document.getElementById('profilesGrid')) {
      renderExploreProfiles();
    }

    if (document.getElementById('matchesGrid')) {
      renderMatchesView();
    }

    if (document.getElementById('swapsListContainer')) {
      renderSwapsList();
    }

    return true;
  } catch (error) {
    showToast(`Could not load application data: ${error.message}`, 'error');
    return false;
  }
}

/* ==========================================================================
   4. NAVIGATION & NAVBAR
   ========================================================================== */

function handleNavbarScroll() {
  const navbar = document.querySelector('.navbar');

  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }
}

window.addEventListener('scroll', handleNavbarScroll);
window.addEventListener('DOMContentLoaded', handleNavbarScroll);

function navigateTo(viewId) {
  AppState.currentView = viewId;

  const activeBtn = document.getElementById(`navBtn-${viewId}`);

  if (activeBtn) {
    document.querySelectorAll('.nav-pill-btn')
      .forEach(btn => btn.classList.remove('active'));

    activeBtn.classList.add('active');
  }

  const targetSec = document.getElementById(`view-${viewId}`);

  if (targetSec) {
    document.querySelectorAll('.view-section')
      .forEach(sec => sec.classList.remove('active'));

    targetSec.classList.add('active');
  }

  if (viewId === 'explore') renderExploreProfiles();
  if (viewId === 'matches') renderMatchesView();
  if (viewId === 'swaps') renderSwapsList();

  if (viewId === 'profile') {
    if (AppState.currentUser) syncProfileFormData();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleUserDropdown(e) {
  e.stopPropagation();

  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', () => {
  const dropdown = document.getElementById('userDropdown');

  if (dropdown) dropdown.classList.remove('show');

  closeAllDropdowns();
});

function updateNavbarUserSnippet() {
  const user = AppState.currentUser;

  const nameEl = document.getElementById('navUserName');
  const avatarEl = document.getElementById('navUserAvatar');

  if (nameEl) nameEl.textContent = user?.name || '';
  if (avatarEl) avatarEl.src = user?.avatar || '';

  const pendingCount = AppState.swaps.filter(swap =>
    swap.status === 'pending' &&
    (
      swap.type === 'incoming' ||
      String(swap.receiver_id ?? swap.receiverId ?? '') === getUserId(user)
    )
  ).length;

  const counter = document.getElementById('swapsNavCounter');

  if (counter) {
    counter.textContent = pendingCount;
    counter.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
}

async function handleLogout() {
  try {
    // If your Flask backend has a logout endpoint, call it here.
    // The provided endpoint contract does not currently define one.
    window.location.href = 'login.html';
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/* ==========================================================================
   5. CUSTOM DROPDOWNS
   ========================================================================== */

function toggleDropdown(dropdownId) {
  const element = document.getElementById(dropdownId);
  if (!element) return;

  const isOpen = element.classList.contains('open');
  closeAllDropdowns();

  if (!isOpen) element.classList.add('open');
}

function closeAllDropdowns() {
  document.querySelectorAll('.custom-dropdown')
    .forEach(dropdown => dropdown.classList.remove('open'));
}

function selectDropdownOption(type, value, label) {
  if (type === 'availability') {
    AppState.filterAvailability = value;

    const element = document.getElementById('selectedAvailabilityLabel');
    if (element) element.textContent = label;

    updateDropdownActiveItem('dropdownAvailability', label);
  } else if (type === 'rating') {
    AppState.filterRating = Number.parseFloat(value) || 0;

    const element = document.getElementById('selectedRatingLabel');
    if (element) element.textContent = label;

    updateDropdownActiveItem('dropdownRating', label);
  }

  closeAllDropdowns();
  applyFilters();
}

function updateDropdownActiveItem(dropdownId, selectedLabel) {
  document.querySelectorAll(`#${dropdownId} .custom-dropdown-item`)
    .forEach(item => {
      const label = item.querySelector('span')?.textContent.trim();
      const selected = label === selectedLabel.trim();

      item.classList.toggle('selected', selected);

      let check = item.querySelector('.check-icon');

      if (selected && !check) {
        check = document.createElement('span');
        check.className = 'check-icon';
        check.textContent = '✓';
        item.appendChild(check);
      } else if (!selected && check) {
        check.remove();
      }
    });
}

/* ==========================================================================
   6. AI COPILOT DRAWER
   ========================================================================== */

function toggleAiDrawer() {
  const drawer = document.getElementById('aiDrawer');
  if (!drawer) return;

  if (drawer.classList.contains('open')) {
    closeAiDrawer();
  } else {
    openAiDrawer();
  }
}

function openAiDrawer() {
  document.getElementById('aiDrawer')?.classList.add('open');
  document.getElementById('aiDrawerOverlay')?.classList.add('active');
  renderAiDrawerMessages();
}

function closeAiDrawer() {
  document.getElementById('aiDrawer')?.classList.remove('open');
  document.getElementById('aiDrawerOverlay')?.classList.remove('active');
}

function renderAiDrawerMessages() {
  const container = document.getElementById('aiDrawerMessages');
  if (!container) return;

  container.replaceChildren();

  AppState.chatMessages.forEach(msg => {
    const row = document.createElement('div');

    row.style.display = 'flex';
    row.style.alignSelf = msg.sender === 'ai' ? 'flex-start' : 'flex-end';
    row.style.maxWidth = '85%';

    const bubble = document.createElement('div');

    bubble.style.padding = '12px 16px';
    bubble.style.borderRadius = '16px';
    bubble.style.fontSize = '0.88rem';
    bubble.style.lineHeight = '1.45';

    if (msg.sender === 'ai') {
      bubble.style.background = 'rgba(255,255,255,0.9)';
      bubble.style.color = 'var(--text-main)';
    } else {
      bubble.style.background = 'var(--primary)';
      bubble.style.color = 'white';
    }

    bubble.textContent = msg.text;
    row.appendChild(bubble);
    container.appendChild(row);
  });

  container.scrollTop = container.scrollHeight;
}

function sendAiPrompt(promptText) {
  const input = document.getElementById('aiChatInput');
  if (!input) return;

  input.value = promptText;
  handleAiChatSubmit({ preventDefault() {} });
}

async function handleAiChatSubmit(e) {
  e.preventDefault();

  const input = document.getElementById('aiChatInput');
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  AppState.chatMessages.push({ sender: 'user', text: message });
  input.value = '';
  renderAiDrawerMessages();

  try {
    const data = await apiRequest(CONFIG.ENDPOINTS.AI_CHAT, {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    AppState.chatMessages.push({
      sender: 'ai',
      text: data.reply || data.response || data.message || 'No response received.'
    });
  } catch (error) {
    AppState.chatMessages.push({
      sender: 'ai',
      text: `AI request failed: ${error.message}`
    });
  }

  renderAiDrawerMessages();
}

/* ==========================================================================
   7. EXPLORE PROFILES
   ========================================================================== */

function handleSearchInput() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');

  AppState.searchQuery = (input?.value || '').trim().toLowerCase();

  clearBtn?.classList.toggle('visible', Boolean(AppState.searchQuery));
  applyFilters();
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';

  document.getElementById('searchClearBtn')?.classList.remove('visible');
  AppState.searchQuery = '';

  applyFilters();
}

function setCategoryFilter(category, buttonEl) {
  AppState.activeCategory = category;

  document.querySelectorAll('#categoryChips .category-chip')
    .forEach(chip => chip.classList.remove('active'));

  buttonEl?.classList.add('active');
  applyFilters();
}

function applyFilters() {
  renderExploreProfiles();
}

function renderExploreProfiles() {
  const grid = document.getElementById('profilesGrid');
  if (!grid) return;

  const currentId = getUserId(AppState.currentUser);

  const filtered = AppState.users.filter(user => {
    if (getUserId(user) === currentId) return false;
    if (user.visibility === 'private') return false;

    const offered = getSkillArray(user, 'offered');
    const wanted = getSkillArray(user, 'wanted');
    const location = user.location || '';
    const name = user.name || '';

    if (AppState.searchQuery) {
      const query = AppState.searchQuery;

      const matches =
        name.toLowerCase().includes(query) ||
        location.toLowerCase().includes(query) ||
        offered.some(skill => skill.toLowerCase().includes(query)) ||
        wanted.some(skill => skill.toLowerCase().includes(query));

      if (!matches) return false;
    }

    if (AppState.activeCategory !== 'all') {
      const category = AppState.activeCategory.toLowerCase();

      if (
        !offered.some(skill => skill.toLowerCase().includes(category)) &&
        !wanted.some(skill => skill.toLowerCase().includes(category))
      ) {
        return false;
      }
    }

    if (AppState.filterAvailability !== 'all') {
      const availability = Array.isArray(user.availability)
        ? user.availability
        : [user.availability];

      if (!availability.includes(AppState.filterAvailability)) return false;
    }

    if (AppState.filterRating > 0 &&
        Number(user.rating || 0) < AppState.filterRating) {
      return false;
    }

    return true;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="glass-card" style="grid-column:1/-1;text-align:center;padding:48px 20px">
        <h3>No swappers found</h3>
        <p>Try adjusting your search terms or filters.</p>
        <button type="button" class="btn btn-primary" onclick="resetFilters()">Reset Filters</button>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(user => {
    const id = escapeHtml(getUserId(user));
    const name = escapeHtml(user.name || 'Unnamed user');
    const avatar = escapeHtml(user.avatar || '');
    const location = escapeHtml(user.location || 'Location not specified');
    const availability = escapeHtml(getAvailability(user));
    const offered = getSkillArray(user, 'offered');
    const wanted = getSkillArray(user, 'wanted');

    return `
      <article class="glass-card profile-card-minimal" id="card-${id}">
        <div>
          <div class="card-top-row">
            <img src="${avatar}" alt="${name}" class="card-avatar">
            <div class="card-user-info">
              <div class="card-name-row">
                <span class="card-name">${name}</span>
                <span class="card-rating-pill">★ ${escapeHtml(user.rating ?? '—')}</span>
              </div>
              <div class="card-city">${location} • ${availability}</div>
            </div>
          </div>

          <div class="card-teaches-block">
            <div class="card-label-small">TEACHES</div>
            <div class="card-teaches-title">${escapeHtml(getProfileSummary(user))}</div>
            <div class="card-teaches-desc">${escapeHtml(user.skillDesc || user.bio || '')}</div>
          </div>

          <div class="card-wants-box">
            <div class="card-wants-label">Wants to learn:</div>
            <div class="card-wants-pills">
              ${wanted.map(skill => `<span class="pill-wanted">${escapeHtml(skill)}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="card-footer-clean">
          <button type="button" class="btn btn-primary btn-propose-swap"
            onclick="openSwapRequestModal('${id}')">Propose Skill Swap</button>

          <button type="button" class="btn-card-action" title="AI Profile Summary"
            onclick="triggerAiProfileSummary('${id}')">AI</button>

          <button type="button" class="btn-card-action" title="Report Content"
            onclick="openReportModal('${id}')">⚑</button>
        </div>
      </article>`;
  }).join('');
}

function resetFilters() {
  const search = document.getElementById('searchInput');
  if (search) search.value = '';

  document.getElementById('searchClearBtn')?.classList.remove('visible');

  AppState.searchQuery = '';
  AppState.activeCategory = 'all';

  selectDropdownOption('availability', 'all', 'Any Availability');
  selectDropdownOption('rating', 0, 'Any Rating');

  document.querySelectorAll('#categoryChips .category-chip')
    .forEach((chip, index) => chip.classList.toggle('active', index === 0));

  renderExploreProfiles();
}

/* ==========================================================================
   8. MATCHES VIEW
   No fabricated compatibility scores or ranking.
   ========================================================================== */

function renderMatchesView() {
  const grid = document.getElementById('matchesGrid');
  if (!grid) return;

  const myOffered = getSkillArray(AppState.currentUser, 'offered')
    .map(skill => skill.toLowerCase());

  const myWanted = getSkillArray(AppState.currentUser, 'wanted')
    .map(skill => skill.toLowerCase());

  const matches = AppState.users.filter(user => {
    if (getUserId(user) === getUserId(AppState.currentUser)) return false;
    if (user.visibility === 'private') return false;

    const theyOffer = getSkillArray(user, 'offered')
      .map(skill => skill.toLowerCase());

    const theyWant = getSkillArray(user, 'wanted')
      .map(skill => skill.toLowerCase());

    return theyOffer.some(skill => myWanted.includes(skill)) &&
      theyWant.some(skill => myOffered.includes(skill));
  });

  if (!matches.length) {
    grid.innerHTML = `
      <div class="glass-card" style="grid-column:1/-1;text-align:center;padding:40px">
        No reciprocal skill exchanges found yet.
      </div>`;
    return;
  }

  grid.innerHTML = matches.map(user => {
    const id = escapeHtml(getUserId(user));

    return `
      <article class="glass-card match-card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <img src="${escapeHtml(user.avatar || '')}" class="card-avatar"
            alt="${escapeHtml(user.name || '')}">
          <div>
            <h4>${escapeHtml(user.name || 'Unnamed user')}</h4>
            <span>${escapeHtml(user.location || '')}</span>
          </div>
        </div>

        <div style="padding:12px;margin-bottom:16px">
          <strong>They teach:</strong>
          <div>${getSkillArray(user, 'offered').map(escapeHtml).join(', ')}</div>
          <strong>They want to learn:</strong>
          <div>${getSkillArray(user, 'wanted').map(escapeHtml).join(', ')}</div>
        </div>

        <button type="button" class="btn btn-primary" style="width:100%"
          onclick="openSwapRequestModal('${id}')">
          Propose Skill Swap
        </button>
      </article>`;
  }).join('');
}

/* ==========================================================================
   9. SWAP REQUESTS
   ========================================================================== */

function switchSwapSubtab(tab) {
  AppState.activeSwapSubtab = tab;

  document.querySelectorAll('.swap-subtab-btn')
    .forEach(btn => btn.classList.remove('active'));

  document.getElementById(`subtab-${tab}`)?.classList.add('active');
  renderSwapsList();
}

function renderSwapsList() {
  const container = document.getElementById('swapsListContainer');
  if (!container) return;

  const incoming = AppState.swaps.filter(swap => swap.type === 'incoming');
  const outgoing = AppState.swaps.filter(swap => swap.type === 'outgoing');
  const active = AppState.swaps.filter(swap =>
    ['accepted', 'completed'].includes(swap.status)
  );

  const setCount = (id, count) => {
    const element = document.getElementById(id);
    if (element) element.textContent = count;
  };

  setCount('subtabIncomingCount', incoming.filter(s => s.status === 'pending').length);
  setCount('subtabOutgoingCount', outgoing.filter(s => s.status === 'pending').length);
  setCount('subtabActiveCount', active.length);

  const filtered = AppState.activeSwapSubtab === 'incoming'
    ? incoming
    : AppState.activeSwapSubtab === 'outgoing'
      ? outgoing
      : active;

  if (!filtered.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-muted)">
        No ${escapeHtml(AppState.activeSwapSubtab)} swap requests.
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(swap => {
    const id = escapeHtml(getRecordId(swap));
    const name = escapeHtml(swap.partnerName || swap.partner_name || 'User');
    const avatar = escapeHtml(swap.partnerAvatar || swap.partner_avatar || '');
    const status = escapeHtml(swap.status || 'pending');

    return `
      <div class="swap-item-card" id="swap-${id}">
        <div style="display:flex;align-items:center;gap:14px;flex:1">
          <img src="${avatar}" alt="${name}"
            style="width:48px;height:48px;border-radius:50%;object-fit:cover">
          <div>
            <h4>${name}</h4>
            <div>Status: <strong>${status}</strong></div>
            <div>${escapeHtml(swap.message || '')}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          ${swap.status === 'pending' && AppState.activeSwapSubtab === 'incoming' ? `
            <button type="button" class="btn btn-emerald btn-sm"
              onclick="handleAcceptSwap('${id}')">Accept</button>
            <button type="button" class="btn btn-danger btn-sm"
              onclick="handleRejectSwap('${id}')">Decline</button>
          ` : ''}

          ${swap.status === 'pending' && AppState.activeSwapSubtab === 'outgoing' ? `
            <button type="button" class="btn btn-danger btn-sm"
              onclick="handleCancelOutgoingSwap('${id}')">Cancel</button>
          ` : ''}

          ${swap.status === 'accepted' ? `
            <button type="button" class="btn btn-emerald btn-sm"
              onclick="handleMarkCompleted('${id}')">Mark Complete</button>
          ` : ''}

          ${swap.status === 'completed' ? `
            <button type="button" class="btn btn-glass btn-sm"
              onclick="openRatingModal('${id}', '${name}')">Leave Rating</button>
          ` : ''}
        </div>
      </div>`;
  }).join('');
}

async function updateSwapStatus(swapId, status) {
  try {
    await apiRequest(CONFIG.ENDPOINTS.UPDATE_SWAP_STATUS(swapId), {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    await loadAppData();
    showToast(`Swap ${status}.`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function handleAcceptSwap(id) {
  return updateSwapStatus(id, 'accepted');
}

function handleRejectSwap(id) {
  return updateSwapStatus(id, 'cancelled');
}

function handleCancelOutgoingSwap(id) {
  return updateSwapStatus(id, 'cancelled');
}

function handleMarkCompleted(id) {
  return updateSwapStatus(id, 'completed');
}

/* ==========================================================================
   10. PROFILE & SKILLS
   ========================================================================== */

function syncProfileFormData() {
  const user = AppState.currentUser;
  if (!user) return;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? '';
  };

  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.value = value ?? '';
  };

  const avatar = document.getElementById('sidebarAvatarPreview');
  if (avatar) avatar.src = user.avatar || '';

  setText('sidebarName', user.name);
  setText('sidebarEmail', user.email);
  setText('sidebarRating', `★ ${user.rating ?? '—'} Rating`);
  setText('sidebarSwapsCount', `${user.swapsCompleted ?? 0} Swaps`);

  const toggle = document.getElementById('profileVisibilityToggle');

  if (toggle) {
    toggle.checked = user.visibility === 'public';

    const desc = document.getElementById('visibilityDesc');
    if (desc) {
      desc.textContent = toggle.checked
        ? 'Public: Discoverable in global search.'
        : 'Private: Hidden from directory.';
    }
  }

  setValue('profileFullName', user.name);
  setValue('profileLocation', user.location);
  setValue('profileBio', user.bio);

  const availability = Array.isArray(user.availability)
    ? user.availability
    : [user.availability].filter(Boolean);

  document.querySelectorAll('input[name="availability"]').forEach(cb => {
    cb.checked = availability.includes(cb.value);
  });

  renderEditableSkillTags('offered');
  renderEditableSkillTags('wanted');
}

function renderEditableSkillTags(type) {
  if (!AppState.currentUser) return;

  const container = document.getElementById(
    type === 'offered' ? 'offeredTagsContainer' : 'wantedTagsContainer'
  );

  const input = document.getElementById(
    type === 'offered' ? 'inputOfferedTag' : 'inputWantedTag'
  );

  const countBadge = document.getElementById(
    type === 'offered' ? 'offeredCount' : 'wantedCount'
  );

  if (!container || !input) return;

  const skills = getSkillArray(AppState.currentUser, type);

  if (countBadge) {
    countBadge.textContent =
      `${skills.length} Skill${skills.length === 1 ? '' : 's'}`;
  }

  container.querySelectorAll('.tag-editable-pill').forEach(el => el.remove());

  skills.forEach((skill, index) => {
    const pill = document.createElement('span');
    pill.className = `tag-editable-pill ${type}`;

    const label = document.createElement('span');
    label.textContent = skill;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag-remove-btn';
    button.textContent = '×';
    button.title = 'Remove skill';
    button.addEventListener('click', () => removeSkillTag(type, index));

    pill.append(label, button);
    container.insertBefore(pill, input);
  });
}

function removeSkillTag(type, index) {
  if (!AppState.currentUser) return;

  const key = type === 'offered' ? 'skillsOffered' : 'skillsWanted';
  const skills = AppState.currentUser[key];

  if (!Array.isArray(skills)) return;

  skills.splice(index, 1);
  renderEditableSkillTags(type);
}

function addSkillTag(type, skillName) {
  if (!AppState.currentUser) return;

  const cleanName = skillName.trim();
  if (!cleanName) return;

  const key = type === 'offered' ? 'skillsOffered' : 'skillsWanted';

  if (!Array.isArray(AppState.currentUser[key])) {
    AppState.currentUser[key] = [];
  }

  const skills = AppState.currentUser[key];

  if (!skills.some(skill => skill.toLowerCase() === cleanName.toLowerCase())) {
    skills.push(cleanName);
    renderEditableSkillTags(type);
  }
}

async function saveUserProfile(e) {
  e.preventDefault();

  if (!AppState.currentUser) {
    showToast('Please log in first.', 'error');
    return;
  }

  const availability = [
    ...document.querySelectorAll('input[name="availability"]:checked')
  ].map(cb => cb.value);

  const payload = {
    name: document.getElementById('profileFullName').value.trim(),
    location: document.getElementById('profileLocation').value.trim(),
    bio: document.getElementById('profileBio').value.trim(),
    availability,
    skills_offered: getSkillArray(AppState.currentUser, 'offered'),
    skills_wanted: getSkillArray(AppState.currentUser, 'wanted')
  };

  try {
    const data = await apiRequest(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    AppState.currentUser = data.user || {
      ...AppState.currentUser,
      name: payload.name,
      location: payload.location,
      bio: payload.bio,
      availability,
      skillsOffered: payload.skills_offered,
      skillsWanted: payload.skills_wanted
    };

    updateNavbarUserSnippet();
    syncProfileFormData();
    showToast('Profile saved.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function toggleVisibility(checkbox) {
  if (!AppState.currentUser) return;

  const previous = AppState.currentUser.visibility;
  const visibility = checkbox.checked ? 'public' : 'private';

  try {
    await apiRequest(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify({ visibility })
    });

    AppState.currentUser.visibility = visibility;
    showToast('Visibility updated.', 'success');
  } catch (error) {
    checkbox.checked = previous === 'public';
    showToast(error.message, 'error');
  }
}

async function promptAvatarUrl() {
  if (!AppState.currentUser) return;

  const url = prompt('Enter a profile photo URL:', AppState.currentUser.avatar || '');
  if (!url?.trim()) return;

  try {
    const data = await apiRequest(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify({ avatar: url.trim() })
    });

    AppState.currentUser = data.user || {
      ...AppState.currentUser,
      avatar: url.trim()
    };

    syncProfileFormData();
    updateNavbarUserSnippet();
    showToast('Profile photo updated.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/* ==========================================================================
   11. MODALS, SWAPS, RATINGS, AI SUMMARY & REPORTS
   ========================================================================== */

function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

function openPostSkillModal() {
  openModal('modalPostSkill');
}

async function handlePostSkillSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('newSkillTitle').value.trim();
  const desc = document.getElementById('newSkillDesc').value.trim();

  if (!title) return;

  if (!AppState.currentUser) {
    showToast('Please log in first.', 'error');
    return;
  }

  const offered = getSkillArray(AppState.currentUser, 'offered');

  try {
    const data = await apiRequest(CONFIG.ENDPOINTS.UPDATE_PROFILE, {
      method: 'PUT',
      body: JSON.stringify({
        skills_offered: [...offered, title],
        skill_descriptions: {
          ...(AppState.currentUser.skillsOfferedDesc || {}),
          [title]: desc
        }
      })
    });

    AppState.currentUser = data.user || {
      ...AppState.currentUser,
      skillsOffered: [...offered, title],
      skillsOfferedDesc: {
        ...(AppState.currentUser.skillsOfferedDesc || {}),
        [title]: desc
      }
    };

    closeModal('modalPostSkill');
    document.getElementById('formPostSkill')?.reset();

    renderEditableSkillTags('offered');
    renderExploreProfiles();
    showToast('Skill saved.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openSwapRequestModal(partnerId) {
  if (!AppState.currentUser) {
    showToast('Please log in first.', 'error');
    return;
  }

  const partner = AppState.users.find(
    user => getUserId(user) === String(partnerId)
  );

  if (!partner) {
    showToast('User not found.', 'error');
    return;
  }

  document.getElementById('swapTargetUserId').value = getUserId(partner);

  const avatar = document.getElementById('swapModalPartnerAvatar');
  if (avatar) avatar.src = partner.avatar || '';

  const name = document.getElementById('swapModalPartnerName');
  if (name) name.textContent = partner.name || '';

  const location = document.getElementById('swapModalPartnerLocation');
  if (location) {
    location.textContent =
      `${partner.location || ''} • Available ${getAvailability(partner)}`;
  }

  const wantSelect = document.getElementById('swapSkillIWant');
  const offerSelect = document.getElementById('swapSkillIOffer');

  wantSelect.innerHTML = getSkillArray(partner, 'offered')
    .map(skill => `<option value="${escapeHtml(skill)}">${escapeHtml(skill)}</option>`)
    .join('');

  offerSelect.innerHTML = getSkillArray(AppState.currentUser, 'offered')
    .map(skill => `<option value="${escapeHtml(skill)}">${escapeHtml(skill)}</option>`)
    .join('');

  const message = document.getElementById('swapCustomMessage');
  if (message) {
    message.value = `Hi ${partner.name || ''}! I'd like to exchange learning sessions.`;
  }

  openModal('modalSwapRequest');
}

async function handleSendSwapSubmit(e) {
  e.preventDefault();

  const partnerId = document.getElementById('swapTargetUserId').value;
  const skillWanted = document.getElementById('swapSkillIWant').value;
  const skillOffered = document.getElementById('swapSkillIOffer').value;
  const message = document.getElementById('swapCustomMessage').value.trim();

  try {
    await apiRequest(CONFIG.ENDPOINTS.CREATE_SWAP, {
      method: 'POST',
      body: JSON.stringify({
        partner_id: partnerId,
        skill_wanted: skillWanted,
        skill_offered: skillOffered,
        message
      })
    });

    closeModal('modalSwapRequest');
    await loadAppData();
    showToast('Swap request sent.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openRatingModal(swapId, partnerName) {
  document.getElementById('ratingSwapId').value = swapId;
  document.getElementById('modalRatingTitle').textContent =
    `Rate Exchange with ${partnerName}`;

  setStarRating(5);
  openModal('modalRating');
}

function setStarRating(rating) {
  document.getElementById('selectedStarValue').value = rating;

  document.querySelectorAll('#starRatingSelect .star-btn')
    .forEach((button, index) => {
      button.classList.toggle('active', index < rating);
    });
}

async function handleSubmitRating(e) {
  e.preventDefault();

  const swapId = document.getElementById('ratingSwapId').value;
  const rating = Number(document.getElementById('selectedStarValue').value);

  try {
    await apiRequest(CONFIG.ENDPOINTS.SUBMIT_REVIEW(swapId), {
      method: 'POST',
      body: JSON.stringify({ rating })
    });

    closeModal('modalRating');
    await loadAppData();
    showToast('Review submitted.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function triggerAiProfileSummary(userId) {
  const contentArea = document.getElementById('aiSummaryContentArea');
  if (!contentArea) return;

  openModal('modalAiSummary');
  contentArea.textContent = 'Generating profile summary...';

  try {
    const data = await apiRequest(CONFIG.ENDPOINTS.AI_SUMMARIZE(userId));

    contentArea.replaceChildren();

    const summary = document.createElement('p');
    summary.textContent =
      data.summary || data.response || 'No summary was returned.';

    contentArea.appendChild(summary);
  } catch (error) {
    contentArea.textContent = `Could not generate summary: ${error.message}`;
  }
}

function openReportModal(userId) {
  document.getElementById('reportTargetUserId').value = userId;
  openModal('modalReport');
}

async function handleReportSubmit(e) {
  e.preventDefault();

  const reason = document.getElementById('reportReasonSelect').value;
  const targetId = document.getElementById('reportTargetUserId').value;

  try {
    await apiRequest(CONFIG.ENDPOINTS.REPORT_CONTENT, {
      method: 'POST',
      body: JSON.stringify({
        target_user_id: targetId,
        reason
      })
    });

    closeModal('modalReport');
    document.getElementById('formReportUser')?.reset();
    showToast('Report submitted.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

/* ==========================================================================
   12. INITIALIZATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  const inputOffered = document.getElementById('inputOfferedTag');

  if (inputOffered) {
    inputOffered.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkillTag('offered', inputOffered.value);
        inputOffered.value = '';
      }
    });
  }

  const inputWanted = document.getElementById('inputWantedTag');

  if (inputWanted) {
    inputWanted.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkillTag('wanted', inputWanted.value);
        inputWanted.value = '';
      }
    });
  }

  const loaded = await loadAppData();

  if (loaded && document.getElementById('profilesGrid')) {
    navigateTo(AppState.currentView || 'explore');
  }
});
