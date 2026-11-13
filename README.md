# POCKETDEX — Pokémon TCG Pocket Collection Tracker

A GitHub Pages tracker for individual Pokémon TCG Pocket card versions, promos, reprints, foil variants, alternate art, immersive, shiny, and crown rarities included in the upstream data.

## Repositories
- Public app/catalog: https://github.com/cedarparkjacob/PTCGP-Public
- Personal collection: https://github.com/cedarparkjacob/PTCGP-Collection-Private

IMPORTANT: Make the collection repository PRIVATE in GitHub Settings → General → Danger Zone before syncing. The app checks visibility and refuses to send collection data if the repo is public.

## Features
- Per-version quantity tracking and wishlist flags.
- Pokémon rollups based on National Pokédex numbers.
- Expansion completion, Pokédex, wishlist, and statistics.
- Search and filters for expansion, rarity, type, and ownership.
- Local browser backup plus JSON import/export.
- Optional sync to the private collection repository.
- Weekly catalog refresh from Vociferix/ptcgp-data.

## Setup
1. Change PTCGP-Collection-Private visibility to Private (Settings → General → Danger Zone).
2. In this repository, open Actions and enable workflows.
3. Run the Update card catalog workflow once. It also refreshes weekly.
4. In Settings → Pages, choose Deploy from a branch, branch main, folder /(root), then Save.
5. Visit https://cedarparkjacob.github.io/PTCGP-Public/.

## GitHub token
Create a fine-grained personal access token restricted to only PTCGP-Collection-Private with Contents: Read and write. Enter it in Storage settings. It is held in page memory only, not browser storage. A browser-held token remains accessible to any malicious or modified JavaScript running on the page; use a narrowly scoped token and revoke it if exposed.

## Attribution
Catalog metadata comes from https://github.com/Vociferix/ptcgp-data and images from https://github.com/Vociferix/ptcgp-images. The upstream projects state that Pokémon TCG Pocket card information and artwork are copyright The Pokémon Company, DeNA Co., Ltd., and/or Creatures, Inc. This is an unofficial fan-made tool, not affiliated with or endorsed by them. Respect upstream licenses and image usage terms.
