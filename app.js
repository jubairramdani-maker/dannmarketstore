// ==========================================
//  ALWAYS ANIME - MAIN APP (app.js)
// ==========================================

// ---- STATE ----
let currentUser = null;
let animeData = [];
let filteredAnime = [];
let currentAnime = null;
let currentDetailAnime = null;
let currentCommentAnime = null;
let heroIndex = 0;
let heroAnimes = [];
let heroTimer = null;
let loadMorePage = 2;
let currentCategory = 'all';
let chatInterval = null;

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  initLoadingScreen();
});

function initLoadingScreen() {
  const bar = document.getElementById('loadingBar');
  const screen = document.getElementById('loadingScreen');
  createParticles();
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 18 + 5;
    if (progress >= 100) { progress = 100; clearInterval(interval); }
    bar.style.width = progress + '%';
    if (progress >= 100) {
      setTimeout(() => {
        screen.classList.add('fade-out');
        setTimeout(() => { screen.style.display = 'none'; initApp(); }, 800);
      }, 300);
    }
  }, 220);
}

function createParticles() {
  const container = document.getElementById('loadingParticles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.setProperty('--dur', (Math.random() * 4 + 3) + 's');
    p.style.setProperty('--delay', (Math.random() * 4) + 's');
    container.appendChild(p);
  }
}

async function initApp() {
  currentUser = DB.getCurrentUser();
  updateUIForUser();
  await loadAnimeData();
  renderHome();
  renderExplore();
  renderTrending();
  renderSchedule();
  renderFavorites();
  renderHistory();
  startLiveViewersUpdate();
  startChatPolling();
}

// ---- AUTH ----
function updateUIForUser() {
  const loggedIn = !!currentUser;
  document.getElementById('loginBtn').classList.toggle('hidden', loggedIn);
  document.getElementById('headerLoginBtn').classList.toggle('hidden', loggedIn);
  document.getElementById('profileBtn').classList.toggle('hidden', !loggedIn);
  document.getElementById('headerProfileBtn').classList.toggle('hidden', !loggedIn);
  document.getElementById('sidebarUser').classList.toggle('hidden', !loggedIn);
  document.getElementById('adminMenuBtn').classList.toggle('hidden', !loggedIn || !['admin', 'developer'].includes(currentUser?.role));

  if (currentUser) {
    document.getElementById('sidebarName').textContent = currentUser.name;
    document.getElementById('sidebarAvatar').src = currentUser.avatar;
    const roleBadge = document.getElementById('sidebarRoleBadge');
    roleBadge.textContent = currentUser.role === 'admin' ? '👑 Admin' : currentUser.role === 'developer' ? '💻 Dev' : '🎌 User';
    roleBadge.className = 'role-badge-sm role-badge ' + currentUser.role;
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register')));
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showToast('Isi semua field!'); return; }
  const result = DB.loginUser(email, password);
  if (result.error) { showToast('❌ ' + result.error); return; }
  currentUser = result.user;
  DB.setCurrentUser(currentUser);
  closeModal('authModal');
  updateUIForUser();
  renderFavorites(); renderHistory();
  showToast(`✅ Selamat datang, ${currentUser.name}!`);
  if (['admin', 'developer'].includes(currentUser.role)) {
    setTimeout(() => showToast(`👑 Kamu login sebagai ${currentUser.role.toUpperCase()}`), 1500);
  }
}

async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!name || !email || !password) { showToast('Isi semua field!'); return; }
  if (password.length < 6) { showToast('Password minimal 6 karakter'); return; }
  const result = DB.createUser(name, email, password);
  if (result.error) { showToast('❌ ' + result.error); return; }
  currentUser = result.user;
  DB.setCurrentUser(currentUser);
  closeModal('authModal');
  updateUIForUser();
  showToast(`🎉 Akun berhasil dibuat! Selamat datang, ${name}!`);
}

function handleGoogleLogin() {
  // Simulate Google login
  const googleUsers = ['Arjuna Pratama', 'Sakura Dewi', 'Reza Mahendra', 'Nadia Putri', 'Bintang Anggara'];
  const name = googleUsers[Math.floor(Math.random() * googleUsers.length)];
  const email = name.toLowerCase().replace(' ', '.') + '@gmail.com';
  let result = DB.getUserByEmail(email);
  if (!result) {
    DB.createUser(name, email, Math.random().toString(36));
    result = DB.getUserByEmail(email);
  }
  currentUser = result;
  DB.setCurrentUser(currentUser);
  closeModal('authModal');
  updateUIForUser();
  showToast(`✅ Login Google berhasil! Hai, ${name}!`);
}

