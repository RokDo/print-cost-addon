(() => {
  if (!/makerworld\.com$/i.test(location.hostname) && !/\.makerworld\.com$/i.test(location.hostname)) return;

  const translations = {
    en: { title: "Print Cost", filament: "Filament", language: "Language", addFilament: "Add filament", printerSettings: "Printer settings", waste: "Waste %", failure: "Failure %", currency: "Currency", total: "Total", refresh: "Refresh", machine: "Machine", material: "Material", energy: "Energy", parts: "Parts", post: "Post-process", hours: "h" },
    pl: { title: "Koszt druku", filament: "Filament", language: "Język", addFilament: "Dodaj filament", printerSettings: "Ustawienia drukarki", waste: "Odpad %", failure: "Błędy %", currency: "Waluta", total: "Suma", refresh: "Odśwież", machine: "Maszyna", material: "Materiał", energy: "Energia", parts: "Części", post: "Obróbka", hours: "h" },
    de: { title: "Druckkosten", filament: "Filament", language: "Sprache", addFilament: "Filament hinzufügen", printerSettings: "Drucker", waste: "Abfall %", failure: "Fehler %", currency: "Währung", total: "Gesamt", refresh: "Aktualisieren", machine: "Maschine", material: "Material", energy: "Energie", parts: "Teile", post: "Nachbearb.", hours: "h" }
  };

  const byLang = () => (navigator.language || "en").slice(0, 2).toLowerCase();
  const pickText = (cfg) => translations[cfg.language === "auto" ? byLang() : cfg.language] || translations.en;

  const parsePageMetrics = () => {
    const text = document.body.innerText;
    const filamentMatch = text.match(/(filament|material)[^\d]{0,20}(\d+(?:[.,]\d+)?)\s*g/i) || text.match(/(\d+(?:[.,]\d+)?)\s*g[^\n]{0,25}(filament|material)/i);
    const timeMatch = text.match(/(print\s*time|duration)[^\d]{0,15}(\d+(?:[.,]\d+)?)\s*h/i) || text.match(/(\d+(?:[.,]\d+)?)\s*h[^\n]{0,20}(print\s*time|duration)/i);
    const filamentGrams = filamentMatch ? Number((filamentMatch[2] || filamentMatch[1]).replace(",", ".")) : 0;
    const printHours = timeMatch ? Number((timeMatch[2] || timeMatch[1]).replace(",", ".")) : 0;
    return { filamentGrams, printHours };
  };

  const formatMoney = (value, cfg) => {
    const formatted = Number(value || 0).toFixed(2);
    return cfg.currencyPosition === "after" ? `${formatted} ${cfg.currency}` : `${cfg.currency} ${formatted}`;
  };

  const calculate = (cfg, metrics) => {
    const filament = cfg.filaments.find((f) => f.id === cfg.selectedFilamentId) || cfg.filaments[0];
    const pricePerGram = filament ? filament.spoolCost / Math.max(1, filament.spoolWeight) : 0;
    const withWaste = metrics.filamentGrams * (1 + cfg.wastePercent / 100);
    const withFailure = withWaste * (1 + cfg.failurePercent / 100);
    const material = withFailure * pricePerGram;

    const machine = metrics.printHours * (cfg.printer.printerCost / Math.max(1, cfg.printer.maxRuntimeHours));
    const energy = metrics.printHours * (cfg.printer.energyWatts / 1000) * cfg.printer.energyPricePerKwh;
    const parts = (cfg.printer.parts || []).reduce((sum, p) => sum + (metrics.printHours * (p.cost / Math.max(1, p.lifetimeHours))), 0);
    const post = cfg.printer.postProcessingCost || 0;
    return { material, machine, energy, parts, post, total: material + machine + energy + parts + post };
  };

  const defaultCfg = {
    language: "auto", currency: "USD", currencyPosition: "before", wastePercent: 10, failurePercent: 5, selectedFilamentId: "", filaments: [],
    printer: { maxRuntimeHours: 4000, printerCost: 450, energyWatts: 150, energyPricePerKwh: 0.2, postProcessingCost: 0, parts: [] }
  };

  const root = document.createElement("div");
  root.id = "mwc-root";
  document.body.appendChild(root);

  const persist = async (cfg) => chrome.storage.sync.set({ mwCostConfig: cfg });

  const render = async () => {
    const store = await chrome.storage.sync.get("mwCostConfig");
    const cfg = { ...defaultCfg, ...store.mwCostConfig, printer: { ...defaultCfg.printer, ...(store.mwCostConfig?.printer || {}) } };
    const t = pickText(cfg);
    const metrics = parsePageMetrics();
    const costs = calculate(cfg, metrics);

    root.innerHTML = `
      <div class="mwc-card">
        <div class="mwc-head"><h3>${t.title}</h3><button id="mwc-refresh">${t.refresh}</button></div>
        <div class="mwc-row"><div><span class="mwc-label">${t.filament}</span><select id="mwc-filament">${cfg.filaments.map((f) => `<option value="${f.id}">${f.name} (${f.material})</option>`).join("")}</select></div></div>
        <div class="mwc-row">
          <div><span class="mwc-label">${t.waste}</span><input id="mwc-waste" type="number" value="${cfg.wastePercent}"></div>
          <div><span class="mwc-label">${t.failure}</span><input id="mwc-failure" type="number" value="${cfg.failurePercent}"></div>
        </div>
        <div class="mwc-row">
          <div><span class="mwc-label">${t.currency}</span><input id="mwc-currency" value="${cfg.currency}"></div>
          <div><span class="mwc-label">${t.language}</span><select id="mwc-language"><option value="auto">Auto</option><option value="en">EN</option><option value="pl">PL</option><option value="de">DE</option></select></div>
        </div>
        <div class="mwc-small">${metrics.filamentGrams || "?"} g • ${metrics.printHours || "?"} ${t.hours}</div>
        <div class="mwc-result">
          <div>${t.material}: ${formatMoney(costs.material, cfg)}</div>
          <div>${t.machine}: ${formatMoney(costs.machine, cfg)}</div>
          <div>${t.energy}: ${formatMoney(costs.energy, cfg)}</div>
          <div>${t.parts}: ${formatMoney(costs.parts, cfg)}</div>
          <div>${t.post}: ${formatMoney(costs.post, cfg)}</div>
          <div class="mwc-total">${t.total}: ${formatMoney(costs.total, cfg)}</div>
        </div>
        <details><summary>${t.addFilament}</summary>
          <div class="mwc-row"><input id="mwc-new-name" placeholder="Name"><input id="mwc-new-mat" placeholder="Material"></div>
          <div class="mwc-row"><input id="mwc-new-color" placeholder="Color"><input id="mwc-new-weight" placeholder="g" type="number"></div>
          <div class="mwc-row"><input id="mwc-new-cost" placeholder="Cost" type="number"><button id="mwc-add-filament">+</button></div>
        </details>
      </div>`;

    const filamentSel = root.querySelector("#mwc-filament");
    if (filamentSel) filamentSel.value = cfg.selectedFilamentId || (cfg.filaments[0]?.id || "");
    root.querySelector("#mwc-language").value = cfg.language;

    root.querySelector("#mwc-refresh").onclick = render;
    root.querySelector("#mwc-add-filament").onclick = async () => {
      const newF = {
        id: crypto.randomUUID(),
        name: root.querySelector("#mwc-new-name").value || "New filament",
        material: root.querySelector("#mwc-new-mat").value || "PLA",
        color: root.querySelector("#mwc-new-color").value || "",
        spoolWeight: Number(root.querySelector("#mwc-new-weight").value || 1000),
        spoolCost: Number(root.querySelector("#mwc-new-cost").value || 20)
      };
      cfg.filaments.push(newF);
      cfg.selectedFilamentId = newF.id;
      await persist(cfg);
      render();
    };

    ["mwc-filament", "mwc-waste", "mwc-failure", "mwc-currency", "mwc-language"].forEach((id) => {
      root.querySelector(`#${id}`)?.addEventListener("change", async () => {
        cfg.selectedFilamentId = root.querySelector("#mwc-filament").value;
        cfg.wastePercent = Number(root.querySelector("#mwc-waste").value || 0);
        cfg.failurePercent = Number(root.querySelector("#mwc-failure").value || 0);
        cfg.currency = root.querySelector("#mwc-currency").value || "USD";
        cfg.language = root.querySelector("#mwc-language").value || "auto";
        await persist(cfg);
        render();
      });
    });
  };

  render();
})();
