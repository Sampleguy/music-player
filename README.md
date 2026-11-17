# Music Player

A small private music player for your own songs. The songs sit in a private Cloudflare R2 bucket. A Cloudflare Worker serves the app and the songs behind one password. It is a web app: open it in a browser on any computer or phone. On iPhone you can add it to the Home Screen, with lock screen controls and an offline cache. Setup works on Mac, Windows or Linux. Plain HTML/CSS/JS, no build step. Runs on Cloudflare's free tier.

> **As is, no support.** Shared as is. No help, no updates promised. Tested only in Safari (Mac and iPhone).
>
> **Only music you own.** Use it only for songs you own or have the right to copy. Uploading or sharing music you do not have the rights to can break copyright law in your country. You are responsible for what you put in it; the authors take no responsibility for how it is used. Keep the bucket private. Do not share your password or your address.

## What you need
- A computer with Mac, Windows or Linux. On Windows or Linux, skip the import script in step 6 (it uses macOS tools) and add songs with the app's Import key.
- [Node.js](https://nodejs.org) (the LTS version).
- A free [Cloudflare](https://dash.cloudflare.com/sign-up) account. Cloudflare may ask for a card for R2. The free tier is 10 GB of songs. Set usage alerts if you want to be safe.
- Your songs as MP3 or M4A files in one folder.

Time: about 20 minutes.

## 1. Get the code
Get the code from this GitHub page: click the green **Code** button → **Download ZIP** and unzip it, or run `git clone https://github.com/Sampleguy/music-player.git`. Open the **Terminal** app and go into the folder, for example:
```bash
cd ~/Downloads/music-player-main   # or music-player if you used git clone
```
Then install the tools:
```bash
npm install
```

## 2. Sign in to Cloudflare
```bash
npx wrangler login
```
A browser page opens. Click **Allow**.

Find your account ID: on [dash.cloudflare.com](https://dash.cloudflare.com), open **Workers & Pages**. The **Account ID** is on the right side. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` in TextEdit and put the ID after `CLOUDFLARE_ACCOUNT_ID=`. Leave the other lines empty. `.env` stays on your computer. (On Windows or Linux, use any text editor.)

## 3. Make the private bucket
```bash
npx wrangler r2 bucket create music-player-files
```
If Cloudflare says R2 is not on yet, open **R2** in the dashboard, turn it on, then run the line again. Never turn on "Public access" for this bucket.

## 4. Pick your password
Pick a long password (8+ characters). You type it once per device. Run each line and paste the value when asked:
```bash
npx wrangler secret put APP_PASSWORD
```
```bash
npx wrangler secret put SESSION_SECRET
```
For `SESSION_SECRET`, paste a long random text. This line makes one:
```bash
openssl rand -hex 32
```
If a question asks to create the Worker first, answer **yes**.

## 5. Put it online
```bash
npm run deploy
```
It prints your address, like `https://music-player.<your-name>.workers.dev`. Open it in Safari and log in.

## 6. Add your music
Mac only (Windows or Linux: use the app's Import key instead):
```bash
npm run import -- ~/Music/MyFolder
```
Use your own folder path. This uploads new songs, covers and lyrics, and removes songs you deleted from the folder. Safe to run again after you add songs. You can also add songs from the app with the Import key.

## 7. iPhone Home Screen
1. On iPhone, open your address in **Safari** and log in.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open the app from the Home Screen icon. Music keeps playing with the screen locked.

## Lyrics
- **Lyrics search:** in a song's lyrics sheet, search the free LRCLIB lyrics site and pick a match. Timed lyrics scroll with the song.
- **AI lyrics:** when no lyrics are found, the AI key listens to the song and writes timed lyrics. It uses Cloudflare Workers AI (free tier, about 10,000 "neurons" a day; a few songs a day). To turn it on: on [dash.cloudflare.com](https://dash.cloudflare.com), open **AI** → **Workers AI** once and accept if asked. `wrangler.toml` already has the `[ai]` line, so `npm run deploy` connects it. If the daily free amount is used up, the app says so; try again the next day.
- **Your own lyrics:** type or paste lyrics in the editor, or delete lyrics you don't want.

## Import check and cover grid
- When you import songs from the app, a check step shows each song first with a badge if lyrics were found online. Nothing is saved until you confirm.
- The Albums and Artists screens show a grid of covers. You can set your own artist picture.

## Known issue
On iPhone, tapping the lock screen player may open another Home Screen app instead of this one. Playback is not affected.

## Settings in the app
The Theme key (palette icon) picks a theme and a color. In the same sheet, **Your name** sets the greeting name and **Retro theme name** renames the Retro theme. Both stay on that device only.

## Backup / restore
```bash
npm run backup
```
Saves the song list, playlists and play counts to `backups/<date-time>/` on your computer. Your music folder is the backup of the songs.
```bash
npm run restore
```
Puts the newest backup back (or `npm run restore -- backups/<folder>`).

## Test on your Mac (optional)
Put `APP_PASSWORD=...` and `SESSION_SECRET=...` in a file named `.dev.vars` (never shared), then:
```bash
npm run dev
```
Open the address it prints (usually http://localhost:8787).

## License
MIT, see `LICENSE`. Fonts in `app/fonts/` are under the SIL Open Font License.