function handleLogout() {
  DB.clearSession();
  currentUser = null;
  updateUIForUser();
  closeModal('settingsModal');
  showToast('👋 Sampai jumpa!');
  renderFavorites(); renderHistory();
}

// ---- ANIME DATA ----
async function loadAnimeData() {
  // Try to fetch from Jikan API, fallback to local data
  try {
    const [top, season] = await Promise.all([
      AnimeAPI.getTopAnime(1, 'bypopularity'),
      AnimeAPI.getSeasonNow(),
    ]);
    let combined = [];
    if (top?.data) combined = [...top.data];
    if (season?.data) {
      season.data.forEach(a => { if (!combined.find(b => b.mal_id === a.mal_id)) combined.push(a); });
    }
    if (combined.length > 0) { animeData = combined; }
    else { animeData = AnimeAPI.fallbackAnime; }
  } catch {
    animeData = AnimeAPI.fallbackAnime;
  }
  if (animeData.length < 10) animeData = [...animeData, ...AnimeAPI.fallbackAnime.filter(f => !animeData.find(a => a.mal_id === f.mal_id))];
  filteredAnime = [...animeData];
}

// ---- IMAGE HELPER ----
function getAnimeImage(anime) {
  return anime?.images?.jpg?.large_image_url || anime?.images?.jpg?.image_url || 'https://via.placeholder.com/300x450/1a1a28/e63946?text=Anime';
}

// ---- RENDER HOME ----
function renderHome() {
  heroAnimes = animeData.slice(0, 5);
  renderHeroBanner();
  renderAnimeRow('trendingRow', animeData.slice(0, 12));
  renderAnimeRow('newReleasesRow', [...animeData].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 12));
  renderAnimeRow('topRatedRow', [...animeData].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 12));
  renderLiveStats();
  renderContinueWatching();
}

function renderHeroBanner() {
  const dots = document.getElementById('heroDots');
  dots.innerHTML = heroAnimes.map((_, i) => `<div class="hero-dot ${i === 0 ? 'active' : ''}" onclick="setHero(${i})"></div>`).join('');
  setHero(0);
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = setInterval(() => setHero((heroIndex + 1) % heroAnimes.length), 6000);
}

function setHero(idx) {
  heroIndex = idx;
  const a = heroAnimes[idx];
  document.getElementById('heroBg').style.backgroundImage = `url(${getAnimeImage(a)})`;
  document.getElementById('heroTitle').textContent = a.title_english || a.title;
  document.getElementById('heroDesc').textContent = (a.synopsis || '').slice(0, 120) + '...';
  document.getElementById('heroRating').textContent = a.score || '?';
  document.getElementById('heroViewers').textContent = formatNum(DB.getViewCount(a.mal_id));
  document.getElementById('heroFavs').textContent = formatNum(a.members || 0);
  document.getElementById('heroPlayBtn').onclick = () => watchAnime(a);
  document.getElementById('heroInfoBtn').onclick = () => showDetail(a);
  document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function renderAnimeRow(containerId, animes) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = animes.map(a => createAnimeCard(a)).join('');
}

function createAnimeCard(anime, showProgress = false) {
  const isFav = currentUser ? DB.isFavorite(currentUser.id, anime.mal_id) : false;
  const viewers = DB.getViewCount(anime.mal_id);
  const score = anime.score || DB.getRating(anime.mal_id) || '?';
  const history = currentUser ? DB.getHistory(currentUser.id).find(h => h.animeId == anime.mal_id) : null;
  const progress = history ? history.progress : 0;
  return `
    <div class="anime-card" onclick="showDetail(animeData.find(a=>a.mal_id==${anime.mal_id})||AnimeAPI.fallbackAnime.find(a=>a.mal_id==${anime.mal_id}))">
      <div class="card-poster">
        <img src="${getAnimeImage(anime)}" alt="${anime.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450/1a1a28/e63946?text=Anime'">
        <div class="card-badges">
          <span class="card-badge-score"><i class="fas fa-star"></i> ${score}</span>
          ${anime.status === 'Currently Airing' ? '<span class="card-badge-new">ON AIR</span>' : ''}
        </div>
        <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation();toggleFavorite(animeData.find(a=>a.mal_id==${anime.mal_id})||AnimeAPI.fallbackAnime.find(a=>a.mal_id==${anime.mal_id}))">
          <i class="fas fa-heart"></i>
        </button>
        <div class="card-overlay">
          <div class="card-play-btn" onclick="event.stopPropagation();watchAnime(animeData.find(a=>a.mal_id==${anime.mal_id})||AnimeAPI.fallbackAnime.find(a=>a.mal_id==${anime.mal_id}))">
            <i class="fas fa-play"></i>
          </div>
        </div>
        ${progress > 0 ? `<div class="card-progress"><div class="card-progress-bar" style="width:${progress}%"></div></div>` : ''}
      </div>
      <div class="card-info">
        <p class="card-title">${anime.title_english || anime.title}</p>
        <div class="card-meta">
          <span class="card-genre">${anime.genres?.[0]?.name || 'Anime'}</span>
          <span class="card-viewers"><i class="fas fa-eye"></i>${formatNum(viewers)}</span>
        </div>
      </div>
    </div>`;
}

