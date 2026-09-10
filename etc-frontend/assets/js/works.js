(function () {
  let allWorks = [];

  const listEl = document.getElementById("worksList");
  const countEl = document.getElementById("resultsCount");
  const searchInput = document.getElementById("worksSearch");
  const sortSelect = document.getElementById("sortSelect");
  const typeCheckboxes = Array.from(document.querySelectorAll(".filter-type"));

  function activeTypes() {
    return typeCheckboxes.filter((cb) => cb.checked).map((cb) => cb.value);
  }

  function render() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const types = activeTypes();
    const sortBy = sortSelect.value;

    let filtered = allWorks.filter((w) => types.includes(w.type));

    if (query) {
      filtered = filtered.filter((w) => {
        const haystack = [w.title, w.subtitle, w.opus, w.etcIdentifier, w.kentNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    filtered = filtered.slice().sort((a, b) => {
      if (sortBy === "opus") {
        return (a.opus || "").localeCompare(b.opus || "", undefined, { numeric: true });
      }
      return a.title.localeCompare(b.title);
    });

    countEl.textContent = `${filtered.length} work${filtered.length === 1 ? "" : "s"}`;

    if (filtered.length === 0) {
      listEl.innerHTML = ETC.emptyStateHtml(
        "No works match these filters.",
        "Try clearing the search box or selecting more work types on the left."
      );
      return;
    }

    listEl.innerHTML = filtered.map(ETC.workCardHtml).join("");
  }

  async function init() {
    listEl.innerHTML = ETC.skeletonCardsHtml(6);

    const queryFromUrl = ETC.getQueryParam("q");
    if (queryFromUrl) searchInput.value = queryFromUrl;

    try {
      allWorks = await ETC.loadWorks();
      render();
    } catch (e) {
      listEl.innerHTML = ETC.errorStateHtml(e.message);
      countEl.textContent = "";
    }

    searchInput.addEventListener("input", render);
    sortSelect.addEventListener("change", render);
    typeCheckboxes.forEach((cb) => cb.addEventListener("change", render));

    document.querySelector(".etc-search-form").addEventListener("submit", (e) => e.preventDefault());
  }

  init();
})();
