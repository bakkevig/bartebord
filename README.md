# Bartebord

Website for [Bartebord](https://bartebord.no) – an annual celebration of mustaches in Stavanger, Norway. Every November, men gather in dark suits for an evening of style, elegance, fine food and drink, and charity, supporting the Movember foundation.

## Tech Stack

- [React](https://react.dev/) – UI library
- [Vite](https://vite.dev/) – Build tool
- [Tailwind CSS](https://tailwindcss.com/) – Styling
- [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) – Typography
- [GitHub Pages](https://pages.github.com/) – Hosting
- [GitHub Actions](https://github.com/features/actions) – CI/CD

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The dev server runs at http://localhost:5173

## Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Voting

The voting for the year's best and worst mustache lives at `/vote/`, `/admin/` and `/screen/`, backed by Supabase. See [VOTING.md](VOTING.md) for setup and use.

## Deployment

The site automatically deploys to GitHub Pages when changes are pushed to `main`. The GitHub Actions workflow handles building and deployment.

**Live site:** https://bartebord.no

## Vibe-coded with Claude

This website was vibe-coded with [Claude Code](https://claude.ai/code) (Claude Opus 4.5).
