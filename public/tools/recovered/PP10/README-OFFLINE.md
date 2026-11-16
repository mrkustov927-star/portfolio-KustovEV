# Offline portfolio demonstration

Source: https://github.com/mrkustov927-star/PP10
Commit: 164fc87c79eb08c19bb215e65337393c82293672

Start with index.html. For browsers that restrict local scripts, run a local static server, for example python3 -m http.server 8000, and open http://localhost:8000.

This copy contains no participant exports, browser history or cloud records. The original repository has not been changed. External reference links remain optional; auto-submission and cloud-rating access are disabled.

## Documented changes

- Firebase/live-rating configuration replaced with cloudRating:false and no project identifiers.
- cloud() stops before loading external modules or accessing any service.
- Browser storage uses a separate portfolio-only key; original browser profiles/history are not read.
- Learning content, questions, scenarios and answer checking are unchanged.
- Added an explicit archive notice and connect-src none policy to HTML pages.
