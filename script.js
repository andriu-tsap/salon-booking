const SERVICES = [
  { id: "lam-b", group: "Brwi", name: "Laminacja brwi z henną", min: 60, price: 160 },
  { id: "henna", group: "Brwi", name: "Henna i regulacja brwi", min: 40, price: 90 },
  { id: "reg", group: "Brwi", name: "Regulacja brwi woskiem", min: 20, price: 50 },
  { id: "lift", group: "Rzęsy", name: "Lifting rzęs z farbką", min: 75, price: 180 },
  { id: "farb", group: "Rzęsy", name: "Farbowanie rzęs", min: 20, price: 45 },
  { id: "duo", group: "Pakiety", name: "Laminacja brwi + lifting rzęs", min: 120, price: 300 },
  { id: "slub", group: "Pakiety", name: "Pakiet ślubny z próbą", min: 150, price: 380 }
];
const STAFF = [
  { id: "any", name: "Dowolna", ini: "★", color: "#8C2F5A", bio: "" },
  { id: "ola", name: "Ola", ini: "O", color: "#B0607E", bio: "Założycielka studia. Specjalizuje się w laminacji brwi i pakietach ślubnych." },
  { id: "kasia", name: "Kasia", ini: "K", color: "#6B4F8C", bio: "Lifting rzęs i farbowanie. Szkoli inne stylistki od 2022 roku." },
  { id: "natalia", name: "Natalia", ini: "N", color: "#C08A5B", bio: "Henna pudrowa i regulacja. Najszybsze ręce w studiu." }
];
const DAY_SHORT = ["nd", "pn", "wt", "śr", "cz", "pt", "sb"];
const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

const state = { service: null, staff: "any", date: null, time: null, offset: 0 };
const $ = s => document.querySelector(s);
const zl = n => `${n} zł`;

/* deterministic pseudo-random availability so the demo looks realistic */
function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000; }
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

function radio(el, attr) {
  el.addEventListener("click", e => {
    const b = e.target.closest("[role=radio]");
    if (!b || b.disabled) return;
    state[attr] = b.dataset.v;
    if (attr === "date") state.time = null;
    if (attr === "service" || attr === "staff") state.time = null;
    render();
  });
  el.addEventListener("keydown", e => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
    const items = [...el.querySelectorAll("[role=radio]:not(:disabled)")];
    const i = items.indexOf(document.activeElement);
    const n = items[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
    n?.focus(); e.preventDefault();
  });
}

function renderServices() {
  $("#services").innerHTML = SERVICES.map(s => `
    <button type="button" class="opt" role="radio" aria-checked="${state.service === s.id}" data-v="${s.id}">
      <span>${s.name}</span><small>${s.group}, ${s.min} min</small><span class="p">${zl(s.price)}</span>
    </button>`).join("");
  $("#staff").innerHTML = STAFF.map(p => `
    <button type="button" class="chip" role="radio" aria-checked="${state.staff === p.id}" data-v="${p.id}" style="--c:${p.color}"><i>${p.ini}</i>${p.name}</button>`).join("");
}

