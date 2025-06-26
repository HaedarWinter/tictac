# Deployment Instructions

## Deploying to GitHub Pages

To deploy this Multiplayer Tic Tac Toe game, follow these steps:

1. First, create a new repository on GitHub:
   - Go to [GitHub](https://github.com) and log in
   - Click on the "+" icon in the top-right corner, then "New repository"
   - Name it `multiplayer-tictactoe` (or your preferred name)
   - Make it public or private according to your preference
   - Click "Create repository"

2. Push your local repository to GitHub:
   ```bash
   git remote add origin https://github.com/HaedarWinter/tictac.git
   git push -u origin main
   ```

3. Set up GitHub Pages:
   - Go to your repository on GitHub
   - Click "Settings" > "Pages"
   - Under "Branch", select "main" and select either root or "/docs" folder
   - Click "Save"
   - Your site will be published at `https://haedarwinter.github.io/tictac/`

4. Alternatively, you can use GitHub Actions:
   - The `.github/workflows/nextjs.yml` file is already created for you
   - Just push to the `main` branch and it will automatically deploy

## Deploying to Vercel

For the best performance and easiest deployment:

1. Create an account on [Vercel](https://vercel.com/) if you don't have one
2. Connect your GitHub account
3. Import your repository
4. Vercel will automatically detect the Next.js configuration
5. Click "Deploy"

Your app will be deployed to a URL like `https://multiplayer-tictactoe.vercel.app/`

## Deploying to Netlify

Another great option for hosting:

1. Create an account on [Netlify](https://www.netlify.com/)
2. Click "New site from Git"
3. Select GitHub and choose your repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `out`
5. Click "Deploy site"

## Local Testing

Before deploying, always test locally:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Create production build
npm run build
```

## Environment Variables

Remember to set up these environment variables in your hosting platform:

- `NEXT_PUBLIC_PEERJS_HOST`
- `NEXT_PUBLIC_PEERJS_PORT`
- `NEXT_PUBLIC_PEERJS_PATH`
- `NEXT_PUBLIC_PEERJS_SECURE`
- `NEXT_PUBLIC_WEBSOCKET_URL` 