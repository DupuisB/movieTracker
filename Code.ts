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
  [key: string]: any; // Kept for flexibility with sheet columns
}

interface TmdbResult {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path?: string; // Changed from null to optional string
}

interface TmdbDetailResponse {
  title?: string;
  overview?: string;
  runtime?: number;
  genres?: { name: string }[];
  release_date?: string;
  poster_path?: string;
  imdb_id?: string;
  credits?: {
    crew: { job: string; name: string }[];
    cast: { name: string }[];
  };
  videos?: {
    results: { site: string; type: string; iso_639_1: string; key: string }[];
  };
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

// --- Main Functions ---

/**
 * @OnlyCurrentDoc
 * Serve the HTML interface for the Movie Tracker web app.
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  Logger.log("doGet function completed successfully. Preparing to return HTML.");
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Movie Tracker Deluxe')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}


/**
 * Retrieves the TMDB API key securely from Script Properties.
 * @return {string} The TMDB API key.
 * @throws {Error} If the API key is not set in Script Properties.
 */
function getTmdbApiKey(): string {
  const apiKey = PropertiesService.getScriptProperties().getProperty('TMDB_API_KEY');
  if (!apiKey) {
    throw new Error("Clé API TMDB non configurée. Veuillez la définir dans 'Fichier > Propriétés du projet > Propriétés du script'.");
  }
  return apiKey;
}

/**
 * Retrieves the OMDb API key securely from Script Properties.
 */
function getOmdbApiKey(): string | null {
  const apiKey = PropertiesService.getScriptProperties().getProperty('OMDB_API_KEY');
  if (!apiKey) {
    Logger.log("Clé API OMDb non configurée."); 
  }
  return apiKey; 
}

/**
 * Fetches movie data from the Google Sheet.
 * @return {Array<Object>} An array of movie objects.
 */
function getMovies(): Movie[] {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Reading Log");
    if (!sheet) {
      throw new Error("La feuille 'Reading Log' est introuvable !");
    }
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0]; 
    
    const movies = values.slice(1).map(row => {
      let obj: Movie = {};
      headers.forEach((header: string, index: number) => {
        const cellValue = row[index];
        // Attempt to extract URL and text from HYPERLINK formulas
        if (typeof cellValue === 'string' && cellValue.toUpperCase().startsWith('=HYPERLINK("')) {
          try {
             // Regex to match =HYPERLINK("url", "text")
             const match = cellValue.match(/=HYPERLINK\("([^"]+)"\s*,\s*"([^"]+)"\)/i);
             if (match && match.length === 3) {
                 obj[header + '_Url'] = match[1]; // Store URL separately
                 obj[header] = match[2]; // Store display text
             } else {
                 obj[header] = cellValue; // Fallback if parsing fails
             }
          } catch(e) {
             obj[header] = cellValue; // Fallback on error
          }
        } else if (cellValue instanceof Date) {
           obj[header] = cellValue.toLocaleDateString('en-US'); 
        }
        else {
           obj[header] = cellValue;
        }
      });
      // Ensure essential fields have defaults if empty
      obj['TITRE FILM'] = obj['TITRE FILM'] || 'Titre inconnu';
      return obj;
    }).filter(movie => movie['TITRE FILM'] !== 'Titre inconnu');

    // Sort by date descending
     movies.sort((a, b) => {
       const dateA = a.DATE ? new Date(a.DATE.split('/').reverse().join('-')) : new Date(0); 
       const dateB = b.DATE ? new Date(b.DATE.split('/').reverse().join('-')) : new Date(0);
       
       if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
         return 0; 
       }
       return dateB.getTime() - dateA.getTime(); 
     });

    return movies;
  } catch (error: any) {
    Logger.log("Error in getMovies: " + error);
    throw new Error("Impossible de récupérer les films depuis la feuille: " + error.message);
  }
}


/**
 * Searches for movies on TMDB.
 * @param {string} query The search term.
 * @return {Array<Object>} A list of movie results with basic info.
 */
