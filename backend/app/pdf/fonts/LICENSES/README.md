# Font licenses

Every font binary bundled in `backend/app/pdf/fonts/` is redistributable. This
directory holds the license and attribution text required when redistributing
them inside StudyForge builds and generated PDFs.

| Font file | License | Attribution file |
| --- | --- | --- |
| `NotoSans-Regular.ttf` | Apache-2.0 | `NotoSans-NOTICE.txt`, `Apache-2.0.txt` |
| `NotoSans-Bold.ttf` | Apache-2.0 | `NotoSans-NOTICE.txt`, `Apache-2.0.txt` |
| `DroidSansDevanagari-Regular.ttf` | Apache-2.0 | `DroidSans-NOTICE.txt`, `Apache-2.0.txt` |

Apache-2.0 requires that this NOTICE material travel with the binaries. Do not
delete this directory when packaging or deploying the backend.

If you replace the Devanagari face with Noto Sans Devanagari (which does have a
bold companion), add its license here and update
`backend/app/pdf/fonts/README.md`.
