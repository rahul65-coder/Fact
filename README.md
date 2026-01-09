# FilmFanaticZone Telegram Bot

A referral-based movie bot built on Cloudflare Workers.

## Features
- Referral system
- Category-based movie browsing
- Admin panel for movie management
- User statistics
- Request system

## Deployment

1. Clone repository
2. Install dependencies: `npm install`
3. Deploy: `wrangler deploy`

## Environment Variables
Set in `wrangler.toml`:
- `BOT_TOKEN`: Telegram bot token
- `ADMIN_ID`: Admin user ID

## GitHub + Cloudflare Integration
This project uses GitHub for source control and Cloudflare Workers for hosting.
