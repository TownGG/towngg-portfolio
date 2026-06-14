(() => {
  const FEATURED_NEXUS_ID = "17461";

  function nexusIdFromMod(mod) {
    const link = (mod.links || []).find((item) => String(item.url || "").includes("nexusmods.com"));
    const match = String(link?.url || "").match(/\/mods\/(\d+)/);
    return match?.[1] || "";
  }

  const mods = window.siteData?.mods;
  if (!Array.isArray(mods)) return;

  const index = mods.findIndex((mod) => nexusIdFromMod(mod) === FEATURED_NEXUS_ID);
  if (index < 0) return;

  const [featured] = mods.splice(index, 1);
  Object.assign(featured, {
    title: "Cassilias Power Fist",
    category: "Weapon / Melee / Cassilia Universe",
    group: "Weapon",
    description: "A standalone Starfield melee weapon built around Cassilia's prototype power fist.",
    featureDescription: "A UC Vanguard prototype too powerful for ordinary soldiers. The project was cancelled after repeated arm injuries. Cassilia kept asking for a stronger version.",
    tags: ["Weapon", "Melee", "Power Fist", "Cassilia"],
    links: [
      { label: "Nexus Mods", url: "https://www.nexusmods.com/starfield/mods/17461" }
    ]
  });

  mods.unshift(featured);
})();
