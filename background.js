const DEFAULT_SETTINGS = {
  locale: "en",
  currencySymbol: "$",
  currencyPosition: "before",
  selectedFilamentId: "",
  filaments: [
    {
      id: "default-pla",
      name: "Generic PLA",
      material: "PLA",
      color: "Gray",
      spoolWeightGrams: 1000,
      spoolCost: 24,
    },
  ],
  printer: {
    name: "My Printer",
    purchaseCost: 500,
    lifetimeHours: 3000,
    maxRuntimeHours: 8,
    hourlyRateEnabled: false,
    hourlyRate: 0,
  },
  parts: [
    { id: "nozzle", name: "Nozzle", replacementCost: 15, lifetimeHours: 250 },
    { id: "hotend", name: "Hotend", replacementCost: 35, lifetimeHours: 800 },
    { id: "belts", name: "Belts", replacementCost: 20, lifetimeHours: 1000 },
  ],
  wastePercent: 10,
  failureRatePercent: 5,
  postProcessingCost: 0,
  energy: {
    enabled: true,
    watts: 120,
    kwhPrice: 0.2,
  },
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get("settings");
  if (!current.settings) {
    const defaults = structuredClone(DEFAULT_SETTINGS);
    defaults.selectedFilamentId = defaults.filaments[0].id;
    await chrome.storage.sync.set({ settings: defaults });
    return;
  }

  const merged = {
    ...DEFAULT_SETTINGS,
    ...current.settings,
    printer: { ...DEFAULT_SETTINGS.printer, ...(current.settings.printer || {}) },
    energy: { ...DEFAULT_SETTINGS.energy, ...(current.settings.energy || {}) },
    parts: Array.isArray(current.settings.parts) && current.settings.parts.length
      ? current.settings.parts
      : DEFAULT_SETTINGS.parts,
    filaments: Array.isArray(current.settings.filaments) && current.settings.filaments.length
      ? current.settings.filaments
      : DEFAULT_SETTINGS.filaments,
  };

  if (!merged.selectedFilamentId && merged.filaments.length) {
    merged.selectedFilamentId = merged.filaments[0].id;
  }

  await chrome.storage.sync.set({ settings: merged });
});
