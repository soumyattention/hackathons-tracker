# Hackathon Tracker

A minimalist web app to track hackathons, featuring AI-powered auto-fill and Twitter hashtag analysis.

## Features
- **Track**: Title, Deadline, Prize, Difficulty, Rules, etc.
- **Auto-fill**: Paste a URL, and **Gemini 2.5 Flash** extracts details automatically.
- **Twitter Stats**: Counts videos for specific hashtags mentioned in the rules.
- **Local Storage**: Data is saved in `hackathons.db` (SQLite).

## How to Run Locally
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the server:
    ```bash
    node server.js
    ```
3.  Open `http://localhost:3000`.

## Data Storage
Your data is stored in the **`hackathons.db`** file in this directory.
*   **Backup**: Simply copy this file to a safe location (e.g., Google Drive).
*   **Restore**: Paste the file back into this directory.

## Deployment (Vercel)
To deploy this to Vercel, you cannot use the local `hackathons.db` file because Vercel is "serverless" and doesn't keep local files.

**Required Changes for Vercel:**
1.  **Database**: Switch from `sqlite3` to **Vercel Postgres** or **Turso**.
2.  **Code**: Update `server.js` to connect to the cloud database instead of the local file.

If you wish to deploy, please let me know, and I can update the code to use PostgreSQL!