// ---- RENDER EXPLORE ----
function renderExplore(data = null) {
  const grid = document.getElementById('exploreGrid');
  const list = data || filteredAnime;
  grid.innerHTML = list.slice(0, 24).map(a => createAnimeCard(a)).join('');
}

function applyFilters() {
  const genre = document.getElementById('filterGenre').value;
  const year = document.getElementById('filterYear').value;
  const status = document.getElementById('filterStatus').value;
  const sort = document.getElementById('sortBy').value;

  let list = [...animeData];
  if (genre) list = list.filter(a => a.genres?.some(g => g.name.toLowerCase() === genre.toLowerCase()));
  if (year) list = list.filter(a => a.year == year || (a.aired?.from && a.aired.from.startsWith(year)));
  if (status === 'ongoing') list = list.filter(a => a.status?.includes('Airing'));
  if (status === 'completed') list = list.filter(a => a.status?.includes('Finished'));
  if (sort === 'rating') list.sort((a, b) => (b.score || 0) - (a.score || 0));
  else if (sort === 'newest') list.sort((a, b) => (b.year || 0) - (a.year || 0));
  else if (sort === 'az') list.sort((a, b) => (a.title_english || a.title).localeCompare(b.title_english || b.title));
  else list.sort((a, b) => (b.members || 0) - (a.members || 0));
  filteredAnime = list;
  renderExplore(list);
}

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  if (cat === 'all') { filteredAnime = [...animeData]; }
  else { filteredAnime = animeData.filter(a => a.genres?.some(g => g.name.toLowerCase().includes(cat))); }
  renderAnimeRow('trendingRow', filteredAnime.slice(0, 12));
}

async function loadMoreAnime() {
  showToast('⏳ Memuat lebih banyak anime...');
  try {
    const data = await AnimeAPI.getTopAnime(loadMorePage, 'bypopularity');
    if (data?.data?.length) {
      data.data.forEach(a => { if (!animeData.find(b => b.mal_id === a.mal_id)) animeData.push(a); });
      filteredAnime = [...animeData];
      loadMorePage++;
      renderExplore();
      showToast('✅ Anime baru dimuat!');
    }
  } catch { showToast('⚠️ Gagal memuat, coba lagi'); }
}

// ---- TRENDING ----
function renderTrending() {
  const list = document.getElementById('trendingList');
  const sorted = [...animeData].sort((a, b) => (b.members || 0) - (a.members || 0)).slice(0, 20);
  list.innerHTML = sorted.map((a, i) => `
    <div class="trending-item" onclick="showDetail(animeData[${animeData.indexOf(a)}]||AnimeAPI.fallbackAnime.find(x=>x.mal_id==${a.mal_id}))">
      <span class="trending-rank ${i < 3 ? 'top' : ''}">${String(i + 1).padStart(2, '0')}</span>
      <img src="${getAnimeImage(a)}" alt="${a.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/56x80/1a1a28/e63946?text=?'">
      <div class="trending-info">
        <h3>${a.title_english || a.title}</h3>
        <p>${a.genres?.map(g => g.name).join(', ') || 'Anime'} · ${a.year || '?'}</p>
      </div>
      <div class="trending-stats">
        <span class="trend-score"><i class="fas fa-star"></i>${a.score || '?'}</span>
        <span class="trend-viewers"><i class="fas fa-eye"></i> ${formatNum(a.members || 0)}</span>
      </div>
    </div>`).join('');
}