function searchTmdb(query: string): any[] {
  if (!query || query.trim().length < 2) {
    return []; 
  }
  try {
    const apiKey = getTmdbApiKey();
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200 || !json.results) {
       Logger.log("TMDB Search Error: " + response.getContentText());
       throw new Error("Erreur de l'API TMDB lors de la recherche.");
    }

    return json.results.map((movie: TmdbResult) => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
      poster_path: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : 'https://via.placeholder.com/100x150.png?text=No+Image',
      overview: movie.overview
    }));
  } catch (error: any) {
    Logger.log("Error in searchTmdb: " + error);
    throw new Error("Erreur lors de la recherche TMDB: " + error.message);
  }
}

/**
 * Fetches detailed movie information from TMDB by ID.
 * @param {number} tmdbId The TMDB movie ID.
 * @return {Object} Detailed movie information.
 */
function getTmdbDetails(tmdbId: number): MovieDetails {
  let tmdbData: TmdbDetailResponse = {}; 
  let omdbData: any = {}; 

  // --- Step 1: Fetch from TMDB ---
  try {
    const apiKey = getTmdbApiKey();
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=en-US&append_to_response=credits,videos`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json = JSON.parse(response.getContentText());

    if (response.getResponseCode() !== 200) {
      Logger.log("TMDB Details Error: " + response.getContentText());
      throw new Error("TMDB API error fetching details.");
    }
    tmdbData = json; 

  } catch (error: any) {
    Logger.log("Error fetching TMDB details: " + error);
    throw new Error("Error fetching TMDB details: " + error.message);
  }

  // --- Extract essential data from TMDB ---
  const title = tmdbData.title || 'Unknown Title';
  const plot = tmdbData.overview || '';
  const durationMinutes = tmdbData.runtime || 0;
  const duration = durationMinutes > 0 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min` : '';
  const genres = tmdbData.genres ? tmdbData.genres.map((g) => g.name).join(', ') : '';
  const year = tmdbData.release_date ? tmdbData.release_date.substring(0, 4) : '';
  const posterPath = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null;
  const imdbId = tmdbData.imdb_id || null; 

  let director = '';
  if (tmdbData.credits && tmdbData.credits.crew) {
    const directorObj = tmdbData.credits.crew.find((person) => person.job === 'Director');
    if (directorObj) director = directorObj.name;
  }

  let actors = '';
  if (tmdbData.credits && tmdbData.credits.cast) {
    actors = tmdbData.credits.cast.slice(0, 3).map((actor) => actor.name).join(', ');
  }

  // Find YouTube Trailer Link from TMDB videos
  let trailerLink = null;
  if (tmdbData.videos && tmdbData.videos.results && tmdbData.videos.results.length > 0) {
    // Prefer English trailer
    const youtubeTrailer = tmdbData.videos.results.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.iso_639_1 === 'en')
                        || tmdbData.videos.results.find((v) => v.site === 'YouTube' && v.type === 'Trailer');
    
    if (youtubeTrailer) {
      trailerLink = `https://www.youtube.com/watch?v=${youtubeTrailer.key}`;
    }
  }

  // --- Step 2: Fetch Ratings from OMDb using IMDb ID ---
  let omdbImdbScore = '';
  let omdbRtScore = '';
  const omdbApiKey = getOmdbApiKey();

  if (imdbId && omdbApiKey) { 
    try {
      const omdbUrl = `http://www.omdbapi.com/?apikey=${omdbApiKey}&i=${imdbId}`;
      const omdbResponse = UrlFetchApp.fetch(omdbUrl, { muteHttpExceptions: true });
      const omdbJson = JSON.parse(omdbResponse.getContentText());

      if (omdbResponse.getResponseCode() === 200 && omdbJson.Response === "True") {
        omdbData = omdbJson; 
        omdbImdbScore = omdbData.imdbRating && omdbData.imdbRating !== "N/A" ? omdbData.imdbRating : '';

        // Find Rotten Tomatoes score
        if (omdbData.Ratings && Array.isArray(omdbData.Ratings)) {
          const rtRating = omdbData.Ratings.find((r: any) => r.Source === "Rotten Tomatoes");
          if (rtRating && rtRating.Value && rtRating.Value !== "N/A") {
            omdbRtScore = rtRating.Value.replace('%', ''); // Store only the number
          }
        }
        Logger.log(`OMDb Ratings Found: IMDb=${omdbImdbScore}, RT=${omdbRtScore}`);
      } else {
         Logger.log(`OMDb API Response Error for ${imdbId}: ${omdbResponse.getContentText()}`);
      }
    } catch (error) {
      Logger.log(`Error fetching OMDb data for ${imdbId}: ${error}`);
    }
  }

  return {
    title,
    plot,
    duration,
    genres,
    director,
    actors,
    year,
    posterUrl: posterPath || undefined,
    imdbLink: imdbId ? `https://www.imdb.com/title/${imdbId}/` : undefined,
    trailerLink: trailerLink || undefined,
    imdbScore: omdbImdbScore,
    rtScore: omdbRtScore,
    // Default values for modal
    dateAdded: new Date().toLocaleDateString('en-US'),
    status: 'Vu', // Default 'Watched'
    suite: 'FALSE',
    remarques: '',
    note: ''
  };
}

