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
    const ION_ORDER = [
      "Ioiak - Katioiak",
      "Ioiak - Anioiak"
    ];

    const TERNARY_ORDER = [
      "Hidroxidoak",
      "Oxoazidoak",
      "Gatz Hirutarrak",
      "Gatz Hirutar Azidoak"
    ];

    const BI_CENTRAL_OXO_FORMULAS = new Set([
      "H2Cr2O7", "H2S2O5", "H2S2O7",
      "H4P2O3", "H4P2O5", "H4P2O7",
      "H4As2O3", "H4As2O5", "H4As2O7",
      "H4Sb2O3", "H4Sb2O5", "H4Sb2O7"
    ]);

    // =========================================================
    // DOM + ESTADO
    // =========================================================
    const numSel = document.getElementById("numQuestions");
    const exerciseList = document.getElementById("exerciseList");
    const scoreBox = document.getElementById("scoreBox");

    const ionButtonsDiv = document.getElementById("ionButtons");
    const binaryButtonsDiv = document.getElementById("binaryButtons");
    const ternaryButtonsDiv = document.getElementById("ternaryButtons");

    const btnFormulaIzena = document.getElementById("btn-formula-izena");
    const btnIzenaFormula = document.getElementById("btn-izena-formula");
    const nomenclatureButtons = Array.from(document.querySelectorAll(".btn-nomenclature"));
    const oxoTypePanel = document.getElementById("oxoTypePanel");
    const oxoTypeButtons = Array.from(document.querySelectorAll(".btn-oxo-type"));

    // ✅ NUEVO: toggle feedback inmediato + botón repetir fallos
    const instantFeedback = document.getElementById("instantFeedback");
    const repeatFailsBtn = document.getElementById("repeatFails");
    const actionsPanel = document.getElementById("actionsPanel");

    const optionsToggle = document.getElementById("optionsToggle");
    const optionsPanel = document.getElementById("optionsPanel");

    function setOptionsPanel(open){
      optionsPanel.hidden = !open;
      optionsToggle.setAttribute("aria-expanded", String(open));
      optionsToggle.textContent = open ? "Aukeren panela ▲" : "Aukeren panela ▼";
    }

    setOptionsPanel(false);

    optionsToggle.addEventListener("click", () => {
      setOptionsPanel(optionsPanel.hidden);
    });

    document.querySelectorAll(".btn-mode").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("active");
        updateActionsVisibility();
      });
    });

    nomenclatureButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("active");
        updateActionsVisibility();
      });
    });

    oxoTypeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        oxoTypeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        updateActionsVisibility();
      });
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

    const NOMENCLATURE_LABELS = {
      sist: "Sistematikoa",
      stock: "Stock",
      trad: "Tradizionala",
      ion: "Izena"
    };

    function getSelectedNomenclatures(){
      return nomenclatureButtons
        .filter(btn => btn.classList.contains("active"))
        .map(btn => btn.dataset.nomenclature);
    }

    function getNomenclaturesForItem(item, selectedKinds = getSelectedNomenclatures()){
      if(Array.isArray(item.nomenclatures) && item.nomenclatures.includes("ion")){
        return ["ion"];
      }

      if(item.groupName === "Hidruro Ez Metalikoak" || item.groupName === "Oxoazidoak"){
        return ["sist", "trad"];
      }

      if(Array.isArray(item.nomenclatures)){
        return item.nomenclatures.filter(kind => selectedKinds.includes(kind));
      }

      return selectedKinds;
    }

    function availableNameOptions(item, allowedKinds = getSelectedNomenclatures()){
      const effectiveKinds = getNomenclaturesForItem(item, allowedKinds);

      return effectiveKinds
        .map(key => ({
          key,
          label: NOMENCLATURE_LABELS[key],
          text: item[key]
        }))
        .filter(o => normalizeName(o.text) && normalizeName(o.text) !== "ez da izendatzen");
    }

    function chooseRandomName(item, allowedKinds = getSelectedNomenclatures()){
      const options = availableNameOptions(item, allowedKinds);

      if(options.length === 0){
        return null;
      }

      const chosen = options[Math.floor(Math.random()*options.length)];
      return {
        kindKey: chosen.key,
        kindLabel: chosen.label,
        text: chosen.text
      };
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

    function normalizeFormula(value){
      if(!value) return "";

      let s = value
        .toString()
        .trim()
        .replace(/\s+/g, "")
        .replace(/[−–]/g, "-")
        .replace(/\^/g, "");

      // Onartu (NO3)-, (SO4)-2, etab.
      s = s.replace(/^\((.+)\)([+-]\d*|\d*[+-])$/, "$1$2");

      // Onartu Ca+2 / O-2 eta Ca2+ / O2-
      s = s.replace(/([+-])(\d+)$/, "$2$1");

      return s.toLowerCase();
    }

    function isCorrectFormula(userValue, correctFormula){
      const user = normalizeFormula(userValue);
      const target = normalizeFormula(correctFormula);
      return (user && user === target);
    }

    function formulaText(formula){
      return (formula ?? "").toString().replace(/\^/g, "");
    }

    function formatFormulaHTML(formula){
      const raw = (formula ?? "").toString();
      const safe = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const parts = safe.split("^");
      const base = parts[0].replace(/(\d+)/g, "<sub>$1</sub>");

      if(parts.length === 1) return base;

      const charge = parts.slice(1).join("^").replace(/-/g, "−");
      return `${base}<sup>${charge}</sup>`;
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

    function checkSingleInput(input, correctValue, kind){
      resetInputState(input);

      const field = input.closest(".field");
      let ok;

      if(kind === "formula"){
        ok = isCorrectFormula(input.value, correctValue);
      }else{
        ok = isCorrectName(input.value, correctValue, input.dataset.kind);
      }

      input.classList.add(ok ? "ok" : "bad");

      if(ok){
        addHint(field, "ONDO!");
      }else{
        addHint(field, `ZUZENA: ${correctValue}`);
      }
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
      b.addEventListener("click", () => {
        b.classList.toggle("active");

        if(g === "Oxoazidoak" && oxoTypePanel){
          const active = b.classList.contains("active");
          oxoTypePanel.hidden = !active;

          if(!active){
            oxoTypeButtons.forEach(x => x.classList.remove("active"));
          }
        }

        updateActionsVisibility();
      });
      return b;
    }

    function renderGroupButtons(){
      ionButtonsDiv.innerHTML = "";
      binaryButtonsDiv.innerHTML = "";
      ternaryButtonsDiv.innerHTML = "";

      const loaded = Object.keys(GROUPS);
      const has = new Set(loaded);

      const ions = ION_ORDER.filter(x => has.has(x));
      const bin = BINARY_ORDER.filter(x => has.has(x));
      const ter = TERNARY_ORDER.filter(x => has.has(x));
      const extras = loaded
        .filter(x => !ION_ORDER.includes(x) && !BINARY_ORDER.includes(x) && !TERNARY_ORDER.includes(x))
        .sort((a,b)=>a.localeCompare(b));

      ions.forEach(g => ionButtonsDiv.appendChild(makeGroupButton(g)));
      bin.forEach(g => binaryButtonsDiv.appendChild(makeGroupButton(g)));
      ter.forEach(g => ternaryButtonsDiv.appendChild(makeGroupButton(g)));
      extras.forEach(g => ternaryButtonsDiv.appendChild(makeGroupButton(g)));
    }
    renderGroupButtons();

    // =========================================================
    // SUBMENÚS COLAPSABLES
    // =========================================================
    function setupSubPanel(toggleId, panelId, label){
      const btn = document.getElementById(toggleId);
      const panel = document.getElementById(panelId);

      if(!btn || !panel) return;

      btn.addEventListener("click", () => {
        const open = panel.hidden;

        panel.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        btn.textContent = open ? `${label} ▲` : `${label} ▼`;
      });
    }

    setupSubPanel("toggleCompounds", "compoundsPanel", "Konposatuak");
    setupSubPanel("toggleIons", "ionsPanel", "Ioiak");
    setupSubPanel("toggleBinary", "binaryPanel", "Konposatu bitarrak");
    setupSubPanel("toggleTernary", "ternaryPanel", "Konposatu hirutarrak");
    setupSubPanel("toggleExam", "examPanel", "Frogaren ezaugarriak");

    function getSelectedGroups(){
      return Array.from(document.querySelectorAll(".btn-main.active")).map(b => b.dataset.groupName);
    }

    function getSelectedOxoType(){
      const active = oxoTypeButtons.find(b => b.classList.contains("active"));
      return active ? active.dataset.oxoType : null;
    }

    function isIonGroup(groupName){
      return ION_ORDER.includes(groupName);
    }

    function updateActionsVisibility(){
      const selectedGroups = getSelectedGroups();
      const hasGroups = selectedGroups.length > 0;

      const hasModes =
        btnFormulaIzena.classList.contains("active") ||
        btnIzenaFormula.classList.contains("active");

      const hasNomenclatures = getSelectedNomenclatures().length > 0;
      const hasIonGroup = selectedGroups.some(isIonGroup);

      const oxoSelected = selectedGroups.includes("Oxoazidoak");
      const oxoReady = !oxoSelected || !!getSelectedOxoType();

      actionsPanel.hidden = !(hasGroups && hasModes && (hasNomenclatures || hasIonGroup) && oxoReady);
    }

    // =========================================================
    // BUILD SETS
    // =========================================================
    function buildSetForMode(mode, total, selectedGroups){
      const allowedKinds = getSelectedNomenclatures();
      const k = selectedGroups.length;
      const counts = distributeEvenly(total, k);

      let collected = [];
      selectedGroups.forEach((gName, idx) => {
        let dataset = (GROUPS[gName] || []).map(item => ({...item, groupName:gName}));

        if(gName === "Oxoazidoak"){
          const oxoType = getSelectedOxoType();
          if(oxoType === "arruntak"){
            dataset = dataset.filter(item => !BI_CENTRAL_OXO_FORMULAS.has(item.formula));
          }else if(oxoType === "bi"){
            dataset = dataset.filter(item => BI_CENTRAL_OXO_FORMULAS.has(item.formula));
          }else if(oxoType !== "biak"){
            dataset = [];
          }
        }

        dataset = dataset.filter(item => availableNameOptions(item, allowedKinds).length > 0);

        const need = counts[idx];
        const picked = dataset.length >= need
          ? pickRandomNNoRepeat(dataset, need)
          : pickWithWrap(dataset, need);

        collected = collected.concat(picked);
      });

      collected = shuffle(collected);

      if(mode === "nameToFormula"){
        collected = collected
          .map(item => ({ ...item, shown: chooseRandomName(item, allowedKinds) }))
          .filter(item => item.shown);
      }
      return collected;
    }

    function renderNameFields(item, withButtons = true){
      const allowedKinds = getNomenclaturesForItem(item);

      return allowedKinds.map(kind => {
        const label = NOMENCLATURE_LABELS[kind];
        const button = withButtons ? '<button class="checkOne" type="button">✓</button>' : '';

        return `
          <div class="field">
            <div class="label">${label}</div>
            <div class="answerRow">
              <input class="answer" type="text" data-kind="${kind}" placeholder="Idatzi hemen..." />
              ${button}
            </div>
          </div>
        `;
      }).join("");
    }

    // =========================================================
    // SCORE / NOTA
    // =========================================================
    function labelForPercent(pct){
      return pct >= 70 ? "GAI" : "EZ GAI";
    }

    function gradeBadgeClass(pct){
      return pct >= 70 ? "good" : "bad";
    }

    function computeMaxPoints(){
      return document.querySelectorAll(".exercise").length;
    }

    // =========================================================
    // SORTU BERRIA
    // =========================================================
    document.getElementById("sortu").addEventListener("click", () => {

      document.getElementById("namingNote").style.display = "block";

      scoreBox.classList.remove("show");
      scoreBox.innerHTML = "";

      // ✅ NUEVO: reset de fallos y ocultar botón
      repeatFailsBtn.style.display = "none";
      lastFailed = { formulaToName: [], nameToFormula: [] };

      const selectedGroups = getSelectedGroups();
      const selectedNomenclatures = getSelectedNomenclatures();
      const wantA = btnFormulaIzena.classList.contains("active");
      const wantB = btnIzenaFormula.classList.contains("active");
      const n = Math.max(1, Math.min(10, parseInt(numSel.value, 10) || 5));

      exerciseList.innerHTML = "";
      current.formulaToName = [];
      current.nameToFormula = [];

      const hasIonGroup = selectedGroups.some(isIonGroup);
      const oxoSelected = selectedGroups.includes("Oxoazidoak");
      const oxoReady = !oxoSelected || !!getSelectedOxoType();

      if(
        selectedGroups.length === 0 ||
        (!wantA && !wantB) ||
        (selectedNomenclatures.length === 0 && !hasIonGroup) ||
        !oxoReady
      ){
        document.getElementById("namingNote").style.display = "none";
        exerciseList.innerHTML = `
          <p class="note" style="color:#b45309;">
            Aukeratu gutxienez talde bat eta galdera mota bat.
            Oxoazidoak aukeratzen badituzu, aukeratu Arruntak, Bi atomo zentralekoak edo Biak.
          </p>`;
        return;
      }

      setOptionsPanel(false);

      if(wantA) current.formulaToName = buildSetForMode("formulaToName", n, selectedGroups);
      if(wantB) current.nameToFormula  = buildSetForMode("nameToFormula",  n, selectedGroups);

      if(current.formulaToName.length === 0 && current.nameToFormula.length === 0){
        exerciseList.innerHTML = `
          <p class="note" style="color:#b45309;">
            Ez dago aukeratutako talde eta izendapenekin bateragarria den ariketarik.
          </p>`;
        return;
      }

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
            <div class="chip formulaChip">${formatFormulaHTML(item.formula)}</div>
            ${renderNameFields(item, true)}
          `;

          div.style.gridTemplateColumns = `140px repeat(${getNomenclaturesForItem(item).length}, minmax(0, 1fr))`;

          div.querySelectorAll("input.answer").forEach(inp => {
            const btn = inp.parentElement.querySelector(".checkOne");
            if(btn){
              btn.addEventListener("click", () => {
                const kind = inp.dataset.kind;

                if(kind === "formula"){
                  checkSingleInput(inp, item.formula, "formula");
                }else{
                  checkSingleInput(inp, item[kind], "name");
                  if(!inp.classList.contains("ok")){
                    addHelpLink(inp.closest(".field"), item.link);
                  }
                }
              });
            }
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

              <div class="answerRow">
                <input
                  class="answer"
                  type="text"
                  data-kind="formula"
                  placeholder="Adib.: FeH2"
                />

                <button class="checkOne" type="button">
                  ✓
                </button>
              </div>
            </div>
          `;

          div.querySelectorAll("input.answer").forEach(inp => {

            const btn = inp.parentElement.querySelector(".checkOne");

            if(btn){

              btn.addEventListener("click", () => {

                checkSingleInput(inp, item.formula, "formula");

                if(!inp.classList.contains("ok")){
                  addHelpLink(inp.closest(".field"), item.link);
                }

              });

            }

            inp.addEventListener("input", () => resetInputState(inp));

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

      let earned = 0;
      const max = computeMaxPoints();


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


            const ok = isCorrectName(input.value, correct[kind], kind);


            results.push(ok);

            const field = input.closest(".field");

            if(ok){
              input.classList.add("ok");
            }else{
              input.classList.add("bad");
              addHint(field, `ZUZENA: ${correct[kind]}`);
              addHelpLink(field, correct.link);
            }
          });

          // ✅ NUEVO: si el ejercicio tuvo algún fallo, guardarlo
          if(results.some(r => !r)) lastFailed.formulaToName.push(correct);

          if(results.length > 0 && results.every(Boolean)){
            earned += 1;
          }
        }

        if(type === "nameToFormula"){
          const correct = current.nameToFormula.find(x => x.formula === formula);
          if(!correct) return;

          const input = row.querySelector('input.answer[data-kind="formula"]');
          if(!input) return;

          resetInputState(input);

          const meta = row.querySelector("[data-meta]");
          if(meta) meta.classList.add("show");

          const ok = isCorrectFormula(input.value, correct.formula);

          const field = input.closest(".field");

          if(ok){
            input.classList.add("ok");
            addHint(field, `ONDO! (${correct.shown.kindLabel})`);
            earned += 1;
          }else{
            input.classList.add("bad");
            addHint(field, `ZUZENA (${correct.shown.kindLabel}): ${formulaText(correct.formula)}`);
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

      const grade = labelForPercent(pctRounded);
      const badgeClass = gradeBadgeClass(pctRounded);

      const r = 56;
      const circ = 2 * Math.PI * r;
      const offset = circ * (1 - pctRounded/100);

      scoreBox.classList.add("show");
      scoreBox.innerHTML = `
        <div class="scoreGrid">
          <div>
            <div class="scoreHeader">
              <div>
                <div style="font-size:18px; font-weight:1000;">
                  KONPOSATU ZUZENAK:
                  <span style="color:#111827;">${earnedRounded} / ${maxRounded}</span>
                </div>
                <div style="margin-top:4px; color:#6b7280; font-weight:900;">
                  Konposatu batek puntuatzeko, eskatutako erantzun guztiak zuzen egon behar dira.
                </div>
              </div>
              <div class="badge ${badgeClass}">
                <b>${pctRounded}%</b> · ${grade}
              </div>
            </div>

            <div class="bar" aria-label="porcentaje">
              <div style="width:${pctRounded}%"></div>
            </div>

            <div style="margin-top:10px; font-size:13px; color:#374151; font-weight:900;">
              GAI ≥ 70% · EZ GAI &lt; 70%
            </div>
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
              <text x="80" y="102" text-anchor="middle" font-size="12" fill="#6b7280" font-weight="900">${grade}</text>
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
            <div class="chip formulaChip">${formatFormulaHTML(item.formula)}</div>
            ${renderNameFields(item, false)}
          `;

          div.style.gridTemplateColumns = `140px repeat(${getNomenclaturesForItem(item).length}, minmax(0, 1fr))`;

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

        current.nameToFormula = current.nameToFormula
          .map(item => ({...item, shown: chooseRandomName(item)}))
          .filter(item => item.shown);

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
          doc.text(`${counter}. ${formulaText(item.formula)}`, 20, y);
          y += 12;
        } else {
          doc.setFontSize(10);
          doc.text(`${counter}. ${formulaText(item.formula)}`, 20, y);

          y += 6;
          doc.setFontSize(8);
          const selectedKinds = getNomenclaturesForItem(item);
          selectedKinds.forEach((kind) => {
            doc.text(`${NOMENCLATURE_LABELS[kind]}: ${displayName(item[kind])}`, 25, y);
            y += 5;
          });
          y += 4;
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
          doc.text(`Emaitza: ${formulaText(item.formula)}`, 25, y);
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