function days() {
  const out = [], start = new Date(); start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 21; i++) { const d = new Date(start); d.setDate(start.getDate() + i); out.push(d); }
  return out;
}
function slotsFor(dateStr) {
  const d = parse(dateStr);
  const close = d.getDay() === 6 ? 15 * 60 : 19 * 60;
  const svc = SERVICES.find(s => s.id === state.service);
  const len = svc ? svc.min : 60;
  const rnd = seeded(dateStr + state.staff);
  const now = new Date(), isToday = key(now) === dateStr;
  const out = [];
  for (let m = 9 * 60; m + len <= close; m += 30) {
    const taken = rnd() < 0.42 || (isToday && m <= now.getHours() * 60 + now.getMinutes() + 60);
    out.push({ t: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`, taken });
  }
  return out;
}
function renderDays() {
  const all = days().slice(state.offset, state.offset + 7);
  $("#days").innerHTML = all.map(d => {
    const k = key(d), closed = d.getDay() === 0;
    return `<button type="button" class="day" role="radio" data-v="${k}" aria-checked="${state.date === k}" ${closed ? "disabled" : ""}
      aria-label="${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${closed ? ", nieczynne" : ""}">
      <small>${DAY_SHORT[d.getDay()]}</small><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></button>`;
  }).join("");
  $("#prev-days").disabled = state.offset === 0;
  $("#next-days").disabled = state.offset >= 14;
  if (!state.date) { $("#slots").innerHTML = `<p class="empty">Wybierz dzień, żeby zobaczyć wolne godziny.</p>`; return; }
  const sl = slotsFor(state.date);
  $("#slots").innerHTML = sl.every(s => s.taken)
    ? `<p class="empty">Ten dzień jest już zajęty. Sprawdź kolejny.</p>`
    : sl.map(s => `<button type="button" class="slot" role="radio" data-v="${s.t}" aria-checked="${state.time === s.t}" ${s.taken ? "disabled" : ""}>${s.t}</button>`).join("");
}
function renderSummary() {
  const svc = SERVICES.find(s => s.id === state.service);
  if (!svc) { $("#summary").hidden = true; return; }
  const first = $("#book").elements.first.checked;
  const price = first ? Math.round(svc.price * 0.9) : svc.price;
  const who = STAFF.find(p => p.id === state.staff).name;
  const d = state.date ? parse(state.date) : null;
  $("#summary").hidden = false;
  $("#summary").innerHTML = `
    <span>Zabieg</span><span class="sum">${svc.name}</span>
    <span>Specjalistka</span><span class="sum">${who}</span>
    <span>Termin</span><span class="sum">${d ? `${d.getDate()} ${MONTHS[d.getMonth()]}${state.time ? `, ${state.time}` : ""}` : "—"}</span>
    <span class="total">Do zapłaty w studiu</span><span class="sum total">${zl(price)}${first ? " (−10%)" : ""}</span>`;
}
function render() { renderServices(); renderDays(); renderSummary(); }

function go(step) {
  const err = $("#error"); err.textContent = "";
  if (step >= 2 && !state.service) { err.textContent = "Wybierz zabieg, żeby przejść dalej."; return; }
  if (step >= 3 && !(state.date && state.time)) { err.textContent = "Wybierz dzień i wolną godzinę."; return; }
  document.querySelectorAll(".panel").forEach(p => (p.hidden = p.dataset.panel != step));
  document.querySelectorAll(".steps li").forEach(li => {
    li.classList.toggle("on", li.dataset.step == step);
    li.classList.toggle("done", li.dataset.step < step);
  });
  document.querySelector(`[data-panel="${step}"] h2`).setAttribute("tabindex", "-1");
  document.querySelector(`[data-panel="${step}"] h2`).focus();
}
document.querySelectorAll("[data-next]").forEach(b => b.addEventListener("click", () => go(+b.dataset.next)));
$("#prev-days").addEventListener("click", () => { state.offset = Math.max(0, state.offset - 7); renderDays(); });
$("#next-days").addEventListener("click", () => { state.offset = Math.min(14, state.offset + 7); renderDays(); });
$("#book").elements.first.addEventListener("change", renderSummary);
radio($("#services"), "service"); radio($("#staff"), "staff"); radio($("#days"), "date"); radio($("#slots"), "time");

$("#book").addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, err = $("#error");
  const bad = [...f.querySelectorAll("[required]")].filter(i => !i.checkValidity());
  f.querySelectorAll("input").forEach(i => i.removeAttribute("aria-invalid"));
  if (bad.length) { bad.forEach(i => i.setAttribute("aria-invalid", "true")); err.textContent = "Podaj imię i nazwisko oraz poprawny numer telefonu."; bad[0].focus(); return; }
  const svc = SERVICES.find(s => s.id === state.service), d = parse(state.date);
  $("#done-text").textContent = `${f.elements.name.value.split(" ")[0]}, potwierdzamy wizytę: ${svc.name}, ${d.getDate()} ${MONTHS[d.getMonth()]} o ${state.time}. SMS z przypomnieniem wyślemy dzień wcześniej na numer ${f.elements.phone.value}.`;
  f.hidden = true; $(".steps").hidden = true;
  $("#done").hidden = false; $("#done").focus();
});
$("#again").addEventListener("click", () => {
  Object.assign(state, { service: null, staff: "any", date: null, time: null, offset: 0 });
  const f = $("#book"); f.reset(); f.hidden = false; $(".steps").hidden = false; $("#done").hidden = true;
  go(1); render();
});

/* price list + team */
const groups = [...new Set(SERVICES.map(s => s.group))];
$("#price-cols").innerHTML = groups.map(g => `<div><h3>${g}</h3><dl>${SERVICES.filter(s => s.group === g).map(s => `<dt>${s.name}</dt><dd>${zl(s.price)}</dd>`).join("")}</dl></div>`).join("");
$("#people").innerHTML = STAFF.slice(1).map(p => `<article class="person"><div class="av" style="--c:${p.color}" aria-hidden="true">${p.ini}</div><h3>${p.name}</h3><p>${p.bio}</p></article>`).join("");

render();
