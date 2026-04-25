// ==========================================
//  ALWAYS ANIME - DATABASE & BACKEND (db.js)
//  Simulated backend with localStorage
// ==========================================

const DB = {
  // ---- COLLECTIONS ----
  collections: {
    users: 'aa_users',
    animes: 'aa_animes',
    comments: 'aa_comments',
    favorites: 'aa_favorites',
    history: 'aa_history',
    chatMessages: 'aa_chat',
    ratings: 'aa_ratings',
    viewCount: 'aa_views',
  },

  // ---- HELPERS ----
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },
  getObj(key, defaultVal = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || defaultVal; }
    catch { return defaultVal; }
  },
  setObj(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // ---- USERS ----
  getUsers() { return this.get(this.collections.users); },
  saveUsers(users) { this.set(this.collections.users, users); },
  getUserById(id) { return this.getUsers().find(u => u.id === id); },
  getUserByEmail(email) { return this.getUsers().find(u => u.email === email.toLowerCase()); },

  createUser(name, email, password, role = 'user') {
    const users = this.getUsers();
    if (this.getUserByEmail(email)) return { error: 'Email sudah terdaftar' };
    const user = {
      id: this.genId(), name, email: email.toLowerCase(),
      password: btoa(password), role,
      avatar: `https://api.dicebear.com/8.x/avataaars/svg?seed=${name}`,
      createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(),
    };
    users.push(user);
    this.saveUsers(users);
    return { user };
  },

  loginUser(email, password) {
    const user = this.getUserByEmail(email);
    if (!user) return { error: 'Email tidak ditemukan' };
    if (user.password !== btoa(password)) return { error: 'Password salah' };
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    users[idx].lastLogin = new Date().toISOString();
    this.saveUsers(users);
    return { user };
  },

  updateUser(id, updates) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    users[idx] = { ...users[idx], ...updates };
    this.saveUsers(users);
    return users[idx];
  },

  // ---- SESSION ----
  getCurrentUser() { return this.getObj('aa_session', null); },
  setCurrentUser(user) { this.setObj('aa_session', user); },
  clearSession() { localStorage.removeItem('aa_session'); },

  // ---- FAVORITES ----
  getFavorites(userId) {
    const all = this.get(this.collections.favorites);
    return all.filter(f => f.userId === userId).map(f => f.animeId);
  },
  toggleFavorite(userId, animeId) {
    let all = this.get(this.collections.favorites);
    const idx = all.findIndex(f => f.userId === userId && f.animeId === animeId);
    if (idx !== -1) { all.splice(idx, 1); this.set(this.collections.favorites, all); return false; }
    all.push({ userId, animeId, addedAt: new Date().toISOString() });
    this.set(this.collections.favorites, all); return true;
  },
  isFavorite(userId, animeId) {
    return this.get(this.collections.favorites).some(f => f.userId === userId && f.animeId === animeId);
  },

  // ---- HISTORY ----
  getHistory(userId) {
    return this.get(this.collections.history)
      .filter(h => h.userId === userId)
      .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
  },
  addHistory(userId, animeId, episode = 1, progress = 0) {
    let all = this.get(this.collections.history);
    const idx = all.findIndex(h => h.userId === userId && h.animeId === animeId);
    const entry = { userId, animeId, episode, progress, watchedAt: new Date().toISOString() };
    if (idx !== -1) all[idx] = entry; else all.push(entry);
    this.set(this.collections.history, all);
  },

  // ---- COMMENTS ----
  getComments(animeId) {
    return this.get(this.collections.comments)
      .filter(c => c.animeId === animeId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getAllComments() {
    return this.get(this.collections.comments)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);
  },
  addComment(userId, animeId, text) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const comments = this.get(this.collections.comments);
    const comment = {
      id: this.genId(), userId, animeId, text,
      userName: user.name, userAvatar: user.avatar, userRole: user.role,
      createdAt: new Date().toISOString(), likes: 0,
    };
    comments.push(comment);
    this.set(this.collections.comments, comments);
    return comment;
  },
  deleteComment(commentId, userId) {
    const user = this.getUserById(userId);
    let comments = this.get(this.collections.comments);
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return false;
    if (comment.userId !== userId && !['admin', 'developer'].includes(user?.role)) return false;
    comments = comments.filter(c => c.id !== commentId);
    this.set(this.collections.comments, comments);
    return true;
  },

  // ---- RATINGS ----
  getRating(animeId) {
    const ratings = this.get(this.collections.ratings).filter(r => r.animeId === animeId);
    if (!ratings.length) return 0;
    return (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1);
  },
  setRating(userId, animeId, score) {
    let ratings = this.get(this.collections.ratings);
    const idx = ratings.findIndex(r => r.userId === userId && r.animeId === animeId);
    if (idx !== -1) ratings[idx].score = score;
    else ratings.push({ userId, animeId, score, ratedAt: new Date().toISOString() });
    this.set(this.collections.ratings, ratings);
  },

  // ---- VIEW COUNT ----
  getViewCount(animeId) {
    const counts = this.getObj(this.collections.viewCount, {});
    return counts[animeId] || Math.floor(Math.random() * 50000 + 1000);
  },
  incrementView(animeId) {
    const counts = this.getObj(this.collections.viewCount, {});
    counts[animeId] = (counts[animeId] || 0) + 1;
    this.setObj(this.collections.viewCount, counts);
  },
  getLiveViewers(animeId) {
    return Math.floor(Math.random() * 500 + 10);
  },

  // ---- CHAT ----
  getChatMessages() {
    return this.get(this.collections.chatMessages).slice(-100);
  },
  addChatMessage(userId, text) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const msgs = this.get(this.collections.chatMessages);
    const msg = {
      id: this.genId(), userId, text,
      userName: user.name, userAvatar: user.avatar, userRole: user.role,
      time: new Date().toISOString(),
    };
    msgs.push(msg);
    if (msgs.length > 200) msgs.splice(0, msgs.length - 100);
    this.set(this.collections.chatMessages, msgs);
    return msg;
  },

  // ---- ANIME (update image) ----
  updateAnimeImage(animeId, imageUrl) {
    const user = this.getCurrentUser();
    if (!user || !['admin', 'developer'].includes(user.role)) return false;
    const animes = this.get(this.collections.animes);
    const idx = animes.findIndex(a => a.mal_id == animeId || a.id == animeId);
    if (idx !== -1) { animes[idx].images = { jpg: { large_image_url: imageUrl } }; this.set(this.collections.animes, animes); }
    return true;
  },

  // ---- STATS (admin) ----
  getStats() {
    return {
      users: this.getUsers().length,
      comments: this.get(this.collections.comments).length,
      favorites: this.get(this.collections.favorites).length,
      history: this.get(this.collections.history).length,
    };
  },

  // ---- INIT DEMO ACCOUNTS ----
  initDemoAccounts() {
    if (this.getUserByEmail('admin@always.com')) return;
    this.createUser('Admin Always', 'admin@always.com', '123456', 'admin');
    this.createUser('Developer', 'dev@always.com', '123456', 'developer');
    this.createUser('Anime Fan', 'user@test.com', '123456', 'user');

    // Seed some demo chat
    const adminUser = this.getUserByEmail('admin@always.com');
    const devUser = this.getUserByEmail('dev@always.com');
    if (adminUser && devUser) {
      const msgs = this.get(this.collections.chatMessages);
      if (!msgs.length) {
        msgs.push({ id: DB.genId(), userId: adminUser.id, text: '🎉 Selamat datang di Always Anime! Obrolan publik sudah aktif.', userName: adminUser.name, userAvatar: adminUser.avatar, userRole: adminUser.role, time: new Date(Date.now() - 3600000).toISOString() });
        msgs.push({ id: DB.genId(), userId: devUser.id, text: '✨ Nikmati streaming anime favorit kalian tanpa batas!', userName: devUser.name, userAvatar: devUser.avatar, userRole: devUser.role, time: new Date(Date.now() - 1800000).toISOString() });
        this.set(this.collections.chatMessages, msgs);
      }
    }
  },
};

