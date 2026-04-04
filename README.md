# zagreb-liga

A football-style city cost-of-living league table. Live at [zagreb.lol/liga](https://zagreb.lol/liga/).

Cities across Europe are ranked by cost of living, presented as standings, match cards, trend charts, and head-to-head comparisons.

## Data source

Data is scraped from [Numbeo](https://www.numbeo.com/cost-of-living/) by the [cityscraper](https://github.com/Poglavar/cityscraper) bot and stored in a PostgreSQL database. This frontend reads from the shared API in `cadastre-data/api`.

## Stack

Plain HTML + CSS + JS. No build step.

- **i18n**: i18next with locale packs in `locales/` (English, Croatian, Slovenian, Serbian Latin).
- **City deep links**: `zagreb.lol/liga/<city-slug>` sets the home team and auto-detects language when no preference is saved.

## Deploy

```bash
./deploy-usporedbe-gradova.sh
```

Rsyncs static files to `/var/www/zagreb.lol/liga` on the production server.

## Local preview

```bash
python3 -m http.server 4173
```

The dashboard reads from the API at `localhost:3001` (the `zagreb-api` from `cadastre-data/api`).
