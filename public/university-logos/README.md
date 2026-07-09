# University logos

Static logo images for the "Orzumdagi universitetni tanlash" dashboard cards.

Drop each file here with the EXACT filename below (all lowercase, `.png`).
Until a file exists, that card automatically falls back to the coloured
short-code text badge — nothing breaks.

| Short code | University                                        | Expected file                          |
| ---------- | ------------------------------------------------- | -------------------------------------- |
| JIDU       | Jahon Iqtisodiyoti va Diplomatiya Universiteti    | `public/university-logos/jidu.png`     |
| TDYU       | Toshkent Davlat Yuridik Universiteti              | `public/university-logos/tdyu.png`     |
| TDIU       | Toshkent Davlat Iqtisodiyot Universiteti          | `public/university-logos/tdiu.png`     |
| O'zMU      | O'zbekiston Milliy Universiteti                   | `public/university-logos/nuu.png`      |
| TUIT       | Toshkent Axborot Texnologiyalari Universiteti     | `public/university-logos/tuit.png`     |
| TDTU       | Toshkent Davlat Texnika Universiteti              | `public/university-logos/tdtu.png`     |
| SamDU      | Samarqand Davlat Universiteti                     | `public/university-logos/samdu.png`    |
| ToshDShI   | Toshkent Davlat Sharqshunoslik Universiteti       | `public/university-logos/tashgiu.png`  |

## Image guidelines
- Square-ish source is ideal, but any aspect ratio works — the card renders it
  with `object-fit: contain` inside a fixed 40×40 rounded square on a white
  background, so nothing is stretched or cropped inconsistently.
- Transparent-background PNGs look best (the container is white).
- To use a different format (e.g. `.svg`), update the `logo` path for that
  university in `src/app/(dashboard)/home/page.tsx`.
