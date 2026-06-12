# TownGG Admin Upload Worker

Cloudflare Worker backend for `/admin-upload.html`.

## Route

Recommended production route:

```txt
https://towngg.com/api/admin/gallery-upload
```

The frontend already posts to:

```txt
/api/admin/gallery-upload
```

So the Worker should be attached to the `towngg.com/api/admin/*` route.

## Required Worker environment variables

```txt
GITHUB_TOKEN=<fine-grained GitHub token>
ADMIN_UPLOAD_SECRET=<admin key used on the login page>
GITHUB_OWNER=TownGG
GITHUB_REPO=towngg-portfolio
GITHUB_BRANCH=main
```

## GitHub token permissions

Use a fine-grained token scoped only to:

```txt
TownGG/towngg-portfolio
```

Required permissions:

```txt
Contents: Read and Write
Metadata: Read
```

No Issues, Pull Requests, Actions, or Administration permissions are required.

## What the Worker does

When `/admin-upload.html` sends images, the Worker:

1. Verifies `X-Admin-Key` against `ADMIN_UPLOAD_SECRET`.
2. Receives compressed JPG images from the browser.
3. Writes image files into `assets/images/gallery-all-compressed/`.
4. Updates either:
   - `assets/data/gallery-concept-art.json`
   - `assets/data/gallery-screenshots.json`
5. Updates `assets/data/site-version.json`.
6. Creates a single Git commit through the GitHub Git Data API.

## Notes

- The admin key remembered by the browser is only a convenience login key.
- The real write permission remains inside Cloudflare Worker environment variables.
- Do not put `GITHUB_TOKEN` in any HTML, CSS, or browser JavaScript file.
