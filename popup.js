const locales = {
  en: { title: "MakerWorld Cost", filamentManager: "Filament Manager", activeFilament: "Active filament", addFilament: "+ Add filament", printerSettings: "Printer Settings", printerName: "Printer name", maxRuntime: "Max runtime (h)", printerCost: "Printer cost", printerLifetime: "Lifetime (h)", hourlyRate: "Hourly rate", useHourlyRate: "Use simple hourly rate", energyParts: "Energy & Parts", energyEnabled: "Enable energy cost", watts: "Power (W)", kwhPrice: "Price / kWh", parts: "Parts", extras: "Extra", waste: "Purge/Waste %", failureRate: "Failure rate %", postProcessing: "Post-process cost", currencySymbol: "Currency symbol", currencyPosition: "Position", before: "Before", after: "After", save: "Save" },
  pl: { title: "Koszt MakerWorld", filamentManager: "Manager filamentu", activeFilament: "Aktywny filament", addFilament: "+ Dodaj filament", printerSettings: "Ustawienia drukarki", printerName: "Nazwa drukarki", maxRuntime: "Maks. czas pracy (h)", printerCost: "Koszt drukarki", printerLifetime: "Żywotność (h)", hourlyRate: "Stawka godzinowa", useHourlyRate: "Użyj prostej stawki", energyParts: "Energia i części", energyEnabled: "Włącz koszt energii", watts: "Moc (W)", kwhPrice: "Cena / kWh", parts: "Części", extras: "Dodatkowe", waste: "Purge/Odpad %", failureRate: "Awaryjność %", postProcessing: "Koszt post-process", currencySymbol: "Symbol waluty", currencyPosition: "Pozycja", before: "Przed", after: "Po", save: "Zapisz" }
};
let settings;
const byId = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 10);

(async function init() {
  const { settings: s } = await chrome.storage.sync.get("settings");
  settings = s;
  renderLocaleOptions();
  renderAll();
})();
function renderLocaleOptions() { byId("locale").innerHTML = Object.keys(locales).map(l=>`<option ${settings.locale===l?'selected':''} value="${l}">${l.toUpperCase()}</option>`).join(""); }
function t(k){ return locales[settings.locale]?.[k] ?? locales.en[k] ?? k; }
function renderAll(){
  document.querySelectorAll("[data-i18n]").forEach((el)=>{ const k=el.dataset.i18n; if (el.tagName==='INPUT') el.placeholder=t(k); else el.textContent=t(k); });
  Object.entries(settings.printer).forEach(([k,v])=> byId(k) && (byId(k).type==="checkbox" ? byId(k).checked=!!v : byId(k).value=v));
  byId("energyEnabled").checked = settings.energy.enabled; byId("watts").value=settings.energy.watts; byId("kwhPrice").value=settings.energy.kwhPrice;
  ["wastePercent","failureRatePercent","postProcessingCost","currencySymbol","currencyPosition"].forEach(k => byId(k).value = settings[k]);
  renderFilaments(); renderParts();
}
function renderFilaments(){
  byId("selectedFilament").innerHTML = settings.filaments.map(f=>`<option value="${f.id}" ${settings.selectedFilamentId===f.id?'selected':''}>${f.name}</option>`).join("");
  const tpl = byId("filamentTpl").content.firstElementChild; const list = byId("filamentList"); list.innerHTML="";
  settings.filaments.forEach((f,idx)=>{const n=tpl.cloneNode(true); n.querySelectorAll("input").forEach(i=>{i.value=f[i.dataset.key]??""; i.oninput=(e)=>settings.filaments[idx][i.dataset.key]= i.type==='number'? Number(e.target.value):e.target.value;}); n.querySelector('[data-action="remove"]').onclick=()=>{settings.filaments.splice(idx,1); if(settings.selectedFilamentId===f.id && settings.filaments[0]) settings.selectedFilamentId=settings.filaments[0].id; renderFilaments();}; list.append(n);});
}
function renderParts(){ const tpl=byId("partTpl").content.firstElementChild; const list=byId("partsList"); list.innerHTML=""; settings.parts.forEach((p,idx)=>{const n=tpl.cloneNode(true); n.querySelectorAll("input").forEach(i=>{i.value=p[i.dataset.key]; i.oninput=(e)=>settings.parts[idx][i.dataset.key]=i.type==='number'?Number(e.target.value):e.target.value;}); list.append(n);}); }

byId("addFilament").onclick=()=>{settings.filaments.push({id:uid(),name:"New",material:"PLA",color:"Black",spoolWeightGrams:1000,spoolCost:20}); renderFilaments();};
byId("locale").onchange=(e)=>{settings.locale=e.target.value; renderAll();};
byId("selectedFilament").onchange=(e)=>settings.selectedFilamentId=e.target.value;
byId("saveBtn").onclick=async()=>{
  Object.keys(settings.printer).forEach(k=>{if(byId(k)) settings.printer[k]=byId(k).type==='checkbox'?byId(k).checked:Number.isFinite(Number(byId(k).value))?Number(byId(k).value):byId(k).value;});
  settings.energy.enabled = byId("energyEnabled").checked; settings.energy.watts=Number(byId("watts").value); settings.energy.kwhPrice=Number(byId("kwhPrice").value);
  ["wastePercent","failureRatePercent","postProcessingCost"].forEach(k=>settings[k]=Number(byId(k).value));
  settings.currencySymbol=byId("currencySymbol").value || "$"; settings.currencyPosition=byId("currencyPosition").value;
  await chrome.storage.sync.set({settings});
  byId("status").textContent = "Saved."; setTimeout(()=>byId("status").textContent="", 1200);
};
