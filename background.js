chrome.runtime.onInstalled.addListener(async () => {
  const { mwCostConfig } = await chrome.storage.sync.get("mwCostConfig");
  if (mwCostConfig) return;

  await chrome.storage.sync.set({
    mwCostConfig: {
      language: "auto",
      currency: "USD",
      currencyPosition: "before",
      wastePercent: 10,
      failurePercent: 5,
      selectedFilamentId: "",
      filaments: [
        {
          id: crypto.randomUUID(),
          name: "Generic PLA",
          material: "PLA",
          color: "Gray",
          spoolWeight: 1000,
          spoolCost: 22
        }
      ],
      printer: {
        name: "My Printer",
        maxRuntimeHours: 4000,
        printerCost: 450,
        energyWatts: 150,
        energyPricePerKwh: 0.2,
        postProcessingCost: 0,
        parts: [
          { id: crypto.randomUUID(), name: "Nozzle", cost: 12, lifetimeHours: 350 }
        ]
      }
    }
  });
});
