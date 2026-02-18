  // --- Global Declaration for Google Apps Script ---
  export {}; // Make this file a module to avoid global scope collisions with Code.ts

  interface GoogleScriptRun {
    withSuccessHandler(handler: Function): GoogleScriptRun;
    withFailureHandler(handler: (error: Error) => void): GoogleScriptRun;
    getMovies(): void;
    searchTmdb(query: string): void;
    getTmdbDetails(tmdbId: number): void;
    addMovie(movieData: MovieDetails): void;
  }

  declare const google: {
    script: {
      run: GoogleScriptRun;
    };
  };

  declare const bootstrap: any; // global bootstrap variable

  // --- DOM Elements ---
  const getById = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

  const searchInput = getById<HTMLInputElement>('searchInput');
  const searchButton = getById<HTMLButtonElement>('searchButton');
  const searchSpinner = getById<HTMLElement>('searchSpinner');
  const searchResultsDiv = getById<HTMLElement>('searchResults');
  const searchErrorDiv = getById<HTMLElement>('searchError');
  const movieListLoadingDiv = getById<HTMLElement>('movieListLoading');
  const movieListErrorDiv = getById<HTMLElement>('movieListError');
  const movieTableBody = getById<HTMLElement>('movieTableBody');
  const addFeedbackDiv = getById<HTMLElement>('addFeedback');
  const saveMovieButton = getById<HTMLButtonElement>('saveMovieButton');
  const saveSpinner = getById<HTMLElement>('saveSpinner');
  
  // Modal instance
  const addMovieModal = new bootstrap.Modal(document.getElementById('addMovieModal'));

  // --- Interfaces ---
  // Must match Code.ts definitions exactly to avoid confusion, though scoped locally now.
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
      [key: string]: any;
  }

  interface TmdbResult {
      id: number;
      title: string;
      overview: string;
      year: string;
      poster_path?: string; // Optional
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


  // --- Event Listeners ---

  document.addEventListener('DOMContentLoaded', loadMovies);
  saveMovieButton.addEventListener('click', handleSaveMovie);
  searchButton.addEventListener('click', handleSearch);

  searchInput.addEventListener('keypress', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault(); 
      handleSearch();
    }
  });

  // Event delegation for "Add to list" buttons
  searchResultsDiv.addEventListener('click', (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest('.btn-add-movie') as HTMLButtonElement | null;
    if (button && button.dataset.tmdbId) {
       const tmdbId = parseInt(button.dataset.tmdbId, 10);
       button.disabled = true; 
       button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Ajout...`;
       handleAddMovie(tmdbId, button);
    }
  });


  // --- UI Helper Functions ---

  function showLoading(spinner: HTMLElement, button?: HTMLButtonElement | null) {
      spinner.classList.remove('d-none');
      if (button) button.disabled = true;
      clearFeedback();
      searchErrorDiv.classList.add('d-none');
  }

  function hideLoading(spinner: HTMLElement, button?: HTMLButtonElement | null) {
      spinner.classList.add('d-none');
      if (button) button.disabled = false;
  }

  function showError(message: string, element: HTMLElement) {
      element.textContent = message;
      element.classList.remove('d-none');
      console.error(message);
  }

  function showFeedback(message: string, isSuccess: boolean = true) {
      addFeedbackDiv.textContent = message;
      addFeedbackDiv.className = `alert ${isSuccess ? 'alert-success' : 'alert-danger'}`;
      addFeedbackDiv.classList.remove('d-none');
  }

  function clearFeedback() {
      addFeedbackDiv.classList.add('d-none');
      addFeedbackDiv.textContent = '';
      addFeedbackDiv.className = 'alert d-none';
  }

  // --- Logic Functions ---

  function loadMovies() {
    movieListLoadingDiv.classList.remove('d-none');
    movieListErrorDiv.classList.add('d-none');
    movieTableBody.innerHTML = ''; 
    clearFeedback();

    google.script.run
      .withSuccessHandler(displayMovies)
      .withFailureHandler((error: Error) => {
          showError("Erreur lors du chargement des films: " + error.message, movieListErrorDiv);
          movieListLoadingDiv.classList.add('d-none');
      })
      .getMovies();
  }

  function displayMovies(movies: Movie[]) {
    movieListLoadingDiv.classList.add('d-none');
    if (!movies || movies.length === 0) {
      movieTableBody.innerHTML = '<tr><td colspan="8" class="text-center fst-italic">Aucun film trouvé. Ajoutez-en un !</td></tr>';
      return;
    }

    movieTableBody.innerHTML = movies.map(movie => {
        const imageUrl = movie.I_Url || '#';
        const imageText = movie.I || 'I';
        const trailerUrl = movie.T_Url || '#';
        const trailerText = movie.T || 'T';
        const statusClass = movie.STATUS === 'Vu' ? 'success' : 'warning';

        return `
          <tr>
            <td>${movie.DATE || ''}</td>
            <td class="text-center">
                ${movie.I_Url ? `<a href="${imageUrl}" target="_blank" title="Voir l'affiche"><img src="${imageUrl}" alt="Affiche" style="max-width: 40px; height: auto;"></a>` : imageText}
             </td>
            <td class="text-center">
                ${movie.T_Url ? `<a href="${trailerUrl}" target="_blank" title="Voir sur IMDb/Trailer"><i class="fa-solid fa-clapperboard fa-lg"></i></a>` : trailerText}
             </td>
            <td>${movie['TITRE FILM'] || 'N/A'}</td>
            <td>${movie.YEAR || ''}</td>
            <td>${movie.REALISATEUR || ''}</td>
            <td>${movie.ACTEURS || ''}</td>
            <td><span class="badge bg-${statusClass}">${movie.STATUS || ''}</span></td>
          </tr>
        `;
    }).join('');
  }

  function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      showError("Veuillez entrer un terme de recherche.", searchErrorDiv);
      return;
    }

    showLoading(searchSpinner, searchButton);
    searchResultsDiv.innerHTML = '';
    searchErrorDiv.classList.add('d-none');
    clearFeedback();

    google.script.run
      .withSuccessHandler(displaySearchResults)
      .withFailureHandler((error: Error) => {
        showError("Erreur lors de la recherche TMDB: " + error.message, searchErrorDiv);
        hideLoading(searchSpinner, searchButton);
      })
      .searchTmdb(query);
  }

  function displaySearchResults(results: TmdbResult[]) {
      hideLoading(searchSpinner, searchButton);
      if (!results || results.length === 0) {
          searchResultsDiv.innerHTML = '<p class="text-center fst-italic col-12">Aucun résultat trouvé.</p>';
          return;
      }

      searchResultsDiv.innerHTML = results.map(movie => {
          // Basic sanitization
          const safeTitle = movie.title.replace(/"/g, '&quot;');
          const safeOverview = movie.overview ? movie.overview.replace(/"/g, '&quot;') : 'Pas de description.';

          return `
              <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                  <div class="card h-100 shadow-sm">
                      <img src="${movie.poster_path}" class="card-img-top" alt="Affiche de ${safeTitle}">
                      <div class="card-body d-flex flex-column">
                          <h5 class="card-title">${safeTitle} (${movie.year})</h5>
                          <p class="card-text flex-grow-1 small">${safeOverview}</p>
                          <button class="btn btn-sm btn-success btn-add-movie mt-auto" data-tmdb-id="${movie.id}">
                             <i class="fas fa-plus me-1"></i> Ajouter
                          </button>
                      </div>
                  </div>
              </div>
          `;
      }).join('');
  }

  function populateAndShowModal(details: MovieDetails) {
      const setVal = (id: string, val: string) => { 
          const el = getById<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
          if(el) el.value = val || ''; 
      };
      
      const setCheck = (id: string, checked: boolean) => {
          const el = getById<HTMLInputElement>(id);
          if(el) el.checked = checked;
      };

      const setText = (id: string, text: string) => {
          const el = getById(id);
          if(el) el.textContent = text;
      };

      // Display fields
      const posterImg = getById<HTMLImageElement>('modalPoster');
      if(posterImg) posterImg.src = details.posterUrl || 'https://via.placeholder.com/200x300.png?text=Affiche';
      
      setText('modalTitleYear', `${details.title || 'Inconnu'} (${details.year || 'N/A'})`);
      setText('modalDirector', `Réalisateur: ${details.director || 'N/A'}`);
      setText('modalActors', `Acteurs: ${details.actors || 'N/A'}`);
      setText('modalGenres', `Genres: ${details.genres || 'N/A'}`);
      setText('modalDuration', `Durée: ${details.duration || 'N/A'}`);
      setVal('modalPlot', details.plot || '');

      // Input fields
      setVal('modalDate', details.dateAdded || new Date().toLocaleDateString('en-US'));
      setVal('modalStatus', details.status || 'Vu');
      setCheck('modalSuiteCheck', String(details.suite).toUpperCase() === 'TRUE');
      setVal('modalNote', details.note || '');
      setVal('modalRemarques', details.remarques || '');

      // Hidden fields
      setVal('modalTitle', details.title || '');
      setVal('modalYear', details.year || '');
      setVal('modalDirectorHidden', details.director || '');
      setVal('modalActorsHidden', details.actors || '');
      setVal('modalGenresHidden', details.genres || '');
      setVal('modalDurationHidden', details.duration || '');
      setVal('modalPlotHidden', details.plot || '');
      setVal('modalImdbLink', details.imdbLink || '');
      setVal('modalTrailerLink', details.trailerLink || '');
      setVal('modalPosterUrl', details.posterUrl || '');
      setVal('modalImdbScore', details.imdbScore || '');
      setVal('modalRtScore', details.rtScore || '');

      addMovieModal.show();
  }


  function handleSaveMovie() {
    showLoading(saveSpinner, saveMovieButton); 
    clearFeedback();

    const getVal = (id: string) => getById<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id).value;
    const getCheck = (id: string) => getById<HTMLInputElement>(id).checked;

    const movieData: MovieDetails = {
        dateAdded: getVal('modalDate'),
        status: getVal('modalStatus'),
        suite: getCheck('modalSuiteCheck') ? 'TRUE' : 'FALSE',
        note: getVal('modalNote'),
        remarques: getVal('modalRemarques'),
        title: getVal('modalTitle'),
        year: getVal('modalYear'),
        director: getVal('modalDirectorHidden'),
        actors: getVal('modalActorsHidden'),
        genres: getVal('modalGenresHidden'),
        duration: getVal('modalDurationHidden'),
        plot: getVal('modalPlotHidden'), 
        imdbLink: getVal('modalImdbLink'),
        trailerLink: getVal('modalTrailerLink'),
        posterUrl: getVal('modalPosterUrl'),
        imdbScore: getVal('modalImdbScore'), 
        rtScore: getVal('modalRtScore')      
    };

    google.script.run
        .withSuccessHandler((response: string) => {
            hideLoading(saveSpinner, saveMovieButton);
            addMovieModal.hide(); 
            showFeedback(response, true); 
            loadMovies(); 
        })
        .withFailureHandler((error: Error) => {
            hideLoading(saveSpinner, saveMovieButton);
            showFeedback("Erreur lors de l'enregistrement: " + error.message, false);
        })
        .addMovie(movieData); 
  }

  function handleAddMovie(tmdbId: number, buttonElement: HTMLButtonElement) {
    clearFeedback();
    
    google.script.run
        .withSuccessHandler((movieDetails: MovieDetails) => {
            populateAndShowModal(movieDetails); 
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-plus me-1"></i> Ajouter';
        })
        .withFailureHandler((detailsError: Error) => {
            showFeedback("Erreur lors de la récupération des détails: " + detailsError.message, false);
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-plus me-1"></i> Ajouter';
        })
        .getTmdbDetails(tmdbId); 
  }
