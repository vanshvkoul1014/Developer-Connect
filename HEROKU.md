# Deploy Developer Connect to Heroku

This app uses one Heroku web process for the React frontend and Express API, with MongoDB Atlas for persistent data. The deployment configuration has been built and tested locally; no Heroku app or Atlas database has been provisioned for you.

## 1. Accounts and cost

Create accounts at https://signup.heroku.com and https://www.mongodb.com/atlas. In Heroku Billing, subscribe to Eco if you want the Eco dyno used below. As checked September 29, 2026, Eco costs $5/month for a shared pool of 1,000 hours and sleeps after 30 minutes without web traffic. Select Atlas's Free tier if available for your chosen configuration.

## 2. MongoDB Atlas

Create a cluster, then create a database user with a strong unique password and read/write access to the `developer_connect` database. This is separate from your Atlas website login.

Under the cluster's Connect > Drivers option, copy the Node.js connection string. Replace the username and password placeholders and specify the database:

```text
mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER.mongodb.net/developer_connect?retryWrites=true&w=majority
```

URL-encode reserved characters in the password. Keep this URI private.

Atlas must allow your server's network connection. For a basic demo without static outbound IPs, an Atlas Network Access entry of `0.0.0.0/0` permits connections from any IPv4 address; database authentication is still required. This broadens network exposure. Use a dedicated least-privilege database user; for restricted production networking, configure static egress and allowlist those addresses instead. Merely adding your Mac's IP will not allow the Heroku server to connect.

## 3. Install the CLI on macOS

With Homebrew installed:

```bash
brew install heroku/brew/heroku
heroku login
```

## 4. Create the app

Extract the updated ZIP into a new folder, open Terminal, and change into the folder containing the root `package.json`, `client`, and `server`. For example:

```bash
cd ~/Downloads/developer-connect
git init
git add .
git commit -m "Prepare Developer Connect for Heroku"
git branch -M main
heroku create --stack heroku-24
heroku buildpacks:set heroku/nodejs
```

If this folder already has Git history, keep it; commit the updated files instead of starting another repository. If you already created a Heroku app, attach it with `heroku git:remote -a YOUR_APP_NAME` instead of creating another. The auto-generated app name avoids name collisions.

## 5. Set environment variables

In the Heroku dashboard, open this app > Settings > Reveal Config Vars. Add:

| Key | Value |
| --- | --- |
| MONGODB_URI | Your complete Atlas connection string |
| JWT_SECRET | A newly generated random secret, at least 32 characters |
| NODE_ENV | production |
| CLIENT_ORIGIN | The exact HTTPS app URL, with no trailing slash; copy from Settings > Domains |

Generate a secret on your Mac, then paste the output into the JWT_SECRET field:

```bash
openssl rand -hex 32
```

Do not commit `.env` or put secrets in the React client. Do not set PORT: Heroku supplies it. NODE_ENV=production tells Express to serve the compiled frontend. No separate frontend hosting is required.

## 6. Deploy and open

The next commands publish the app and run a billable Eco web process under your subscription:

```bash
git push heroku main
heroku ps:scale web=1:eco
heroku open
```

Heroku installs dependencies, runs `heroku-postbuild` to build React, and runs `npm start` from the Procfile. The lockfile, Node version, process definition, static serving, React route fallback, and shutdown handling are already included.

## 7. Verify

Register a new account, create a profile, add experience, and publish a post. Sign out and sign back in to confirm persistence. Refresh `/dashboard` directly to check client routing. The build and five server tests passed before packaging; live MongoDB workflows still require this check after configuring Atlas.

If the page shows an application error:

```bash
heroku logs --tail
```

- MongoDB connection timeout: check Atlas Network Access and the URI.
- Authentication failed: check the database user's credentials and URL encoding.
- JWT_SECRET error: use the exact variable name and a secret of at least 32 characters.
- No web process: ensure `Procfile` is at the repository root and enable the web dyno.

To publish future updates:

```bash
git add .
git commit -m "Update Developer Connect"
git push heroku main
```

Official references:
- https://devcenter.heroku.com/articles/heroku-cli
- https://devcenter.heroku.com/articles/git
- https://devcenter.heroku.com/articles/nodejs-classic-buildpack-builds
- https://devcenter.heroku.com/articles/eco-dyno-hours
- https://www.mongodb.com/docs/atlas/security/ip-access-list/
