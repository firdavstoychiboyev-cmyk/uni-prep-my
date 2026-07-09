# University logos

Static logo images for the "Orzumdagi universitetni tanlash" dashboard cards.
Referenced by the `logo` field of each entry in `TOP_UNIVERSITIES`
(`src/app/(dashboard)/home/page.tsx`). If a file is missing, that card falls
back to the coloured short-code text badge — nothing breaks.

| Short code | University                                        | File in this folder                              |
| ---------- | ------------------------------------------------- | ------------------------------------------------ |
| JIDU       | Jahon Iqtisodiyoti va Diplomatiya Universiteti    | `jidu.png` *(not added yet → shows text badge)*  |
| TDYU       | Toshkent Davlat Yuridik Universiteti              | `Toshkent_davlat_yuridik_universiteti-01-2.png`  |
| TDIU       | Toshkent Davlat Iqtisodiyot Universiteti          | `TDIU-01.png`                                    |
| O'zMU      | O'zbekiston Milliy Universiteti                   | `OZMU-01.png`                                    |
| TUIT/TATU  | Toshkent Axborot Texnologiyalari Universiteti     | `TATU-01.png`                                    |
| TDTU       | Toshkent Davlat Texnika Universiteti              | `TDTU_LOGO.png` *(renamed from "TDTU LOGO.png")* |
| SamDU      | Samarqand Davlat Universiteti                     | `images.jpeg`                                    |
| ToshDShI   | Toshkent Davlat Sharqshunoslik Universiteti       | `channels4_profile.jpg`                          |

## Adding the JIDU logo
Drop the JIDU logo here as `jidu.png` (no spaces). It will appear automatically.
To use a different filename, update the `logo` path for `id: "jidu"` in
`src/app/(dashboard)/home/page.tsx`.

## Image guidelines
- Any aspect ratio works — the card renders each logo with `object-fit: contain`
  inside a fixed 40×40 rounded square on a white background, so nothing is
  stretched or cropped inconsistently.
- Avoid spaces in filenames (they need URL encoding). Use underscores/hyphens.
