  // --- Global variables ---
  declare const google: any;

  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
  const searchSpinner = document.getElementById('searchSpinner') as HTMLElement;
  const searchResultsDiv = document.getElementById('searchResults') as HTMLElement;
  const searchErrorDiv = document.getElementById('searchError') as HTMLElement;
  const movieListLoadingDiv = document.getElementById('movieListLoading') as HTMLElement;
  const movieListErrorDiv = document.getElementById('movieListError') as HTMLElement;
  const movieTableBody = document.getElementById('movieTableBody') as HTMLElement;
  const addFeedbackDiv = document.getElementById('addFeedback') as HTMLElement;
  // @ts-ignore - bootstrap globally available via CDN
  const addMovieModal = new bootstrap.Modal(document.getElementById('addMovieModal')); // Initialize modal instance
  const addMovieForm = document.getElementById('addMovieForm') as HTMLFormElement;
  const saveMovieButton = document.getElementById('saveMovieButton') as HTMLButtonElement;
  const saveSpinner = document.getElementById('saveSpinner') as HTMLElement;

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
      [key: string]: any;
  }

  interface TmdbResult {
      id: number;
      title: string;
      overview: string;
      year: string;
      poster_path: string;
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

  // Load movies when the page loads
  document.addEventListener('DOMContentLoaded', loadMovies);
  
  // Modal Save button click
  saveMovieButton.addEventListener('click', handleSaveMovie);

  // Search button click
  searchButton.addEventListener('click', handleSearch);

  // Search input Enter key press
  searchInput.addEventListener('keypress', function(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission if it were in a form
      handleSearch();
    }
  });

  // Add movie button click (using event delegation)
  searchResultsDiv.addEventListener('click', function(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Check if clicked element is button or inside button
    const button = target.closest('.btn-add-movie') as HTMLButtonElement | null;
    if (button) {
      const tmdbIdStr = button.dataset.tmdbId;
      if (tmdbIdStr) {
          const tmdbId = parseInt(tmdbIdStr, 10);
            button.disabled = true; // Prevent double clicks
            button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Ajout...`;
            handleAddMovie(tmdbId, button);
      }
    }
  });


  // --- Functions ---

  /**
   * Shows a loading indicator.
   * @param {HTMLElement} spinnerElement - The spinner element to show.
   * @param {HTMLElement} buttonElement - Optional button to disable.
   */
  function showLoading(spinnerElement: HTMLElement, buttonElement: HTMLButtonElement | null = null) {
      spinnerElement.classList.remove('d-none');
      if (buttonElement) buttonElement.disabled = true;
      clearFeedback(); // Clear previous feedback messages
      searchErrorDiv.classList.add('d-none'); // Hide search errors
  }

  /**
   * Hides a loading indicator.
   * @param {HTMLElement} spinnerElement - The spinner element to hide.
   * @param {HTMLElement} buttonElement - Optional button to re-enable.
   */
  function hideLoading(spinnerElement: HTMLElement, buttonElement: HTMLButtonElement | null = null) {
      spinnerElement.classList.add('d-none');
      if (buttonElement) buttonElement.disabled = false;
  }

  /**
   * Displays an error message.
   * @param {string} message - The error message to display.
   * @param {HTMLElement} errorElement - The element where the error should be shown.
   */
  function showError(message: string, errorElement: HTMLElement) {
      errorElement.textContent = message;
      errorElement.classList.remove('d-none');
      console.error(message); // Also log to console
  }

  /** Displays feedback message (success or error) after adding movie */
  function showFeedback(message: string, isSuccess: boolean = true) {
      addFeedbackDiv.textContent = message;
      addFeedbackDiv.className = `alert ${isSuccess ? 'alert-success' : 'alert-danger'}`; // Reset classes and set new ones
      addFeedbackDiv.classList.remove('d-none');
  }

  /** Clears the feedback message area */
  function clearFeedback() {
      addFeedbackDiv.classList.add('d-none');
      addFeedbackDiv.textContent = '';
      addFeedbackDiv.className = 'alert d-none'; // Reset classes
  }


  /** Fetch and display movies from the Google Sheet */
  function loadMovies() {
    movieListLoadingDiv.classList.remove('d-none');
    movieListErrorDiv.classList.add('d-none');
    movieTableBody.innerHTML = ''; // Clear existing table
    clearFeedback();

    google.script.run
      .withSuccessHandler(displayMovies)
      .withFailureHandler((error: Error) => {
          showError("Erreur lors du chargement des films depuis Google Sheets: " + error.message, movieListErrorDiv);
          movieListLoadingDiv.classList.add('d-none');
      })
      .getMovies();
  }

  /**
   * Callback function to display movies in the table.
   * @param {Array<Object>} movies - Array of movie objects from the server.
   */
  function displayMovies(movies: Movie[]) {
    movieListLoadingDiv.classList.add('d-none');
    if (!movies || movies.length === 0) {
      movieTableBody.innerHTML = '<tr><td colspan="8" class="text-center fst-italic">Aucun film trouvé dans la liste. Ajoutez-en un !</td></tr>';
      return;
    }

    let tableHtml = '';
    movies.forEach(movie => {
        // Use the parsed URL if available, otherwise the raw text
        const imageUrl = movie.I_Url || '#';
        const imageText = movie.I || 'I'; // Default text 'I'
        const trailerUrl = movie.T_Url || '#'; // Use IMDb link from T_Url
        const trailerText = movie.T || 'T'; // Default text 'T'

        tableHtml += `
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
            <td><span class="badge bg-${movie.STATUS === 'Vu' ? 'success' : 'warning'}">${movie.STATUS || ''}</span></td>
            <!-- Add more columns here if needed -->
          </tr>
        `;
    });
    movieTableBody.innerHTML = tableHtml;
  }

  /** Handles the movie search process */
  function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      showError("Veuillez entrer un terme de recherche.", searchErrorDiv);
      return;
    }

    showLoading(searchSpinner, searchButton);
    searchResultsDiv.innerHTML = ''; // Clear previous results
    searchErrorDiv.classList.add('d-none'); // Hide previous errors
    clearFeedback();

    google.script.run
      .withSuccessHandler(displaySearchResults)
      .withFailureHandler((error: Error) => {
        showError("Erreur lors de la recherche TMDB: " + error.message, searchErrorDiv);
        hideLoading(searchSpinner, searchButton);
      })
      .searchTmdb(query);
  }

  /**
   * Displays search results from TMDB.
   * @param {Array<Object>} results - Array of movie result objects.
   */
  function displaySearchResults(results: TmdbResult[]) {
      hideLoading(searchSpinner, searchButton);
      if (!results || results.length === 0) {
          searchResultsDiv.innerHTML = '<p class="text-center fst-italic col-12">Aucun résultat trouvé.</p>';
          return;
      }

      let resultsHtml = '';
      results.forEach(movie => {
          // Basic sanitization (replace quotes to prevent HTML injection if used directly, though template literals are generally safe)
          const safeTitle = movie.title.replace(/"/g, '"');
          const safeOverview = movie.overview ? movie.overview.replace(/"/g, '"') : 'Pas de description disponible.';

          resultsHtml += `
              <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                  <div class="card h-100 shadow-sm">
                      <img src="${movie.poster_path}" class="card-img-top" alt="Affiche de ${safeTitle}">
                      <div class="card-body d-flex flex-column">
                          <h5 class="card-title">${safeTitle} (${movie.year})</h5>
                          <p class="card-text flex-grow-1">${safeOverview}</p>
                          <button class="btn btn-sm btn-success btn-add-movie mt-auto" data-tmdb-id="${movie.id}">
                             <i class="fas fa-plus me-1"></i> Ajouter à ma liste
                          </button>
                      </div>
                  </div>
              </div>
          `;
      });
      searchResultsDiv.innerHTML = resultsHtml;
  }

  function populateAndShowModal(movieDetails: MovieDetails) {
      // --- Populate Display Fields (mostly read-only in modal) ---
      (document.getElementById('modalPoster') as HTMLImageElement).src = movieDetails.posterUrl || 'https://via.placeholder.com/200x300.png?text=Affiche';
      document.getElementById('modalTitleYear')!.textContent = `${movieDetails.title || 'Inconnu'} (${movieDetails.year || 'N/A'})`;
      document.getElementById('modalDirector')!.textContent = `Réalisateur: ${movieDetails.director || 'N/A'}`;
      document.getElementById('modalActors')!.textContent = `Acteurs: ${movieDetails.actors || 'N/A'}`;
      document.getElementById('modalGenres')!.textContent = `Genres: ${movieDetails.genres || 'N/A'}`;
      document.getElementById('modalDuration')!.textContent = `Durée: ${movieDetails.duration || 'N/A'}`;
      (document.getElementById('modalPlot') as HTMLTextAreaElement).value = movieDetails.plot || ''; // Textarea

      // --- Populate Editable Fields with Defaults/Fetched Data ---
      (document.getElementById('modalDate') as HTMLInputElement).value = movieDetails.dateAdded || new Date().toLocaleDateString('en-US'); // Default to today
      (document.getElementById('modalStatus') as HTMLSelectElement).value = movieDetails.status || 'Vu'; // Default status
      (document.getElementById('modalSuiteCheck') as HTMLInputElement).checked = (String(movieDetails.suite).toUpperCase() === 'TRUE');
      (document.getElementById('modalNote') as HTMLInputElement).value = movieDetails.note || ''; // Default empty
      (document.getElementById('modalRemarques') as HTMLTextAreaElement).value = movieDetails.remarques || ''; // Default empty

      // --- Populate Hidden Fields (to pass data not directly edited in modal) ---
      (document.getElementById('modalImdbLink') as HTMLInputElement).value = movieDetails.imdbLink || '';
      (document.getElementById('modalTrailerLink') as HTMLInputElement).value = movieDetails.trailerLink || '';
      (document.getElementById('modalPosterUrl') as HTMLInputElement).value = movieDetails.posterUrl || '';
      (document.getElementById('modalImdbScore') as HTMLInputElement).value = movieDetails.imdbScore || '';
      (document.getElementById('modalRtScore') as HTMLInputElement).value = movieDetails.rtScore || '';
      // Store core data again in hidden fields to reconstruct the object on save
      (document.getElementById('modalTitle') as HTMLInputElement).value = movieDetails.title || '';
      (document.getElementById('modalYear') as HTMLInputElement).value = movieDetails.year || '';
      (document.getElementById('modalDirectorHidden') as HTMLInputElement).value = movieDetails.director || '';
      (document.getElementById('modalActorsHidden') as HTMLInputElement).value = movieDetails.actors || '';
      (document.getElementById('modalGenresHidden') as HTMLInputElement).value = movieDetails.genres || '';
      (document.getElementById('modalDurationHidden') as HTMLInputElement).value = movieDetails.duration || '';
      (document.getElementById('modalPlotHidden') as HTMLInputElement).value = movieDetails.plot || '';
      (document.getElementById('modalImdbScore') as HTMLInputElement).value = movieDetails.imdbScore || '';
      (document.getElementById('modalRtScore') as HTMLInputElement).value = movieDetails.rtScore || '';


      // --- Show the Modal ---
      addMovieModal.show();
  }


  function handleSaveMovie() {
    showLoading(saveSpinner, saveMovieButton); // Show spinner on save button
    clearFeedback();

    // Construct the movieData object FROM THE MODAL fields
    const movieData: MovieDetails = {
        // Editable fields
        dateAdded: (document.getElementById('modalDate') as HTMLInputElement).value,
        status: (document.getElementById('modalStatus') as HTMLSelectElement).value,
        suite: (document.getElementById('modalSuiteCheck') as HTMLInputElement).checked ? 'TRUE' : 'FALSE',
        note: (document.getElementById('modalNote') as HTMLInputElement).value,
        remarques: (document.getElementById('modalRemarques') as HTMLTextAreaElement).value,

        // Fields read from hidden inputs (originally from TMDB)
        title: (document.getElementById('modalTitle') as HTMLInputElement).value,
        year: (document.getElementById('modalYear') as HTMLInputElement).value,
        director: (document.getElementById('modalDirectorHidden') as HTMLInputElement).value,
        actors: (document.getElementById('modalActorsHidden') as HTMLInputElement).value,
        genres: (document.getElementById('modalGenresHidden') as HTMLInputElement).value,
        duration: (document.getElementById('modalDurationHidden') as HTMLInputElement).value,
        plot: (document.getElementById('modalPlotHidden') as HTMLInputElement).value, 
        imdbLink: (document.getElementById('modalImdbLink') as HTMLInputElement).value,
        trailerLink: (document.getElementById('modalTrailerLink') as HTMLInputElement).value,
        posterUrl: (document.getElementById('modalPosterUrl') as HTMLInputElement).value,
        imdbScore: (document.getElementById('modalImdbScore') as HTMLInputElement).value, 
        rtScore: (document.getElementById('modalRtScore') as HTMLInputElement).value      
    };

    google.script.run
        .withSuccessHandler((response: string) => {
            hideLoading(saveSpinner, saveMovieButton);
            addMovieModal.hide(); // Hide the modal on success
            showFeedback(response, true); // Show success message from addMovie
            loadMovies(); // Refresh the main movie list
        })
        .withFailureHandler((error: Error) => {
            hideLoading(saveSpinner, saveMovieButton);
            // Display error *inside* the modal or using the main feedback area
            showFeedback("Erreur lors de l'enregistrement: " + error.message, false);
            // Don't hide the modal on error, so the user can retry or cancel
        })
        .addMovie(movieData); // Call addMovie with the data gathered from the modal
  }

  function handleAddMovie(tmdbId: number, buttonElement: HTMLButtonElement) {
    clearFeedback();
    buttonElement.disabled = true; // Disable button while fetching
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Chargement...`;

    google.script.run
        .withSuccessHandler((movieDetails: MovieDetails) => {
            populateAndShowModal(movieDetails); // New function call
            // Reset button state after modal is ready to show
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-plus me-1"></i> Ajouter à ma liste';
        })
        .withFailureHandler((detailsError: Error) => {
            showFeedback("Erreur lors de la récupération des détails du film: " + detailsError.message, false);
            // Re-enable button on failure
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-plus me-1"></i> Ajouter à ma liste';
        })
        .getTmdbDetails(tmdbId); // Fetch details when button clicked
  }
