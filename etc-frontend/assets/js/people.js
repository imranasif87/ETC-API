(function () {
  let allPeople = [];

  const listEl = document.getElementById("peopleList");
  const countEl = document.getElementById("resultsCount");
  const searchInput = document.getElementById("peopleSearch");
  const roleCheckboxes = Array.from(document.querySelectorAll(".filter-role"));

  function matchesRoleFilter(person, activeRoles) {
    if (activeRoles.includes("Composer") && person.profession === "Composer") return true;
    if (activeRoles.includes("Poet") && person.profession === "Poet") return true;
    if (activeRoles.includes("other") && person.profession !== "Composer" && person.profession !== "Poet") return true;
    return false;
  }

  function render() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const activeRoles = roleCheckboxes.filter((cb) => cb.checked).map((cb) => cb.value);

    let filtered = allPeople.filter((p) => matchesRoleFilter(p, activeRoles));

    if (query) {
      filtered = filtered.filter((p) => {
        const haystack = [p.name, p.profession, p.etcIdentifier].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(query);
      });
    }

    filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));

    countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "person" : "people"}`;

    if (filtered.length === 0) {
      listEl.innerHTML = ETC.emptyStateHtml(
        "No people match these filters.",
        "Try clearing the search box or selecting more roles on the left."
      );
      return;
    }

    listEl.innerHTML = filtered.map(ETC.personCardHtml).join("");
  }

  async function init() {
    listEl.innerHTML = ETC.skeletonCardsHtml(6);

    try {
      allPeople = await ETC.loadPeople();
      render();
    } catch (e) {
      listEl.innerHTML = ETC.errorStateHtml(e.message);
      countEl.textContent = "";
    }

    searchInput.addEventListener("input", render);
    roleCheckboxes.forEach((cb) => cb.addEventListener("change", render));
    document.querySelector(".etc-search-form").addEventListener("submit", (e) => e.preventDefault());
  }

  init();
})();
