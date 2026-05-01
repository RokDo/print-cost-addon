const parseHours = (raw) => {
  if (!raw) return 0;
  const txt = raw.toLowerCase();
  const h = Number((txt.match(/(\d+(?:[.,]\d+)?)\s*h/) || [])[1]?.replace(',', '.')) || 0;
  const m = Number((txt.match(/(\d+(?:[.,]\d+)?)\s*m/) || [])[1]?.replace(',', '.')) || 0;
  if (h || m) return h + (m / 60);
  const mins = Number((txt.match(/(\d+(?:[.,]\d+)?)\s*min/) || [])[1]?.replace(',', '.')) || 0;
  return mins / 60;
};
const parseGrams = (raw) => Number((raw || '').replace(',', '.').match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
const formatMoney = (value, s) => s.currencyPosition === 'before' ? `${s.currencySymbol}${value.toFixed(2)}` : `${value.toFixed(2)} ${s.currencySymbol}`;

function getDataFromPage() {
  const text = document.body.innerText;
  const filamentMatch = text.match(/(filament|material)\s*(used)?\s*[:\-]?\s*(\d+[\.,]?\d*)\s*g/i) || text.match(/(\d+[\.,]?\d*)\s*g\s*(filament|material)/i);
  const timeMatch = text.match(/(print\s*time|duration)\s*[:\-]?\s*([\dhm\s]+)/i) || text.match(/(\d+\s*h(?:\s*\d+\s*m)?)/i);
  return {
    filamentGrams: parseGrams(filamentMatch?.[0]),
    printHours: parseHours(timeMatch?.[0]),
  };
}

function computeCost(d, s) {
  const filament = s.filaments.find((f) => f.id === s.selectedFilamentId) || s.filaments[0];
  if (!filament) return null;
  const pricePerGram = filament.spoolCost / filament.spoolWeightGrams;
  const wasted = d.filamentGrams * (1 + (s.wastePercent / 100));
  const failureAdjusted = wasted * (1 + (s.failureRatePercent / 100));
  const materialCost = failureAdjusted * pricePerGram;
  const machineHourly = s.printer.hourlyRateEnabled
    ? s.printer.hourlyRate
    : (s.printer.purchaseCost / s.printer.lifetimeHours) + s.parts.reduce((acc, p) => acc + (p.replacementCost / p.lifetimeHours), 0);
  const machineCost = d.printHours * machineHourly;
  const energyCost = s.energy.enabled ? ((s.energy.watts / 1000) * d.printHours * s.energy.kwhPrice) : 0;
  return { materialCost, machineCost, energyCost, total: materialCost + machineCost + energyCost + s.postProcessingCost, filament, d, pricePerGram };
}

function mountWidget(cost, settings) {
  let widget = document.querySelector('.mw-cost-widget');
  if (!widget) {
    widget = document.createElement('aside');
    widget.className = 'mw-cost-widget';
    const anchor = document.querySelector('main') || document.body.firstElementChild || document.body;
    anchor.prepend(widget);
  }
  if (!cost || !cost.d.filamentGrams || !cost.d.printHours) {
    widget.innerHTML = '<h4>Print Cost</h4><p>Could not detect MakerWorld print time/filament yet.</p>';
    return;
  }
  const runtimeWarn = cost.d.printHours > settings.printer.maxRuntimeHours ? `<p>⚠ Runtime exceeds max (${settings.printer.maxRuntimeHours}h)</p>` : '';
  widget.innerHTML = `
    <h4>🖨️ Print Cost</h4>
    <p>${cost.filament.name} • ${cost.pricePerGram.toFixed(3)}/g</p>
    <p>Filament: ${cost.d.filamentGrams.toFixed(1)}g • Time: ${cost.d.printHours.toFixed(2)}h</p>
    <p>Material: ${formatMoney(cost.materialCost, settings)}</p>
    <p>Machine: ${formatMoney(cost.machineCost, settings)}</p>
    <p>Energy: ${formatMoney(cost.energyCost, settings)}</p>
    <p>Post: ${formatMoney(settings.postProcessingCost, settings)}</p>
    ${runtimeWarn}
    <div class="mw-cost-total">${formatMoney(cost.total, settings)}</div>
  `;
}

async function refresh() {
  const { settings } = await chrome.storage.sync.get('settings');
  if (!settings) return;
  mountWidget(computeCost(getDataFromPage(), settings), settings);
}
refresh();
new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'sync' && changes.settings) refresh(); });
