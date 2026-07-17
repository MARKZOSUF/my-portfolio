(() => {
  "use strict";

  let configPromise;

  async function getConfig() {
    configPromise ||= fetch("/api/config", { headers: { Accept: "application/json" } })
      .then(response => response.ok ? response.json() : {})
      .catch(() => ({}));
    return configPromise;
  }

  async function renderAd(container) {
    if (!container) return;
    const config = await getConfig();
    const monetization = config.monetization || {};
    if (!monetization.adsenseConfigured) {
      container.textContent = "AdSense is not configured. Add ADSENSE_CLIENT and ADSENSE_SLOT.";
      return;
    }

    if (!document.querySelector('script[data-nexus-adsense]')) {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.nexusAdsense = "true";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(monetization.adsenseClient)}`;
      document.head.appendChild(script);
    }

    container.innerHTML = "";
    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.dataset.adClient = monetization.adsenseClient;
    ad.dataset.adSlot = monetization.adsenseSlot;
    ad.dataset.adFormat = "auto";
    ad.dataset.fullWidthResponsive = "true";
    container.appendChild(ad);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      container.textContent = "The ad script has not finished loading yet.";
    }
  }

  window.NEXUS_MONETIZATION = { renderAd, getConfig };
})();
