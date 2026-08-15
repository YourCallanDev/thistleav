# THISTLE AV

GitHub Pages-ready static website for THISTLE AV.

## Clean URL structure

- `/home/`
- `/equipment/`
- `/services/`
- `/about/`
- `/contact/`
- `/quote/`

Each page is an `index.html` inside its own folder, so URLs do not contain `.html`.

## Data-driven equipment

The equipment catalogue is controlled by:

`/data/equipment.json`

Change stock, price, description, category or image path there rather than editing the equipment HTML.

Unlimited-stock configurable cables use `"stock": null` and `"configurable": true`.

## Image locations

Put the final logo files here:

`/assets/logos/Main_Logo.png`
`/assets/logos/Thistle_Icon.png`

Put equipment photos into the matching department folders under:

`/assets/kit/`

The filenames currently expected by `equipment.json` are documented by the image paths in that file.

## GitHub Pages

Upload the contents of this folder to the repository root and enable GitHub Pages from the repository's Pages settings.

For a custom domain, add the domain through GitHub Pages settings and configure the DNS records at your domain provider.
