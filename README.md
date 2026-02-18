# Movie Tracker Deluxe 🎬

A Google Apps Script project for tracking movies.

## 🚀 Cloning & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/DupuisB/movieTracker.git
    cd movieTracker
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## 🛠️ Development Workflow

The project is structured into:

- `src/`: Frontend source code (TypeScript, CSS, HTML).
- `Code.ts`: Backend Google Apps Script logic.

### Local Development

To work on the frontend with hot-reload:

```bash
npm run dev
```

_Note: This runs a local dev server. Apps Script functions like `google.script.run` will not work locally unless mocked._

### Building for Production

To bundle everything into a single file for Apps Script:

```bash
npm run build
```

This command:

1.  Compiles TypeScript.
2.  Bundles CSS and JS into `dist/index.html`.
3.  Copies `dist/index.html` to `index.html` in the root (required by our Clasp structure).

### Deployment

Optional: To deploy to Google Apps Script manually:

```bash
npx clasp push
```

## 🤖 CI/CD (GitHub Actions)

This repository is configured to automatically deploy on push to the `main` branch.

**Requirements:**
You must set up the `CLASP_TOKEN` secret in your GitHub repository settings.

1.  Run `npx clasp login` locally.
2.  Copy the content of your `~/.clasprc.json`.
3.  Go to GitHub repo > Settings > Secrets and variables > Actions.
4.  Add a new repository secret named `CLASP_TOKEN` with the content of your `.clasprc.json`.

## 📂 Project Structure

```
├── src/                # Frontend source
│   ├── main.ts         # Frontend logic
│   ├── style.css       # Styles
│   └── index.html      # Entry point
├── Code.ts             # Backend logic
├── appsscript.json     # Apps Script manifest
├── package.json        # Dependencies & scripts
├── vite.config.ts      # Vite configuration
└── .claspignore        # Files to ignore during push
```
