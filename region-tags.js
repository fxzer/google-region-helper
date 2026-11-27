// 按地区主国家名分配柔和一致的色板索引（is-c0 ~ is-c4）
window.GRH_REGION_TAGS = (() => {
  const BUCKET_COUNT = 5;

  function getCountryKey(region = "") {
    return String(region).split(/\s*[-·(（]/)[0].trim();
  }

  function getToneClass(region = "") {
    const key = getCountryKey(region);
    if (!key) return "is-default";
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `is-c${(h >>> 0) % BUCKET_COUNT}`;
  }

  function formatRegionLabel(name = "", code = "") {
    return `${name} (${String(code).toUpperCase()})`;
  }

  function formatSelectedSummary(countryName = "", stateName = "") {
    if (!countryName) return "";
    return stateName ? `${countryName} · ${stateName}` : countryName;
  }

  function formatDropdownCount(matchCount, totalCount, isFiltered) {
    return isFiltered ? `匹配 ${matchCount} / ${totalCount} 项` : `共 ${totalCount} 项`;
  }

  return { getCountryKey, getToneClass, formatRegionLabel, formatSelectedSummary, formatDropdownCount };
})();