/**
 * Adds a new movie row to the Google Sheet based on TMDB details.
 * @param {Object} movieData The detailed movie data object gathered FROM THE MODAL.
 * @return {string} Success message.
 */
function addMovie(movieData: MovieDetails): string {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let targetSheetName = 'Reading Log';
    
    // Determine target sheet
    try {
      let statusRaw = movieData && movieData.status ? String(movieData.status).trim().toLowerCase() : '';
      // Remove diacritics
      statusRaw = statusRaw.normalize('NFD').replace(/\p{Diacritic}/gu, '');
      
      if (['a voir', 'a-voir', 'avoir'].includes(statusRaw)) {
        targetSheetName = 'A voir';
      }
    } catch (e) {
      targetSheetName = 'Reading Log';
    }

    // Ensure the target sheet exists.
    let sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) {
      const sourceSheet = ss.getSheetByName('Reading Log');
      if (sourceSheet) {
        const headersFromSource = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
        sheet = ss.insertSheet(targetSheetName);
        sheet.getRange(1, 1, 1, headersFromSource.length).setValues([headersFromSource]);
      } else {
        sheet = ss.insertSheet(targetSheetName);
        const defaultHeaders = ['DATE','I','T','TITRE FILM','PLOT','DUREE','GENRES','REALISATEUR','ACTEURS','YEAR','REMARQUES','STATUS','SUITE A VOIR (OU PREVUE)','RT','IMDB','NOTE'];
        sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
      }
    }

    if (!sheet) {
       throw new Error(`La feuille '${targetSheetName}' est introuvable !`);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Create a map for column mapping to make it cleaner than a switch statement
    const valueMap: Record<string, () => string | number> = {
      'DATE': () => {
         const d = movieData.dateAdded || new Date().toLocaleDateString('en-US');
         const p = d.split('/');
         return (p.length === 3) ? d : new Date().toLocaleDateString('en-US');
      },
      'I': () => movieData.posterUrl ? `=HYPERLINK("${movieData.posterUrl}","I")` : 'I',
      'T': () => {
        const link = movieData.trailerLink || movieData.imdbLink;
        return link ? `=HYPERLINK("${link}","T")` : 'T';
      },
      'TITRE FILM': () => movieData.title || '',
      'PLOT': () => movieData.plot || '',
      'DUREE': () => movieData.duration || '',
      'GENRES': () => movieData.genres || '',
      'REALISATEUR': () => movieData.director || '',
      'ACTEURS': () => movieData.actors || '',
      'YEAR': () => movieData.year || '',
      'REMARQUES': () => movieData.remarques || '',
      'STATUS': () => movieData.status || 'Vu',
      'SUITE A VOIR (OU PREVUE)': () => movieData.suite ? String(movieData.suite).toUpperCase() : 'FALSE',
      'RT': () => movieData.rtScore || '',
      'IMDB': () => movieData.imdbScore || '',
      'NOTE': () => {
        const n = parseFloat(movieData.note || '');
        return !isNaN(n) ? n : '';
      }
    };

    const newRow = headers.map(header => {
       const headerUpper = String(header).toUpperCase().trim();
       // Check direct match or execute function
       const mapper = valueMap[headerUpper];
       if (mapper) return mapper();
       return ''; // Default if no mapping found
    });

    sheet.appendRow(newRow);
    SpreadsheetApp.flush(); 

    return `"${movieData.title}" ajouté avec succès à '${sheet.getName()}' !`;

  } catch (error: any) {
     throw new Error("Impossible d'ajouter le film à la feuille: " + error.message); 
  }
}