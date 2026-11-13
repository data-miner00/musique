// Prerender the app's one page at build time, with SSR on: the built
// index.html carries the app shell, and the Library is fetched in the
// browser after hydration. Code that touches browser-only globals must stay
// behind the `browser` guard, or the build fails.
export const prerender = true;
