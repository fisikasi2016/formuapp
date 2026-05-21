// =========================================================
    // DATOS (2 por grupo para ver aleatoriedad) + link de ayuda
    // =========================================================


    const BINARY_ORDER = [
      "Hidruro Metalikoak",
      "Oxido Metalikoak",
      "Hidruro Ez Metalikoak",
      "Anhidridoak (Oxido Ez Metalikoak)",
      "Gatz Bitarrak (M + EM)",
      "Gatz Bitarrak (EM + EM)"
    ];
    const TERNARY_ORDER = [
      "Hidroxidoak",
      "Oxoazidoak",
      "Gatz Hirutarrak"
    ];

    // =========================================================
    // DOM + ESTADO
    // =========================================================
    const numSel = document.getElementById("numQuestions");
    const diffSel = document.getElementById("difficulty");
    const exerciseList = document.getElementById("exerciseList");
    const scoreBox = document.getElementById("scoreBox");

    const binaryButtonsDiv = document.getElementById("binaryButtons");
    const ternaryButtonsDiv = document.getElementById("ternaryButtons");

    const btnFormulaIzena = document.getElementById("btn-formula-izena");
    const btnIzenaFormula = document.getElementById("btn-izena-formula");

    // ✅ NUEVO: toggle feedback inmediato + botón repetir fallos
    const instantFeedback = document.getElementById("instantFeedback");
    const repeatFailsBtn = document.getElementById("repeatFails");

    document.querySelectorAll(".btn-mode").forEach(btn => {
      btn.addEventListener("click", () => btn.classList.toggle("active"));
    });

    let current = { formulaToName: [], nameToFormula: [] };
    let lastFailed = { formulaToName: [], nameToFormula: [] };

    // =========================================================
    // UTILIDADES
    // =========================================================
    function normalizeName(name, kind){
      if(!name) return "";

      let s = name.toLowerCase();

      // quitar paréntesis y su contenido: (mono), (mon)
      s = s.replace(/\((mono|mon)\)/g, "");

      // normalizar espacios
      s = s.replace(/\s+/g, " ").trim();

      // hacer "mono" opcional en cualquier parte
      s = s.replace(/\bmono(?=[a-z])/g, "");

      // ✅ kobre/kupre equivalentes EXCEPTO en tradizionala
      if(kind !== "trad"){
        // cambia también dikobre, trikobre... y cualquier aparición
        s = s.replace(/kobre/g, "kupre");
      }

      return s;
    }


    function displayName(name){
      if(!name) return "";
      return name
        .replace(/\((mono|mon)\)/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function shuffle(arr){
      const a = [...arr];
      for(let i=a.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [a[i],a[j]]=[a[j],a[i]];
      }
      return a;
    }
    function distributeEvenly(total, k){
      const base = Math.floor(total / k);
      const rem  = total % k;
      const out = new Array(k).fill(base);
      for(let i=0;i<rem;i++) out[i] += 1;
      return out;
    }
    function pickRandomNNoRepeat(arr, n){
      const s = shuffle(arr);
      return s.slice(0, Math.min(n, s.length));
    }
    function pickWithWrap(arr, n){
      if(arr.length === 0) return [];
      const s = shuffle(arr);
      const out = [];
      for(let i=0;i<n;i++) out.push(s[i % s.length]);
      return out;
    }

    function resetField(fieldEl){
      fieldEl.querySelectorAll(".correct-hint,.helpLink").forEach(x => x.remove());
    }
    function resetInputState(input){
      input.classList.remove("ok","bad");
      const field = input.closest(".field");
      if(field) resetField(field);
    }
    function addHint(fieldEl, text){
      resetField(fieldEl);
      const cleanText = displayName(text);
      const hint = document.createElement("div");
      hint.className = "correct-hint";
      hint.textContent = cleanText;
      fieldEl.appendChild(hint);
    }
    function addHelpLink(fieldEl, url){
      const u = (url ?? "").toString().trim();
      if(!/^https?:\/\//i.test(u)) return;

      const a = document.createElement("a");
      a.className = "helpLink";
      a.href = u;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M10 15l5.5-3L10 9v6z" fill="currentColor"></path>
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2"></path>
        </svg>
        IKUSI LAGUNTZA (BIDEOA)
      `;
      fieldEl.appendChild(a);
    }

    function chooseRandomName(item){
      const options = [
        { key:"trad",  label:"Trad",  text:item.trad },
        { key:"stock", label:"Stock", text:item.stock },
        { key:"sist",  label:"Sist",  text:item.sist }
      ].filter(o => normalizeName(o.text) && normalizeName(o.text) !== "ez da izendatzen");

      if(options.length === 0){
        return { kindKey:"trad", kindLabel:"Trad", text:"Ez da izendatzen" };
      }
      const chosen = options[Math.floor(Math.random()*options.length)];
      return { kindKey: chosen.key, kindLabel: chosen.label, text: chosen.text };
    }

    // ✅ NUEVO: checks para feedback inmediato
    function isCorrectName(userValue, correctValue, kind){
      const user = normalizeName(userValue, kind);

      // "Ez da izendatzen" / "-"
      if(normalizeName(correctValue, kind) === "ez da izendatzen"){
        return (user === "ez da izendatzen" || user === "-");
      }

      if(!user) return false;

      // ✅ Permite respuestas alternativas tipo "Kupre ... / Kobre ..."
      const targets = (correctValue ?? "")
        .toString()
        .split("/")
        .map(t => normalizeName(t, kind))
        .filter(Boolean);

      // si no había "/", cae al valor completo
      if(targets.length === 0){
        targets.push(normalizeName(correctValue, kind));
      }

      return targets.includes(user);
    }

    function isCorrectFormula(userValue, correctFormula){
      const user = normalizeName(userValue);
      const target = normalizeName(correctFormula);
      return (user && user === target);
    }
    function instantCheckInput(input, correctValue, kind){
      if(!instantFeedback.checked) return;
      const raw = (input.value ?? "").trim();
      if(raw === ""){
        input.classList.remove("ok","bad");
        return;
      }
      const ok = (kind === "formula")
      ? isCorrectFormula(raw, correctValue)
      : isCorrectName(raw, correctValue, input.dataset.kind);


      input.classList.remove("ok","bad");
      input.classList.add(ok ? "ok" : "bad");
    }

    // =========================================================
    // BOTONES DE GRUPO
    // =========================================================
    function makeGroupButton(g){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-main";
      b.textContent = g;
      b.dataset.groupName = g;
      b.addEventListener("click", () => b.classList.toggle("active"));
      return b;
    }

    function renderGroupButtons(){
      binaryButtonsDiv.innerHTML = "";
      ternaryButtonsDiv.innerHTML = "";

      const loaded = Object.keys(GROUPS);
      const has = new Set(loaded);

      const bin = BINARY_ORDER.filter(x => has.has(x));
      const ter = TERNARY_ORDER.filter(x => has.has(x));
      const extras = loaded
        .filter(x => !BINARY_ORDER.includes(x) && !TERNARY_ORDER.includes(x))
        .sort((a,b)=>a.localeCompare(b));

      bin.forEach(g => binaryButtonsDiv.appendChild(makeGroupButton(g)));
      ter.forEach(g => ternaryButtonsDiv.appendChild(makeGroupButton(g)));
      extras.forEach(g => ternaryButtonsDiv.appendChild(makeGroupButton(g)));
    }
    renderGroupButtons();

    function getSelectedGroups(){
      return Array.from(document.querySelectorAll(".btn-main.active")).map(b => b.dataset.groupName);
    }

    // =========================================================
    // BUILD SETS
    // =========================================================
    function buildSetForMode(mode, total, selectedGroups){
      const k = selectedGroups.length;
      const counts = distributeEvenly(total, k);

      let collected = [];
      selectedGroups.forEach((gName, idx) => {
        const dataset = GROUPS[gName] || [];
        const need = counts[idx];

        const picked = dataset.length >= need
          ? pickRandomNNoRepeat(dataset, need)
          : pickWithWrap(dataset, need);

        collected = collected.concat(picked.map(item => ({...item, groupName:gName})));
      });

      collected = shuffle(collected);

      if(mode === "nameToFormula"){
        collected = collected.map(item => ({ ...item, shown: chooseRandomName(item) }));
      }
      return collected;
    }

    // =========================================================
    // SCORE / NOTA
    // =========================================================
    function thresholdsFor(difficulty){
      if(difficulty === "erreza") return { pass: 50, oso: 70, bikain: 90 };
      return { pass: 75, oso: 90, bikain: 95 };
    }
    function labelForPercent(pct, difficulty){
      const t = thresholdsFor(difficulty);
      if(pct >= t.bikain) return "Bikain";
      if(pct >= t.oso) return "Oso ondo";
      if(pct >= t.pass) return "Gaindituta";
      return "Gainditu Gabe";
    }
    function gradeBadgeClass(pct, difficulty){
      const t = thresholdsFor(difficulty);
      if(pct >= t.oso) return "good";
      if(pct >= t.pass) return "mid";
      return "bad";
    }
    function computeMaxPoints(){
      let max = 0;
      document.querySelectorAll(".exercise").forEach(row => {
        const type = row.dataset.exerciseType;
        if(type === "nameToFormula") max += 1;
        if(type === "formulaToName") max += 1;
      });
      return max;
    }

    // =========================================================
    // SORTU BERRIA
    // =========================================================
    document.getElementById("sortu").addEventListener("click", () => {
      scoreBox.classList.remove("show");
      scoreBox.innerHTML = "";

      // ✅ NUEVO: reset de fallos y ocultar botón
      repeatFailsBtn.style.display = "none";
      lastFailed = { formulaToName: [], nameToFormula: [] };

      const selectedGroups = getSelectedGroups();
      const wantA = btnFormulaIzena.classList.contains("active");
      const wantB = btnIzenaFormula.classList.contains("active");
      const n = Math.max(1, Math.min(10, parseInt(numSel.value, 10) || 5));

      exerciseList.innerHTML = "";
      current.formulaToName = [];
      current.nameToFormula = [];

      if(selectedGroups.length === 0 || (!wantA && !wantB)){
        exerciseList.innerHTML = `
          <p class="note" style="color:#b45309;">
            Aukeratu gutxienez talde bat eta gutxienez modu bat.
          </p>`;
        return;
      }

      if(wantA) current.formulaToName = buildSetForMode("formulaToName", n, selectedGroups);
      if(wantB) current.nameToFormula  = buildSetForMode("nameToFormula",  n, selectedGroups);

      if(wantA){
        const title = document.createElement("div");
        title.className = "blockTitle";
        title.textContent = `Formulatik Izena (${current.formulaToName.length})`;
        exerciseList.appendChild(title);

        current.formulaToName.forEach(item => {
          const div = document.createElement("div");
          div.className = "exercise";
          div.dataset.exerciseType = "formulaToName";
          div.dataset.formula = item.formula;

          div.innerHTML = `
            <div class="chip">${item.formula}</div>

            <div class="field">
              <div class="label">Sistematikoa</div>
              <input class="answer" type="text" data-kind="sist" placeholder="Idatzi hemen..." />
            </div>

            <div class="field">
              <div class="label">Stock</div>
              <input class="answer" type="text" data-kind="stock" placeholder="Idatzi hemen..." />
            </div>

            <div class="field">
              <div class="label">Tradizionala</div>
              <input class="answer" type="text" data-kind="trad" placeholder="Idatzi hemen..." />
            </div>
          `;

          div.querySelectorAll("input.answer").forEach(inp => {
            inp.addEventListener("input", () => resetInputState(inp));
            // ✅ NUEVO: feedback inmediato sin pistas
            inp.addEventListener("blur", () => {
              const kind = inp.dataset.kind; // sist/stock/trad
              instantCheckInput(inp, item[kind], "name");
            });
          });

          exerciseList.appendChild(div);
        });
      }

      if(wantB){
        const title = document.createElement("div");
        title.className = "blockTitle";
        title.textContent = `Izenetik formulara (${current.nameToFormula.length})`;
        exerciseList.appendChild(title);

        current.nameToFormula.forEach(item => {
          const div = document.createElement("div");
          div.className = "exercise is-name-to-formula";
          div.dataset.exerciseType = "nameToFormula";
          div.dataset.formula = item.formula;

          div.innerHTML = `
            <div>
              <div class="chip nameBox">${displayName(item.shown.text)}</div>
              <div class="meta" data-meta>Izena mota: ${item.shown.kindLabel}</div>
            </div>

            <div class="field">
              <div class="label">Formula</div>
              <input class="answer" type="text" data-kind="formula" placeholder="Adib.: FeH2" />
            </div>
          `;

          div.querySelectorAll("input.answer").forEach(inp => {
            inp.addEventListener("input", () => resetInputState(inp));
            // ✅ NUEVO: feedback inmediato sin pistas
            inp.addEventListener("blur", () => {
              instantCheckInput(inp, item.formula, "formula");
            });
          });

          exerciseList.appendChild(div);
        });
      }
    });

    // =========================================================
    // KONPROBATU
    // =========================================================
    document.getElementById("konprobatu").addEventListener("click", () => {
      const hasAny = current.formulaToName.length > 0 || current.nameToFormula.length > 0;
      if(!hasAny){
        exerciseList.innerHTML = `
          <p class="note" style="color:#b91c1c;">
            Ez dago ariketarik. Sakatu <b>Sortu berria</b> lehenengo.
          </p>`;
        return;
      }

      // ✅ NUEVO: reset fallos para este intento
      lastFailed = { formulaToName: [], nameToFormula: [] };
      repeatFailsBtn.style.display = "none";

      const difficulty = diffSel.value;
      let earned = 0;
      const max = computeMaxPoints();

      let totalInputs = 0;
      let okInputs = 0;

      document.querySelectorAll(".exercise").forEach(row => {
        const type = row.dataset.exerciseType;
        const formula = row.dataset.formula;

        if(type === "formulaToName"){
          const correct = current.formulaToName.find(x => x.formula === formula);
          if(!correct) return;

          const inputs = Array.from(row.querySelectorAll("input.answer"));
          const results = [];

          inputs.forEach(input => {
            const kind = input.dataset.kind; // sist/stock/trad
            resetInputState(input);

            totalInputs += 1;

            const ok = isCorrectName(input.value, correct[kind], kind);


            results.push(ok);

            const field = input.closest(".field");

            if(ok){
              okInputs += 1;
              input.classList.add("ok");
            }else{
              input.classList.add("bad");
              addHint(field, `ZUZENA: ${correct[kind]}`);
              addHelpLink(field, correct.link);
            }
          });

          // ✅ NUEVO: si el ejercicio tuvo algún fallo, guardarlo
          if(results.some(r => !r)) lastFailed.formulaToName.push(correct);

          if(difficulty === "zaila"){
            if(results.every(Boolean)) earned += 1;
          }else{
            earned += results.filter(Boolean).length * (1/3);
          }
        }

        if(type === "nameToFormula"){
          const correct = current.nameToFormula.find(x => x.formula === formula);
          if(!correct) return;

          const input = row.querySelector('input.answer[data-kind="formula"]');
          if(!input) return;

          resetInputState(input);
          totalInputs += 1;

          const meta = row.querySelector("[data-meta]");
          if(meta) meta.classList.add("show");

          const user = normalizeName(input.value);
          const target = normalizeName(correct.formula);
          const ok = (user && user === target);

          const field = input.closest(".field");

          if(ok){
            okInputs += 1;
            input.classList.add("ok");
            addHint(field, `ONDO! (${correct.shown.kindLabel})`);
            earned += 1;
          }else{
            input.classList.add("bad");
            addHint(field, `ZUZENA (${correct.shown.kindLabel}): ${correct.formula}`);
            addHelpLink(field, correct.link);

            // ✅ NUEVO: guardar fallo
            lastFailed.nameToFormula.push(correct);
          }
        }
      });

      const earnedRounded = Math.round(earned * 100) / 100;
      const maxRounded = Math.round(max * 100) / 100;

      const pct = (maxRounded > 0) ? (earned / maxRounded) * 100 : 0;
      const pctRounded = Math.round(pct * 10) / 10;

      const grade = labelForPercent(pctRounded, difficulty);
      const badgeClass = gradeBadgeClass(pctRounded, difficulty);
      const t = thresholdsFor(difficulty);

      const r = 56;
      const circ = 2 * Math.PI * r;
      const offset = circ * (1 - pctRounded/100);

      const inputPct = totalInputs ? Math.round((okInputs/totalInputs)*1000)/10 : 0;

      scoreBox.classList.add("show");
      scoreBox.innerHTML = `
        <div class="scoreGrid">
          <div>
            <div class="scoreHeader">
              <div>
                <div style="font-size:18px; font-weight:1000;">
                  PUNTUAZIOA: <span style="color:#111827;">${earnedRounded} / ${maxRounded}</span>
                </div>
                <div style="margin-top:4px; color:#6b7280; font-weight:900;">
                  Input-ak zuzen: <b>${okInputs}/${totalInputs}</b> (${inputPct}%)
                </div>
              </div>
              <div class="badge ${badgeClass}">
                <b>${pctRounded}%</b> · ${grade}
              </div>
            </div>

            <div class="bar" aria-label="porcentaje">
              <div style="width:${pctRounded}%"></div>
            </div>

            <!--div style="margin-top:10px; font-size:13px; color:#374151; font-weight:900;">
              <b>Irizpideak (${difficulty}):</b>
              Gaindituta ≥ ${t.pass}% · Oso ondo ≥ ${t.oso}% · Bikain ≥ ${t.bikain}%
              ${difficulty === "zaila" ? " · (Formula→Izena: 1 puntu bakarrik 3ak ondo badaude)" : ""}
            </div-->
          </div>

          <div class="ringWrap">
            <svg class="ring" viewBox="0 0 160 160" role="img" aria-label="score ring">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#dc2626"></stop>
                  <stop offset="0.55" stop-color="#f59e0b"></stop>
                  <stop offset="1" stop-color="#16a34a"></stop>
                </linearGradient>
              </defs>
              <circle cx="80" cy="80" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="14"></circle>
              <circle cx="80" cy="80" r="${r}" fill="none" stroke="url(#g)" stroke-width="14"
                stroke-linecap="round"
                transform="rotate(-90 80 80)"
                stroke-dasharray="${circ.toFixed(1)}"
                stroke-dashoffset="${offset.toFixed(1)}"></circle>
              <text x="80" y="78" text-anchor="middle" font-size="28" fill="#111827" font-weight="1000">${pctRounded}%</text>
              <text x="80" y="102" text-anchor="middle" font-size="12" fill="#6b7280" font-weight="900">EMAITZA</text>
            </svg>
          </div>
        </div>
      `;

      // ✅ NUEVO: mostrar botón repetir fallos si hubo alguno
      const failedCount = lastFailed.formulaToName.length + lastFailed.nameToFormula.length;
      repeatFailsBtn.style.display = failedCount > 0 ? "inline-flex" : "none";
    });

    // =========================================================
    // ✅ NUEVO: REPETIR FALLOS
    // =========================================================
    repeatFailsBtn.addEventListener("click", () => {
      scoreBox.classList.remove("show");
      scoreBox.innerHTML = "";
      exerciseList.innerHTML = "";
      repeatFailsBtn.style.display = "none";

      current.formulaToName = lastFailed.formulaToName.map(x => ({...x}));
      current.nameToFormula = lastFailed.nameToFormula.map(x => ({...x}));

      if(current.formulaToName.length){
        const title = document.createElement("div");
        title.className = "blockTitle";
        title.textContent = `Formulatik Izena (${current.formulaToName.length})`;
        exerciseList.appendChild(title);

        current.formulaToName.forEach(item => {
          const div = document.createElement("div");
          div.className = "exercise";
          div.dataset.exerciseType = "formulaToName";
          div.dataset.formula = item.formula;

          div.innerHTML = `
            <div class="chip">${item.formula}</div>

            <div class="field">
              <div class="label">Sistematikoa</div>
              <input class="answer" type="text" data-kind="sist" placeholder="Idatzi hemen..." />
            </div>

            <div class="field">
              <div class="label">Stock</div>
              <input class="answer" type="text" data-kind="stock" placeholder="Idatzi hemen..." />
            </div>

            <div class="field">
              <div class="label">Tradizionala</div>
              <input class="answer" type="text" data-kind="trad" placeholder="Idatzi hemen..." />
            </div>
          `;

          div.querySelectorAll("input.answer").forEach(inp => {
            inp.addEventListener("input", () => resetInputState(inp));
            inp.addEventListener("blur", () => {
              const kind = inp.dataset.kind;
              instantCheckInput(inp, item[kind], "name");
            });
          });

          exerciseList.appendChild(div);
        });
      }

      if(current.nameToFormula.length){
        const title = document.createElement("div");
        title.className = "blockTitle";
        title.textContent = `Izenetik formulara (${current.nameToFormula.length})`;
        exerciseList.appendChild(title);

        current.nameToFormula = current.nameToFormula.map(item => ({...item, shown: chooseRandomName(item)}));

        current.nameToFormula.forEach(item => {
          const div = document.createElement("div");
          div.className = "exercise is-name-to-formula";
          div.dataset.exerciseType = "nameToFormula";
          div.dataset.formula = item.formula;

          div.innerHTML = `
            <div>
              <div class="chip nameBox">${displayName(item.shown.text)}</div>
              <div class="meta" data-meta>Izena mota: ${item.shown.kindLabel}</div>
            </div>

            <div class="field">
              <div class="label">Formula</div>
              <input class="answer" type="text" data-kind="formula" placeholder="Adib.: FeH2" />
            </div>
          `;

          div.querySelectorAll("input.answer").forEach(inp => {
            inp.addEventListener("input", () => resetInputState(inp));
            inp.addEventListener("blur", () => instantCheckInput(inp, item.formula, "formula"));
          });

          exerciseList.appendChild(div);
        });
      }

      lastFailed = { formulaToName: [], nameToFormula: [] };

      // Registrar el service worker
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("./service-worker.js")
            .then(() => console.log("Service Worker correctamente registrado"))
            .catch((error) => console.error("Error al registrar el Service Worker:", error));
        });
      }
    });

    //AZTERKETA DESKARGATU

    const downloadTestBtn = document.getElementById("downloadTest");

    downloadTestBtn.addEventListener("click", () => {
      const hasAny =
        current.formulaToName.length > 0 ||
        current.nameToFormula.length > 0;

      if (!hasAny) {
        alert("Lehenengo froga bat sortu behar duzu.");
        return;
      }

      generarPDF(false); // Froga
      generarPDF(true);  // Froga Emaitzekin
    });

    function generarPDF(conEmaitzak) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      let y = 20;
      let counter = 1;

      doc.setFontSize(18);
      doc.text(
        conEmaitzak ? "FORMULAZIO FROGA - EMAITZEKIN" : "FORMULAZIO FROGA",
        105,
        y,
        { align: "center" }
      );

      y += 15;

      doc.setFontSize(12);
      doc.text("Izena: ________________________________", 20, y);

      y += 15;

      // FORMULATIK IZENARA
      current.formulaToName.forEach((item) => {
        if (!conEmaitzak) {
          doc.setFontSize(14);
          doc.text(`${counter}. ${item.formula}`, 20, y);
          y += 12;
        } else {
          doc.setFontSize(10);
          doc.text(`${counter}. ${item.formula}`, 20, y);

          y += 6;
          doc.setFontSize(8);
          doc.text(`Sistematikoa: ${displayName(item.sist)}`, 25, y);
          y += 5;
          doc.text(`Stock: ${displayName(item.stock)}`, 25, y);
          y += 5;
          doc.text(`Tradizionala: ${displayName(item.trad)}`, 25, y);
          y += 9;
        }

        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        counter++;
      });

      // IZENETIK FORMULARARA
      current.nameToFormula.forEach((item) => {
        const enunciado = displayName(item.shown.text);

        if (!conEmaitzak) {
          doc.setFontSize(14);
          doc.text(`${counter}. ${enunciado}`, 20, y);
          y += 12;
        } else {
          doc.setFontSize(10);
          doc.text(`${counter}. ${enunciado}`, 20, y);

          y += 6;
          doc.setFontSize(8);
          doc.text(`Emaitza: ${item.formula}`, 25, y);
          y += 9;
        }

        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        counter++;
      });

      doc.save(conEmaitzak ? "Froga Emaitzekin.pdf" : "Froga.pdf");
    }


//PWA deskargatu

    let deferredPrompt = null;
    const installBtn = document.getElementById("installBtn");

    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) {
        alert("La instalación no está disponible ahora mismo en este navegador.");
        return;
      }

      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;
      console.log("Resultado instalación:", outcome);

      deferredPrompt = null;

      if (outcome === "accepted") {
        installBtn.textContent = "✅ App instalada";
        installBtn.disabled = true;
      }
    });

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.disabled = false;
      installBtn.textContent = "Aplikazio Instalatu";
    });

    window.addEventListener("appinstalled", () => {
      console.log("App instalada");
      deferredPrompt = null;
      installBtn.textContent = "✅ App instalada";
      installBtn.disabled = true;
    });