// ---- SCHEDULE ----
function renderSchedule() {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const todayIdx = (new Date().getDay() + 6) % 7; // 0=Mon
  const grid = document.getElementById('scheduleGrid');
  const shuffled = [...animeData].sort(() => Math.random() - 0.5);

  grid.innerHTML = days.map((day, i) => {
    const dayAnimes = shuffled.slice(i * 3, i * 3 + 3).filter(Boolean);
    return `
      <div class="schedule-day">
        <div class="schedule-day-header ${i === todayIdx ? 'today' : ''}">${day}${i === todayIdx ? ' 🔴' : ''}</div>
        <div class="schedule-anime">
          ${dayAnimes.map(a => `
            <div class="schedule-anime-item" onclick="showDetail(animeData.find(x=>x.mal_id==${a.mal_id})||AnimeAPI.fallbackAnime.find(x=>x.mal_id==${a.mal_id}))">
              <p>${(a.title_english || a.title).slice(0, 22)}${(a.title_english || a.title).length > 22 ? '...' : ''}</p>
              <span>${String(Math.floor(Math.random() * 12 + 18)).padStart(2, '0')}:00 WIB</span>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

// ---- FAVORITES ----
function renderFavorites() {
  const grid = document.getElementById('favoritesGrid');
  const empty = document.getElementById('emptyFavorites');
  if (!currentUser) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  const favIds = DB.getFavorites(currentUser.id);
  const favAnimes = favIds.map(id => animeData.find(a => a.mal_id == id) || AnimeAPI.fallbackAnime.find(a => a.mal_id == id)).filter(Boolean);
  if (!favAnimes.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = favAnimes.map(a => createAnimeCard(a)).join('');
}

function toggleFavorite(anime) {
  if (!anime) return;
  if (!currentUser) { openModal('authModal'); showToast('⚠️ Login dulu untuk menyimpan favorit'); return; }
  const added = DB.toggleFavorite(currentUser.id, anime.mal_id);
  showToast(added ? '❤️ Ditambahkan ke favorit!' : '💔 Dihapus dari favorit');
  renderFavorites();
  renderHome();
  // Update current detail modal
  if (currentDetailAnime?.mal_id === anime.mal_id) {
    const btn = document.getElementById('detailFavBtn');
    if (btn) btn.innerHTML = `<i class="fas fa-heart"></i> ${added ? 'Hapus' : 'Favorit'}`;
  }
}

// ---- HISTORY ----
function renderHistory() {
  const grid = document.getElementById('historyGrid');
  const empty = document.getElementById('emptyHistory');
  if (!currentUser) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  const hist = DB.getHistory(currentUser.id);
  const histAnimes = hist.map(h => ({
    anime: animeData.find(a => a.mal_id == h.animeId) || AnimeAPI.fallbackAnime.find(a => a.mal_id == h.animeId),
    episode: h.episode, watchedAt: h.watchedAt, progress: h.progress,
  })).filter(h => h.anime);
  if (!histAnimes.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = histAnimes.map(h => createAnimeCard({ ...h.anime, progress: h.progress }, true)).join('');
  renderContinueWatching();
}

function renderContinueWatching() {
  if (!currentUser) return;
  const hist = DB.getHistory(currentUser.id).slice(0, 6);
  if (!hist.length) return;
  const animes = hist.map(h => animeData.find(a => a.mal_id == h.animeId) || AnimeAPI.fallbackAnime.find(a => a.mal_id == h.animeId)).filter(Boolean);
  if (!animes.length) return;
  document.getElementById('continueSection').classList.remove('hidden');
  renderAnimeRow('continueRow', animes);
}

// ---- LIVE STATS ----
function renderLiveStats() {
  const container = document.getElementById('liveStats');
  const topAnimes = animeData.slice(0, 8);
  container.innerHTML = topAnimes.map(a => `
    <div class="live-stat-card">
      <img src="${getAnimeImage(a)}" alt="${a.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/36x50/1a1a28/e63946?text=?'">
      <div class="live-info">
        <p>${(a.title_english || a.title).slice(0, 18)}</p>
        <span><i class="fas fa-eye"></i> ${formatNum(DB.getLiveViewers(a.mal_id))} live</span>
      </div>
    </div>`).join('');
}

function startLiveViewersUpdate() {
  setInterval(() => { if (document.getElementById('section-home').classList.contains('active')) renderLiveStats(); }, 8000);
}

// ---- SEARCH ----
let searchDebounce = null;
async function searchAnime(query) {
  const results = document.getElementById('searchResults');
  if (!query.trim()) { results.classList.remove('open'); return; }

  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    const local = [...animeData, ...AnimeAPI.fallbackAnime].filter(a =>
      (a.title_english || a.title).toLowerCase().includes(query.toLowerCase()) ||
      a.genres?.some(g => g.name.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 6);

    let apiResults = [];
    try {
      const data = await AnimeAPI.searchAnime(query);
      if (data?.data) apiResults = data.data.filter(a => !local.find(b => b.mal_id === a.mal_id)).slice(0, 4);
    } catch {}

    const all = [...local, ...apiResults].slice(0, 8);
    if (!all.length) { results.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">Tidak ditemukan</div>'; results.classList.add('open'); return; }

    results.innerHTML = all.map(a => `
      <div class="search-result-item" onclick="showDetail(${JSON.stringify(a).replace(/"/g, '&quot;')});document.getElementById('searchResults').classList.remove('open');">
        <img src="${getAnimeImage(a)}" alt="${a.title}" onerror="this.src='https://via.placeholder.com/40x56/1a1a28/e63946?text=?'">
        <div class="result-info">
          <p>${a.title_english || a.title}</p>
          <span>${a.genres?.map(g => g.name).slice(0, 2).join(', ') || 'Anime'} · ${a.score || '?'}⭐</span>
        </div>
      </div>`).join('');
    results.classList.add('open');
  }, 350);
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-bar')) document.getElementById('searchResults').classList.remove('open');
});

// ---- DETAIL MODAL ----
function showDetail(anime) {
  if (!anime) return;
  currentDetailAnime = anime;
  const isFav = currentUser ? DB.isFavorite(currentUser.id, anime.mal_id) : false;
  const isAdminOrDev = currentUser && ['admin', 'developer'].includes(currentUser.role);

  document.getElementById('detailImg').src = getAnimeImage(anime);
  document.getElementById('detailTitle').textContent = anime.title_english || anime.title;
  document.getElementById('detailScore').textContent = anime.score || DB.getRating(anime.mal_id) || '?';
  document.getElementById('detailViewers').textContent = formatNum(DB.getViewCount(anime.mal_id));
  document.getElementById('detailDesc').textContent = anime.synopsis || 'Tidak ada sinopsis.';
  document.getElementById('detailEps').textContent = anime.episodes || '?';
  document.getElementById('detailStatus').textContent = anime.status === 'Currently Airing' ? '🟢 Tayang' : '✅ Selesai';
  document.getElementById('detailStudio').textContent = anime.studios?.[0]?.name || '?';
  document.getElementById('detailYear').textContent = anime.year || (anime.aired?.from?.slice(0, 4)) || '?';
  document.getElementById('detailTags').innerHTML = (anime.genres || []).map(g => `<span class="detail-tag">${g.name}</span>`).join('');
  document.getElementById('detailFavBtn').innerHTML = `<i class="fas fa-heart"></i> ${isFav ? 'Hapus' : 'Favorit'}`;
  document.getElementById('btnChangeImg').classList.toggle('hidden', !isAdminOrDev);
  openModal('detailModal');
  DB.incrementView(anime.mal_id);
}

// ---- WATCH ----
function watchAnime(anime) {
  if (!anime) return;
  currentAnime = anime;
  closeModal('detailModal');

  document.getElementById('watchTitle').textContent = anime.title_english || anime.title;
  document.getElementById('watchRating').textContent = anime.score || '?';
  document.getElementById('watchViewers').textContent = formatNum(DB.getLiveViewers(anime.mal_id));

  const totalEps = anime.episodes || 12;
  const epList = document.getElementById('episodeList');
  epList.innerHTML = `<h4>Episode List</h4>` + Array.from({ length: Math.min(totalEps, 50) }, (_, i) => `
    <button class="ep-btn ${i === 0 ? 'active' : ''}" onclick="playEpisode(${anime.mal_id}, ${i + 1}, this)">
      Ep ${i + 1}
    </button>`).join('');

  playEpisode(anime.mal_id, 1, epList.querySelector('.ep-btn'));
  openModal('watchModal');

  if (currentUser) {
    DB.addHistory(currentUser.id, anime.mal_id, 1, 5);
    renderHistory();
  }
}

function playEpisode(animeId, epNum, btn) {
  const anime = animeData.find(a => a.mal_id == animeId) || AnimeAPI.fallbackAnime.find(a => a.mal_id == animeId);
  document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const videoUrl = AnimeAPI.getVideoUrl(anime);
  const frame = document.getElementById('videoFrame');
  const placeholder = document.querySelector('.video-placeholder');
  frame.src = videoUrl;
  frame.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';
  document.getElementById('watchEpisode').textContent = `Episode ${epNum}`;

  if (currentUser) {
    const progress = Math.min(100, (epNum / (anime?.episodes || 12)) * 100);
    DB.addHistory(currentUser.id, animeId, epNum, progress);
  }
}

// ---- CHANGE IMAGE (Admin/Dev) ----
function changeAnimeImage() {
  if (!currentUser || !['admin', 'developer'].includes(currentUser.role)) return;
  const url = prompt('Masukkan URL gambar baru:');
  if (!url) return;
  const anime = currentDetailAnime;
  if (!anime.images) anime.images = { jpg: {} };
  anime.images.jpg.large_image_url = url;
  document.getElementById('detailImg').src = url;
  DB.updateAnimeImage(anime.mal_id, url);
  // Update in local array
  const idx = animeData.findIndex(a => a.mal_id === anime.mal_id);
  if (idx !== -1) animeData[idx] = anime;
  showToast('✅ Gambar berhasil diubah!');
  renderHome(); renderExplore();
}

// ---- COMMENTS ----
function showComments(anime) {
  currentCommentAnime = anime;
  closeModal('detailModal');
  document.getElementById('commentAnimeTitle').textContent = anime.title_english || anime.title;
  renderComments(anime.mal_id);
  const avatar = currentUser ? currentUser.avatar : 'https://api.dicebear.com/8.x/avataaars/svg?seed=guest';
  document.getElementById('commentUserAvatar').src = avatar;
  openModal('commentsModal');
}

function renderComments(animeId) {
  const list = document.getElementById('commentsList');
  const comments = DB.getComments(animeId);
  if (!comments.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Belum ada komentar. Jadilah yang pertama!</div>';
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <img src="${c.userAvatar}" alt="${c.userName}" onerror="this.src='https://api.dicebear.com/8.x/avataaars/svg?seed=${c.userName}'">
      <div class="comment-body">
        <div class="comment-header">
          <strong>${c.userName}</strong>
          <span class="comment-role role-badge ${c.userRole}">${c.userRole === 'admin' ? '👑 Admin' : c.userRole === 'developer' ? '💻 Dev' : ''}</span>
          <time>${timeAgo(c.createdAt)}</time>
          ${(currentUser?.id === c.userId || ['admin','developer'].includes(currentUser?.role)) ? `<button onclick="deleteComment('${c.id}')" style="color:var(--accent);font-size:11px;margin-left:4px;"><i class="fas fa-trash"></i></button>` : ''}
        </div>
        <p>${escapeHtml(c.text)}</p>
      </div>
    </div>`).join('');
}

function submitComment() {
  if (!currentUser) { openModal('authModal'); showToast('⚠️ Login dulu untuk berkomentar!'); return; }
  const input = document.getElementById('commentInput');
  const text = input.value.trim();
  if (!text) return;
  if (text.length > 500) { showToast('Komentar terlalu panjang (maks 500 karakter)'); return; }
  DB.addComment(currentUser.id, currentCommentAnime.mal_id, text);
  input.value = '';
  renderComments(currentCommentAnime.mal_id);
  showToast('💬 Komentar berhasil dikirim!');
}

function deleteComment(commentId) {
  if (!currentUser) return;
  if (DB.deleteComment(commentId, currentUser.id)) {
    renderComments(currentCommentAnime.mal_id);
    showToast('🗑️ Komentar dihapus');
  }
}

function renderAllComments() {
  const container = document.getElementById('allComments');
  const comments = DB.getAllComments();
  if (!comments.length) { container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>Belum ada komentar</p></div>'; return; }
  container.innerHTML = comments.map(c => `
    <div class="comment-item">
      <img src="${c.userAvatar}" alt="${c.userName}" onerror="this.src='https://api.dicebear.com/8.x/avataaars/svg?seed=${c.userName}'">
      <div class="comment-body">
        <div class="comment-header">
          <strong>${c.userName}</strong>
          <span class="comment-role role-badge ${c.userRole}">${c.userRole === 'admin' ? '👑' : c.userRole === 'developer' ? '💻' : ''}</span>
          <time>${timeAgo(c.createdAt)}</time>
        </div>
        <p>${escapeHtml(c.text)}</p>
      </div>
    </div>`).join('');
}

// ---- PROFILE ----
function openProfile() {
  if (!currentUser) { openModal('authModal'); return; }
  const freshUser = DB.getUserById(currentUser.id) || currentUser;
  document.getElementById('profileAvatar').src = freshUser.avatar;
  document.getElementById('profileName').textContent = freshUser.name;
  document.getElementById('profileEmail').textContent = freshUser.email;
  const roleBadge = document.getElementById('profileRole');
  roleBadge.textContent = freshUser.role === 'admin' ? '👑 Admin' : freshUser.role === 'developer' ? '💻 Developer' : '🎌 Anime Fan';
  roleBadge.className = 'role-badge ' + freshUser.role;
  document.getElementById('profFavCount').textContent = DB.getFavorites(freshUser.id).length;
  document.getElementById('profHistCount').textContent = DB.getHistory(freshUser.id).length;
  document.getElementById('profCommentCount').textContent = DB.getAllComments().filter(c => c.userId === freshUser.id).length;
  switchProfileTab('favorites');
  openModal('profileModal');
}

function switchProfileTab(tab) {
  document.querySelectorAll('.prof-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'favorites') || (i === 1 && tab === 'history')));
  const content = document.getElementById('profileTabContent');
  if (tab === 'favorites') {
    const ids = DB.getFavorites(currentUser.id);
    const animes = ids.map(id => animeData.find(a => a.mal_id == id) || AnimeAPI.fallbackAnime.find(a => a.mal_id == id)).filter(Boolean);
    if (!animes.length) { content.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-heart-broken"></i><p>Belum ada favorit</p></div>'; return; }
    content.innerHTML = animes.map(a => createAnimeCard(a)).join('');
  } else {
    const hist = DB.getHistory(currentUser.id);
    const animes = hist.map(h => animeData.find(a => a.mal_id == h.animeId) || AnimeAPI.fallbackAnime.find(a => a.mal_id == h.animeId)).filter(Boolean);
    if (!animes.length) { content.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-film"></i><p>Belum ada riwayat</p></div>'; return; }
    content.innerHTML = animes.map(a => createAnimeCard(a)).join('');
  }
}

function changeAvatar() {
  const url = prompt('Masukkan URL avatar baru:');
  if (!url) return;
  const updated = DB.updateUser(currentUser.id, { avatar: url });
  if (updated) {
    currentUser = updated; DB.setCurrentUser(updated);
    document.getElementById('profileAvatar').src = url;
    document.getElementById('sidebarAvatar').src = url;
    showToast('✅ Avatar diperbarui!');
  }
}

// ---- ADMIN PANEL ----
function openAdminPanel() {
  if (!currentUser || !['admin', 'developer'].includes(currentUser.role)) { showToast('⛔ Akses ditolak!'); return; }
  const stats = DB.getStats();
  document.getElementById('adminUserCount').textContent = stats.users;
  document.getElementById('adminAnimeCount').textContent = animeData.length;
  document.getElementById('adminViewCount').textContent = formatNum(stats.history * 100);
  document.getElementById('adminCommentCount').textContent = stats.comments;
  const users = DB.getUsers();
  document.getElementById('adminUserList').innerHTML = users.map(u => `
    <div class="admin-user-row">
      <img src="${u.avatar}" alt="${u.name}" onerror="this.src='https://api.dicebear.com/8.x/avataaars/svg?seed=${u.name}'">
      <div><div class="au-name">${u.name}</div><div class="au-email">${u.email}</div></div>
      <div class="au-role"><span class="role-badge ${u.role}">${u.role}</span></div>
    </div>`).join('');
  openModal('adminModal');
}

// ---- PUBLIC CHAT ----
function openChatModal() {
  const avatar = currentUser ? currentUser.avatar : 'https://api.dicebear.com/8.x/avataaars/svg?seed=guest';
  document.getElementById('chatUserAvatar').src = avatar;
  document.getElementById('chatOnlineCount').textContent = Math.floor(Math.random() * 200 + 50) + ' online';
  renderChatMessages();
  openModal('chatModal');
}

function renderChatMessages() {
  const container = document.getElementById('chatMessages');
  const messages = DB.getChatMessages();
  container.innerHTML = messages.map(m => `
    <div class="chat-msg ${m.userId === currentUser?.id ? 'mine' : ''}">
      <img src="${m.userAvatar}" alt="${m.userName}" onerror="this.src='https://api.dicebear.com/8.x/avataaars/svg?seed=${m.userName}'">
      <div class="chat-msg-body">
        <div class="chat-msg-header">
          <strong>${m.userName}</strong>
          ${m.userRole !== 'user' ? `<span class="role-badge ${m.userRole}" style="font-size:9px">${m.userRole}</span>` : ''}
          <time>${formatTime(m.time)}</time>
        </div>
        <div class="chat-msg-bubble">${escapeHtml(m.text)}</div>
      </div>
    </div>`).join('');
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  if (!currentUser) { openModal('authModal'); showToast('⚠️ Login dulu untuk chat!'); return; }
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  DB.addChatMessage(currentUser.id, text);
  input.value = '';
  renderChatMessages();
  document.getElementById('chatBadge').style.display = 'none';
}

function startChatPolling() {
  // Simulate chat activity with bot messages
  const botMessages = [
    { user: 'AnimeBot', text: '🎌 Anime terbaru minggu ini udah keluar!', role: 'developer' },
    { user: 'SakuraChan', text: 'Ada yang udah nonton Frieren? Keren banget!', role: 'user' },
    { user: 'OtakuKing99', text: 'Bleach TYBW animasinya gila sih 🔥', role: 'user' },
    { user: 'AnimeNerd', text: 'Jujutsu Kaisen season 2 terbaik!', role: 'user' },
    { user: 'MangaReader', text: 'Kapan Vinland Saga Season 3 keluar ya?', role: 'user' },
  ];
  const bots = DB.getUsers().filter(u => u.role === 'developer' || u.role === 'admin');

  setInterval(() => {
    const isOpen = !document.getElementById('chatModal').classList.contains('hidden');
    if (Math.random() > 0.7) {
      const bot = botMessages[Math.floor(Math.random() * botMessages.length)];
      const user = bots[Math.floor(Math.random() * bots.length)];
      if (user) DB.addChatMessage(user.id, bot.text);
      if (isOpen) renderChatMessages();
    }
    document.getElementById('chatOnlineCount').textContent = Math.floor(Math.random() * 200 + 50) + ' online';
  }, 15000);
}

// ---- SECTION NAVIGATION ----
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name)?.classList.add('active');
  document.querySelectorAll('.sidebar-menu li').forEach(li => {
    const text = li.querySelector('span')?.textContent?.toLowerCase();
    li.classList.toggle('active', text === name || (name === 'home' && text === 'beranda') || (name === 'explore' && text === 'jelajahi') || (name === 'trending' && text === 'trending') || (name === 'favorites' && text === 'favorit') || (name === 'history' && text === 'riwayat') || (name === 'schedule' && text === 'jadwal'));
  });
  document.querySelectorAll('.mobile-nav button').forEach((b, i) => {
    const names = ['home', 'explore', 'trending', 'chat', 'profile'];
    b.classList.toggle('active', names[i] === name);
  });
  if (name === 'comments') renderAllComments();
  if (name === 'favorites') renderFavorites();
  if (name === 'history') renderHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- SETTINGS ----
function toggleDarkMode() {
  document.body.classList.toggle('light-mode', !document.getElementById('darkModeToggle').checked);
}

// ---- MODAL HELPERS ----
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'chatModal') { openChatModal(); return; }
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (id === 'watchModal') { document.getElementById('videoFrame').src = ''; }
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

// ---- SIDEBAR ----
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.toggle('open');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) { overlay = document.createElement('div'); overlay.className = 'sidebar-overlay'; document.body.appendChild(overlay); overlay.addEventListener('click', () => { sb.classList.remove('open'); overlay.style.display = 'none'; }); }
  overlay.style.display = sb.classList.contains('open') ? 'block' : 'none';
}

// ---- TOAST ----
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---- UTILITIES ----
function formatNum(n) {
  if (!n) return '0';
  n = parseInt(n);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'rb';
  return n.toString();
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return m + ' menit lalu';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' jam lalu';
  return Math.floor(h / 24) + ' hari lalu';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ---- KEYBOARD SHORTCUTS ----
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
  }
  if (e.key === '/' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});

console.log('%c🎌 Always Anime Loaded!', 'color: #e63946; font-weight: bold; font-size: 16px; text-shadow: 0 0 10px rgba(230,57,70,0.5)');
console.log('%c💻 Demo accounts: admin@always.com | dev@always.com | user@test.com (pass: 123456)', 'color: #9b59b6');