// ==========================================
//  ANIME API - Jikan (MyAnimeList API)
// ==========================================
const AnimeAPI = {
  BASE: 'https://api.jikan.moe/v4',
  cache: {},
  
  async fetch(endpoint) {
    if (this.cache[endpoint]) return this.cache[endpoint];
    try {
      const res = await fetch(this.BASE + endpoint);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      this.cache[endpoint] = data;
      return data;
    } catch (e) {
      console.warn('API fetch failed, using fallback data', e);
      return null;
    }
  },

  async getTopAnime(page = 1, filter = 'bypopularity') {
    return await this.fetch(`/top/anime?page=${page}&filter=${filter}&limit=24`);
  },

  async getSeasonNow() {
    return await this.fetch('/seasons/now?limit=20');
  },

  async searchAnime(query) {
    return await this.fetch(`/anime?q=${encodeURIComponent(query)}&limit=10&sfw=true`);
  },

  async getAnimeById(id) {
    return await this.fetch(`/anime/${id}/full`);
  },

  async getAnimeEpisodes(id) {
    return await this.fetch(`/anime/${id}/episodes`);
  },

  async getSchedule() {
    return await this.fetch('/schedules?limit=7');
  },

  async getGenreAnime(genreId, page = 1) {
    return await this.fetch(`/anime?genres=${genreId}&page=${page}&limit=20&order_by=score&sort=desc`);
  },

  // Genre map
  genreMap: {
    'action': 1, 'adventure': 2, 'comedy': 4, 'drama': 8, 'fantasy': 10,
    'horror': 14, 'romance': 22, 'sci-fi': 24, 'sports': 30, 'isekai': 62,
    'slice-of-life': 36,
  },

  // Fallback anime data (used when API is rate limited)
  fallbackAnime: [
    { mal_id: 16498, title: 'Attack on Titan', title_english: 'Attack on Titan', episodes: 25, score: 9.0, members: 3600000, status: 'Finished Airing', year: 2013, studios: [{name:'MAPPA'}], genres: [{name:'Action'},{name:'Drama'}], synopsis: 'Manusia bertahan dalam kota bertembok dari serangan Titan raksasa.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg' } }, type: 'TV' },
    { mal_id: 5114, title: 'Fullmetal Alchemist: Brotherhood', episodes: 64, score: 9.1, members: 3200000, status: 'Finished Airing', year: 2009, studios: [{name:'Bones'}], genres: [{name:'Action'},{name:'Fantasy'}], synopsis: 'Dua saudara menggunakan alkimia untuk mencari Philosopher\'s Stone.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1223/96541l.jpg' } }, type: 'TV' },
    { mal_id: 1535, title: 'Death Note', episodes: 37, score: 8.6, members: 3500000, status: 'Finished Airing', year: 2006, studios: [{name:'Madhouse'}], genres: [{name:'Thriller'},{name:'Supernatural'}], synopsis: 'Siswa jenius menemukan buku kematian yang bisa membunuh siapapun.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg' } }, type: 'TV' },
    { mal_id: 21, title: 'One Piece', episodes: 1000, score: 8.7, members: 2500000, status: 'Currently Airing', year: 1999, studios: [{name:'Toei Animation'}], genres: [{name:'Action'},{name:'Adventure'}], synopsis: 'Monkey D. Luffy berlayar mencari harta karun One Piece.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg' } }, type: 'TV' },
    { mal_id: 11061, title: 'Hunter x Hunter (2011)', episodes: 148, score: 9.0, members: 2700000, status: 'Finished Airing', year: 2011, studios: [{name:'Madhouse'}], genres: [{name:'Action'},{name:'Adventure'}], synopsis: 'Gon mencari ayahnya yang seorang Hunter legendaris.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/4/84800l.jpg' } }, type: 'TV' },
    { mal_id: 38000, title: 'Demon Slayer', title_english: 'Demon Slayer', episodes: 26, score: 8.7, members: 2900000, status: 'Finished Airing', year: 2019, studios: [{name:'ufotable'}], genres: [{name:'Action'},{name:'Fantasy'}], synopsis: 'Tanjiro berusaha menyembuhkan adiknya yang berubah menjadi iblis.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg' } }, type: 'TV' },
    { mal_id: 40748, title: 'Jujutsu Kaisen', episodes: 24, score: 8.6, members: 2700000, status: 'Finished Airing', year: 2020, studios: [{name:'MAPPA'}], genres: [{name:'Action'},{name:'Supernatural'}], synopsis: 'Yuji Itadori menelan mata kutukan dan bergabung dengan organisasi penyihir.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg' } }, type: 'TV' },
    { mal_id: 33486, title: 'My Hero Academia', episodes: 113, score: 7.9, members: 1800000, status: 'Currently Airing', year: 2016, studios: [{name:'Bones'}], genres: [{name:'Action'},{name:'Sci-Fi'}], synopsis: 'Di dunia dengan superpower, Izuku lahir tanpa kemampuan tapi berjuang menjadi hero terhebat.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg' } }, type: 'TV' },
    { mal_id: 42897, title: 'Spy × Family', episodes: 25, score: 8.7, members: 1500000, status: 'Finished Airing', year: 2022, studios: [{name:'Wit Studio'}], genres: [{name:'Comedy'},{name:'Action'}], synopsis: 'Seorang mata-mata membentuk keluarga palsu untuk menjalankan misinya.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1441/122795l.jpg' } }, type: 'TV' },
    { mal_id: 49387, title: 'Chainsaw Man', episodes: 12, score: 8.5, members: 1700000, status: 'Finished Airing', year: 2022, studios: [{name:'MAPPA'}], genres: [{name:'Action'},{name:'Horror'}], synopsis: 'Denji bergabung dengan setan gergaji untuk bertahan hidup.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg' } }, type: 'TV' },
    { mal_id: 52991, title: 'Sousou no Frieren', title_english: 'Frieren: Beyond Journey\'s End', episodes: 28, score: 9.1, members: 1200000, status: 'Finished Airing', year: 2023, studios: [{name:'Madhouse'}], genres: [{name:'Adventure'},{name:'Fantasy'}], synopsis: 'Penyihir elf yang awet muda merenungkan perjalanannya setelah mengalahkan Raja Setan.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg' } }, type: 'TV' },
    { mal_id: 20, title: 'Naruto', episodes: 220, score: 7.9, members: 2500000, status: 'Finished Airing', year: 2002, studios: [{name:'Studio Pierrot'}], genres: [{name:'Action'},{name:'Fantasy'}], synopsis: 'Naruto Uzumaki berjuang menjadi Hokage di desanya.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/13/17405l.jpg' } }, type: 'TV' },
    { mal_id: 1, title: 'Cowboy Bebop', episodes: 26, score: 8.8, members: 1300000, status: 'Finished Airing', year: 1998, studios: [{name:'Sunrise'}], genres: [{name:'Action'},{name:'Sci-Fi'}], synopsis: 'Pemburu hadiah di luar angkasa menghadapi masa lalu mereka.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/4/19644l.jpg' } }, type: 'TV' },
    { mal_id: 30276, title: 'One Punch Man', episodes: 12, score: 8.7, members: 2100000, status: 'Finished Airing', year: 2015, studios: [{name:'Madhouse'}], genres: [{name:'Action'},{name:'Comedy'}], synopsis: 'Saitama bisa mengalahkan musuh apapun dengan satu pukulan.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/12/76049l.jpg' } }, type: 'TV' },
    { mal_id: 43608, title: 'Kimetsu no Yaiba Movie: Mugen Ressha-hen', title_english: 'Demon Slayer Movie', episodes: 1, score: 8.4, members: 1800000, status: 'Finished Airing', year: 2020, studios: [{name:'ufotable'}], genres: [{name:'Action'},{name:'Fantasy'}], synopsis: 'Tanjiro dan teman-teman melawan Enmu di Mugen Train.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1704/106947l.jpg' } }, type: 'Movie' },
    { mal_id: 37510, title: 'Sword Art Online: Alicization', episodes: 24, score: 7.3, members: 1100000, status: 'Finished Airing', year: 2018, studios: [{name:'A-1 Pictures'}], genres: [{name:'Action'},{name:'Sci-Fi'}], synopsis: 'Kirito terperangkap dalam dunia virtual bernama Underworld.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1723/93493l.jpg' } }, type: 'TV' },
    { mal_id: 34096, title: 'Tokyo Ghoul:re', episodes: 12, score: 7.1, members: 900000, status: 'Finished Airing', year: 2018, studios: [{name:'Pierrot Plus'}], genres: [{name:'Action'},{name:'Horror'}], synopsis: 'Kehidupan baru Kaneki Ken sebagai agen CCG.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/3/91224l.jpg' } }, type: 'TV' },
    { mal_id: 14719, title: 'Sword Art Online', episodes: 25, score: 7.2, members: 2200000, status: 'Finished Airing', year: 2012, studios: [{name:'A-1 Pictures'}], genres: [{name:'Action'},{name:'Sci-Fi'}], synopsis: 'Pemain game terjebak di dunia virtual yang mematikan.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/11/39717l.jpg' } }, type: 'TV' },
    { mal_id: 9253, title: 'Steins;Gate', episodes: 24, score: 9.1, members: 1600000, status: 'Finished Airing', year: 2011, studios: [{name:'White Fox'}], genres: [{name:'Sci-Fi'},{name:'Thriller'}], synopsis: 'Seorang ilmuwan eksentrik menemukan cara mengirim pesan ke masa lalu.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/5/73199l.jpg' } }, type: 'TV' },
    { mal_id: 8472, title: 'Fairy Tail', episodes: 175, score: 7.7, members: 1500000, status: 'Finished Airing', year: 2009, studios: [{name:'A-1 Pictures'}], genres: [{name:'Action'},{name:'Fantasy'}], synopsis: 'Petualangan para penyihir guild Fairy Tail yang kuat dan setia.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/5/45887l.jpg' } }, type: 'TV' },
    { mal_id: 38524, title: 'Shingeki no Kyojin Season 3', title_english: 'AoT Season 3', episodes: 22, score: 9.0, members: 1400000, status: 'Finished Airing', year: 2018, studios: [{name:'Wit Studio'}], genres: [{name:'Action'},{name:'Drama'}], synopsis: 'Survey Corps mengungkap rahasia gelap pemerintah.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1517/100633l.jpg' } }, type: 'TV' },
    { mal_id: 33352, title: 'Re:Zero kara Hajimeru Isekai Seikatsu', title_english: 'Re:Zero', episodes: 25, score: 8.3, members: 1600000, status: 'Finished Airing', year: 2016, studios: [{name:'White Fox'}], genres: [{name:'Fantasy'},{name:'Isekai'}], synopsis: 'Subaru terperangkap di dunia isekai dengan kemampuan kembali dari kematian.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/11/79410l.jpg' } }, type: 'TV' },
    { mal_id: 39535, title: 'Vinland Saga', episodes: 24, score: 8.8, members: 1100000, status: 'Finished Airing', year: 2019, studios: [{name:'Wit Studio'}], genres: [{name:'Action'},{name:'Adventure'}], synopsis: 'Thorfinn mencari balas dendam atas kematian ayahnya di era Viking.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1158/98027l.jpg' } }, type: 'TV' },
    { mal_id: 44511, title: 'Bleach: Sennen Kessen-hen', title_english: 'Bleach TYBW', episodes: 13, score: 9.1, members: 1200000, status: 'Currently Airing', year: 2022, studios: [{name:'Pierrot'}], genres: [{name:'Action'},{name:'Supernatural'}], synopsis: 'Arc Thousand-Year Blood War dari Bleach akhirnya diadaptasi.', images: { jpg: { large_image_url: 'https://cdn.myanimelist.net/images/anime/1764/126440l.jpg' } }, type: 'TV' },
  ],

  getVideoUrl(anime) {
    // Return embed URL for streaming (using publicly available anime)
    // For demo, returns a sample video
    const embeds = [
      'https://www.youtube.com/embed/MGRm4IzK1SQ',
      'https://www.youtube.com/embed/ykJKZGAokdA',
      'https://www.youtube.com/embed/7bwL_PCkFws',
      'https://www.youtube.com/embed/vmuGi7aFAKo',
    ];
    return embeds[anime.mal_id % embeds.length];
  },
};

// Initialize DB with demo accounts
DB.initDemoAccounts();
console.log('%c✅ Always Anime DB initialized', 'color: #e63946; font-weight: bold; font-size: 14px');
