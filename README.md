# antoniobaltic.xyz

Personal portfolio for an indie iOS / web developer based in Europe.
One page, no build step, deployed on Vercel.

## Stack

- HTML + CSS + vanilla JS (ES module)
- [Inter Tight](https://fonts.google.com/specimen/Inter+Tight) and [Geist Mono](https://fonts.google.com/specimen/Geist+Mono) via Google Fonts
- Vercel Web Analytics

## Structure

```
index.html              main portfolio page
style.css               full design system + page styles
main.js                 clock, project filter, row clicks, scroll reveal
404.html                custom not-found page
lacuna-privacy.html     Lacuna privacy policy (English)
ducky-privacy.html      Ducky privacy policy (German)
favicon.ico / *.png     favicons
antoniobaltic_ogimage.png  social preview card (1200×630)
site.webmanifest        PWA manifest
```

## Deploy

Static files — drop them on any host. Vercel reads the directory as-is, no config needed.
