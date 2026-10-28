// Preserve shared links to the database after its move.
(() => {
  function openLegacyLink() {
    if (location.hash.startsWith('#/')) location.replace('/inorganic/' + location.search + location.hash);
  }
  openLegacyLink();
  window.addEventListener('hashchange', openLegacyLink);
})();
