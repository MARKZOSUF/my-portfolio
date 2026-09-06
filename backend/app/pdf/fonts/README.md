# Bundled PDF fonts

These font files are committed to the repository so that Unicode and Hindi
(Devanagari) PDF rendering is reproducible and does not depend on fonts being
installed on the host or container image.

| File | Script coverage | Upstream project | License |
| --- | --- | --- | --- |
| `NotoSans-Regular.ttf` | Latin / Hinglish body text | Noto Sans | SIL Open Font License 1.1 |
| `NotoSans-Bold.ttf` | Latin / Hinglish bold text | Noto Sans | SIL Open Font License 1.1 |
| `DroidSansDevanagari-Regular.ttf` | Devanagari (Hindi) | Droid Sans Devanagari | Apache License 2.0 |

The two `NotoSans` static files were produced by instancing the upstream
`NotoSans[wght].ttf` variable font at `wght=400` and `wght=700` with
`fontTools.varLib.instancer`. They are therefore derivative works of Noto Sans
and remain under the SIL Open Font License 1.1.

## Devanagari face

`DroidSansDevanagari-Regular.ttf` is the bundled Hindi face. It has no bold
companion, so the renderer uses the regular weight for Hindi bold runs. If you
prefer Noto Sans Devanagari, drop `NotoSansDevanagari-Regular.ttf` (and
optionally `NotoSansDevanagari-Bold.ttf`) into this directory; the renderer
prefers those filenames automatically and no code change is required.

## Lookup order

`app/pdf/renderer.py::load_fonts` resolves fonts in this order:

1. Bundled files in this directory.
2. Common system font paths (Noto, Droid, DejaVu, Liberation).
3. ReportLab built-in Helvetica/Courier, which cannot render Devanagari.

If no Devanagari face can be registered, the renderer records an explicit
warning in `FontSet.notes` rather than silently emitting boxes.

License texts are in `LICENSES/`.
