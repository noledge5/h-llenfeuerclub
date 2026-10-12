# Maps, scale and movement

All numbers here are for D&D 2024 rules, one grid square = 5 ft = 1.5 m. Check any table row against your Player's Handbook before using it as a ruling.

## 1. Map image sizes

Let `P` be pixels per square in the image. Image width = columns x P, height = rows x P.

| Map | Squares | Real size | At 100 px (minimum) | At 140 px (ideal) |
|---|---|---|---|---|
| Dorfplatz | 16 x 12 | 24 m x 18 m | 1600 x 1200 | 2240 x 1680 |
| Halle | 10 x 10 | 15 m x 15 m | 1000 x 1000 | 1400 x 1400 |
| Keller | 6 x 6 | 9 m x 9 m | 600 x 600 | 1080 x 1080 (see below) |
| Turmstube | 6 x 6 | 9 m x 9 m | 600 x 600 | 1080 x 1080 (see below) |
| Gegend | no grid | free | 1920 x 1080 | 2560 x 1440 |

Small maps: on a 1080 p beamer a 6 x 6 map is shown at 180 px per square, so a 6 x 6 image should be at least 1080 x 1080 (P = 180). Rule: P = max(140, ceil(1080 / rows)).

The generator must produce the aspect ratio columns : rows. 16 x 12 is exactly 4:3, 10 x 10 and 6 x 6 are 1:1. Ask for "no grid, no labels, top-down", and let the tool draw the grid. Use WebP or PNG, about 8 MB at most per map (the project backup stores media as Base64, which adds a third).

## 2. How the beamer fits a map

Beamer stage: 1920 x 1080. The map is scaled to fit, centred:

```
s      = min(1920 / (cols * P), 1080 / (rows * P))
square = P * s          (pixels per square on the beamer)
```

| Map | Square on beamer | Map on beamer | Margins |
|---|---|---|---|
| Dorfplatz 16 x 12 | 90 px | 1440 x 1080 | 240 px left and right |
| Halle 10 x 10 | 108 px | 1080 x 1080 | 420 px left and right |
| Keller, Turmstube 6 x 6 | 180 px | 1080 x 1080 | 420 px left and right |

If `square` is larger than `P`, the image is enlarged and looks soft. Zooming in on the beamer by factor z needs `P >= square * z`.

## 3. Grid calibration (the math the tool does)

```
P  = image width / columns            (check: also image height / rows, they should match within 1.5 %)
cell(x, y)   = ( floor((x - ox) / P), floor((y - oy) / P) )
centre(c, r) = ( ox + (c + 0.5) * P, oy + (r + 0.5) * P )
```

`ox, oy` is the grid offset in image pixels (0 to P - 1). Snap tokens to `centre`. If the picture already has a printed grid, count its squares across and down; use those as columns and rows.

Token sizes: Medium and Small = 1 x 1 square (token diameter about 0.85 x square), Large = 2 x 2, Huge = 3 x 3, Gargantuan = 4 x 4.

## 4. Distance and the ruler

Default: every step, diagonal or straight, counts as 1 square.

```
squares = max(|dx|, |dy|)           metres = squares * 1.5
```

Optional variant "5-10-5" (every second diagonal costs 2):

```
squares = max(|dx|, |dy|) + floor(min(|dx|, |dy|) / 2)
```

Example: 3 across and 1 down = 3 squares = 4.5 m (default); 4 across and 4 down = 4 squares default, 6 squares in 5-10-5.

## 5. Movement per turn

| Speed | Squares | Metres | Dash (double) |
|---|---|---|---|
| 20 ft | 4 | 6 m | 8 squares |
| 25 ft | 5 | 7.5 m | 10 squares |
| 30 ft | 6 | 9 m | 12 squares |
| 35 ft | 7 | 10.5 m | 14 squares |
| 40 ft | 8 | 12 m | 16 squares |

`squares = floor(speed in ft / 5)`, `metres = squares * 1.5`.

- Difficult terrain: each square costs 2. A speed of 6 squares moves 3 squares.
- Climbing or swimming without a special speed, and crawling: each square costs 1 extra, so 6 squares of speed move 3.
- Standing up from prone costs half of your speed (3 squares at speed 6).
- Moving through an ally's square is allowed; ending your move there is not. Moving through an enemy's square is not allowed.

## 6. Ranges and areas in squares

| Thing | Feet | Squares |
|---|---|---|
| Melee reach | 5 | 1 (diagonals count) |
| Darkvision | 60 | 12 |
| Shortbow normal / long | 80 / 320 | 16 / 64 |
| Light crossbow | 80 / 320 | 16 / 64 |
| Thrown dagger | 20 / 60 | 4 / 12 |
| Cone 15 ft (e.g. Burning Hands) | 15 | 3 long |
| Sphere radius 20 ft | 20 | 4 |
| Cube 10 ft | 10 | 2 x 2 |

Conversion: `squares = feet / 5`, `feet = squares * 5`, `metres = feet * 0.3048`, and in this tool the table values use 1.5 m per square (5 ft = 1.52 m, rounded).

## 7. Mood images and handouts

- Mood image: 1920 x 1080, 16:9, WebP or JPG, about 1 to 3 MB. Keep the subject away from the outer 10 % (vignette).
- Handout: text is set live in the app at 40 px; if you upload a scan, use 1920 x 1080 with dark ink on `surface`.
- Title card: 1920 x 1080.
