  // --- Module Declaration ---
  export {};

  interface GoogleScriptRun {
    withSuccessHandler(handler: Function): GoogleScriptRun;
    withFailureHandler(handler: (error: Error) => void): GoogleScriptRun;
    getMovies(): void;
    searchTmdb(query: string): void;
    getTmdbDetails(tmdbId: number): void;
    addMovie(movieData: MovieDetails): void;
  }

  declare const google: {
    script: { run: GoogleScriptRun; };
  };

  declare const bootstrap: any;

  // --- Interfaces ---
  interface Movie {
      I_Url?: string;
      I?: string;
      T_Url?: string;
      T?: string;
      DATE?: string;
      'TITRE FILM'?: string;
      YEAR?: string;
      REALISATEUR?: string;
      ACTEURS?: string;
      STATUS?: string;
      IMDB?: string;
      RT?: string;
      NOTE?: string;
      GENRES?: string;
      PLOT?: string;
      [key: string]: any;
  }

  interface TmdbResult {
      id: number;
      title: string;
      overview: string;
      year: string;
      poster_path?: string;
  }

  interface MovieDetails {
      posterUrl?: string;
      title?: string;
      year?: string;
      director?: string;
      actors?: string;
      genres?: string;
      duration?: string;
      plot?: string;
      dateAdded?: string;
      status?: string;
      suite?: string | boolean;
      note?: string;
      remarques?: string;
      imdbLink?: string;
      trailerLink?: string;
      imdbScore?: string;
      rtScore?: string;
  }

  // --- DOM ---
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

  const searchInput = $<HTMLInputElement>('searchInput');
  const searchButton = $<HTMLButtonElement>('searchButton');
  const searchSpinner = $('searchSpinner');
  const searchIcon = $('searchIcon');
  const searchResultsDiv = $('searchResults');
  const searchErrorDiv = $('searchError');
  const movieListLoadingDiv = $('movieListLoading');
  const movieListErrorDiv = $('movieListError');
  const movieGrid = $('movieGrid');
  const movieCountEl = $('movieCount');
  const addFeedbackDiv = $('addFeedback');
  const saveMovieButton = $<HTMLButtonElement>('saveMovieButton');
  const saveSpinner = $('saveSpinner');
  const addMovieModal = new bootstrap.Modal(document.getElementById('addMovieModal'));

  // --- Events ---
  document.addEventListener('DOMContentLoaded', loadMovies);
  saveMovieButton.addEventListener('click', handleSaveMovie);
  searchButton.addEventListener('click', handleSearch);

  searchInput.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
  });

  searchResultsDiv.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('.btn-add-movie') as HTMLButtonElement | null;
    if (btn?.dataset.tmdbId) {
      const tmdbId = parseInt(btn.dataset.tmdbId, 10);
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner spinner-sm"></span>';
      handleAddMovie(tmdbId, btn);
    }
  });

  // --- Helpers ---
  function showLoading(spinner: HTMLElement, button?: HTMLButtonElement | null) {
    spinner.classList.remove('d-none');
    if (button) button.disabled = true;
    if (spinner === searchSpinner) searchIcon.classList.add('d-none');
    clearFeedback();
    searchErrorDiv.classList.add('d-none');
  }

  function hideLoading(spinner: HTMLElement, button?: HTMLButtonElement | null) {
    spinner.classList.add('d-none');
    if (button) button.disabled = false;
    if (spinner === searchSpinner) searchIcon.classList.remove('d-none');
  }

  function showError(msg: string, el: HTMLElement) {
    el.textContent = msg;
    el.classList.remove('d-none');
  }

  function showFeedback(msg: string, ok: boolean = true) {
    addFeedbackDiv.textContent = msg;
    addFeedbackDiv.className = `alert ${ok ? 'alert-success' : 'alert-danger'}`;
    addFeedbackDiv.classList.remove('d-none');
    if (ok) setTimeout(() => clearFeedback(), 4000);
  }

  function clearFeedback() {
    addFeedbackDiv.classList.add('d-none');
    addFeedbackDiv.textContent = '';
    addFeedbackDiv.className = 'alert d-none';
  }

  function escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Status badge helper ---
  function statusBadge(status?: string): string {
    if (!status) return '';
    const s = status.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (s === 'vu') return '<span class="badge badge-status badge-vu">Vu</span>';
    if (['a voir', 'à voir'].includes(status.trim())) return '<span class="badge badge-status badge-a-voir">À voir</span>';
    if (s === 'abandonne') return '<span class="badge badge-status badge-abandonne">Abandonné</span>';
    return `<span class="badge badge-status badge-abandonne">${escHtml(status)}</span>`;
  }

  // --- Score pills ---
  function scorePills(movie: Movie): string {
    let html = '';
    if (movie.IMDB && String(movie.IMDB).trim() && String(movie.IMDB) !== 'N/A')
      html += `<span class="badge badge-imdb">IMDb ${escHtml(String(movie.IMDB))}</span>`;
    if (movie.RT && String(movie.RT).trim() && String(movie.RT) !== 'N/A')
      html += `<span class="badge badge-rt">RT ${escHtml(String(movie.RT))}%</span>`;
    if (movie.NOTE && String(movie.NOTE).trim())
      html += `<span class="badge badge-note">${escHtml(String(movie.NOTE))}/20</span>`;
    return html;
  }

  // --- Core Functions ---

  function loadMovies() {
    movieListLoadingDiv.classList.remove('d-none');
    movieListErrorDiv.classList.add('d-none');
    movieGrid.innerHTML = '';
    movieCountEl.textContent = '';
    clearFeedback();

    google.script.run
      .withSuccessHandler(displayMovies)
      .withFailureHandler((err: Error) => {
        showError("Erreur de chargement: " + err.message, movieListErrorDiv);
        movieListLoadingDiv.classList.add('d-none');
      })
      .getMovies();
  }

  function displayMovies(movies: Movie[]) {
    movieListLoadingDiv.classList.add('d-none');

    if (!movies || movies.length === 0) {
      movieGrid.innerHTML = '<div class="empty-state"><p>Aucun film dans la liste.<br>Recherchez un film ci-dessus pour commencer !</p></div>';
      movieCountEl.textContent = '0 films';
      return;
    }

    movieCountEl.textContent = `${movies.length} film${movies.length > 1 ? 's' : ''}`;

    movieGrid.innerHTML = movies.map(movie => {
      const posterUrl = movie.I_Url || '';
      const posterImg = posterUrl
        ? `<img src="${posterUrl}" alt="" class="movie-poster" loading="lazy">`
        : '<div class="movie-poster" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎬</div>';

      const title = escHtml(movie['TITRE FILM'] || 'Sans titre');
      const year = movie.YEAR ? escHtml(String(movie.YEAR)) : '';
      const director = movie.REALISATEUR ? escHtml(String(movie.REALISATEUR)) : '';

      const actions: string[] = [];
      if (movie.T_Url) actions.push(`<a href="${movie.T_Url}" target="_blank" title="Trailer / IMDb"><i class="fa-solid fa-clapperboard"></i></a>`);
      if (movie.I_Url) actions.push(`<a href="${movie.I_Url}" target="_blank" title="Affiche"><i class="fa-solid fa-image"></i></a>`);

      return `
        <div class="movie-card">
          ${posterImg}
          <div class="movie-info">
            <div class="movie-title-row">
              <span class="movie-title">${title}</span>
              <span class="movie-year">${year}</span>
            </div>
            ${director ? `<div class="movie-meta">${director}</div>` : ''}
            <div class="movie-tags">
              ${statusBadge(movie.STATUS)}
              ${scorePills(movie)}
            </div>
          </div>
          ${actions.length ? `<div class="movie-actions">${actions.join('')}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) { showError("Veuillez entrer un terme de recherche.", searchErrorDiv); return; }

    showLoading(searchSpinner, searchButton);
    searchResultsDiv.innerHTML = '';
    searchErrorDiv.classList.add('d-none');
    clearFeedback();

    google.script.run
      .withSuccessHandler(displaySearchResults)
      .withFailureHandler((err: Error) => {
        showError("Erreur TMDB: " + err.message, searchErrorDiv);
        hideLoading(searchSpinner, searchButton);
      })
      .searchTmdb(query);
  }

  function displaySearchResults(results: TmdbResult[]) {
    hideLoading(searchSpinner, searchButton);
    if (!results || results.length === 0) {
      searchResultsDiv.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Aucun résultat.</p>';
      return;
    }

    searchResultsDiv.innerHTML = results.map(movie => {
      const safeTitle = escHtml(movie.title);
      const safeOverview = movie.overview ? escHtml(movie.overview) : 'Pas de description.';
      const poster = movie.poster_path || 'https://via.placeholder.com/200x300.png?text=No+Image';

      return `
        <div class="search-card">
          <img src="${poster}" alt="${safeTitle}" loading="lazy">
          <div class="search-card-body">
            <h5>${safeTitle} (${movie.year})</h5>
            <p>${safeOverview}</p>
            <button class="btn btn-success btn-sm btn-add-movie" data-tmdb-id="${movie.id}">
              <i class="fas fa-plus"></i> Ajouter
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Modal ---
  function populateAndShowModal(d: MovieDetails) {
    const setVal = (id: string, val: string) => { const el = $<HTMLInputElement>(id); if (el) el.value = val || ''; };
    const setCheck = (id: string, v: boolean) => { const el = $<HTMLInputElement>(id); if (el) el.checked = v; };
    const setText = (id: string, t: string) => { const el = $(id); if (el) el.textContent = t; };

    const poster = $<HTMLImageElement>('modalPoster');
    if (poster) poster.src = d.posterUrl || 'https://via.placeholder.com/200x300.png?text=Affiche';

    setText('modalTitleYear', `${d.title || 'Inconnu'} (${d.year || 'N/A'})`);
    setText('modalDirector', d.director || 'N/A');
    setText('modalActors', d.actors || 'N/A');
    setText('modalGenres', d.genres || 'N/A');
    setText('modalDuration', d.duration || 'N/A');
    setText('modalPlotDisplay', d.plot || '');
    setVal('modalPlot', d.plot || '');

    setVal('modalDate', d.dateAdded || new Date().toLocaleDateString('en-US'));
    setVal('modalStatus', d.status || 'Vu');
    setCheck('modalSuiteCheck', String(d.suite).toUpperCase() === 'TRUE');
    setVal('modalNote', d.note || '');
    setVal('modalRemarques', d.remarques || '');

    setVal('modalTitle', d.title || '');
    setVal('modalYear', d.year || '');
    setVal('modalDirectorHidden', d.director || '');
    setVal('modalActorsHidden', d.actors || '');
    setVal('modalGenresHidden', d.genres || '');
    setVal('modalDurationHidden', d.duration || '');
    setVal('modalPlotHidden', d.plot || '');
    setVal('modalImdbLink', d.imdbLink || '');
    setVal('modalTrailerLink', d.trailerLink || '');
    setVal('modalPosterUrl', d.posterUrl || '');
    setVal('modalImdbScore', d.imdbScore || '');
    setVal('modalRtScore', d.rtScore || '');

    addMovieModal.show();
  }

  function handleSaveMovie() {
    showLoading(saveSpinner, saveMovieButton);
    clearFeedback();

    const v = (id: string) => $<HTMLInputElement>(id).value;
    const c = (id: string) => $<HTMLInputElement>(id).checked;

    const movieData: MovieDetails = {
      dateAdded: v('modalDate'), status: v('modalStatus'),
      suite: c('modalSuiteCheck') ? 'TRUE' : 'FALSE',
      note: v('modalNote'), remarques: v('modalRemarques'),
      title: v('modalTitle'), year: v('modalYear'),
      director: v('modalDirectorHidden'), actors: v('modalActorsHidden'),
      genres: v('modalGenresHidden'), duration: v('modalDurationHidden'),
      plot: v('modalPlotHidden'),
      imdbLink: v('modalImdbLink'), trailerLink: v('modalTrailerLink'),
      posterUrl: v('modalPosterUrl'),
      imdbScore: v('modalImdbScore'), rtScore: v('modalRtScore'),
    };

    google.script.run
      .withSuccessHandler((resp: string) => {
        hideLoading(saveSpinner, saveMovieButton);
        addMovieModal.hide();
        showFeedback(resp, true);
        loadMovies();
      })
      .withFailureHandler((err: Error) => {
        hideLoading(saveSpinner, saveMovieButton);
        showFeedback("Erreur: " + err.message, false);
      })
      .addMovie(movieData);
  }

  function handleAddMovie(tmdbId: number, btn: HTMLButtonElement) {
    clearFeedback();
    google.script.run
      .withSuccessHandler((details: MovieDetails) => {
        populateAndShowModal(details);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Ajouter';
      })
      .withFailureHandler((err: Error) => {
        showFeedback("Erreur: " + err.message, false);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Ajouter';
      })
      .getTmdbDetails(tmdbId);
  }
