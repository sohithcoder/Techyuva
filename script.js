/* ============================================================
   TECHYUVA — script.js
   Preloader · cursor · reveals · magnetic · 3D ·
   quiz engine · analysis · student zone
   ============================================================ */
"use strict";

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;

/* ============================================================
   1. PRELOADER — terminal boot sequence
   Types realistic boot lines, fills a progress bar, then slides away.
   ============================================================ */
(() => {
  const pre   = $("#preloader");
  const log   = $("#preLog");
  const count = $("#preCount");
  const bar   = $("#preBar");

  // boot log lines: { txt, cls } — cls colors the line
  const LINES = [
    { t: "TechYuva OS v2.6.0 — booting",              c: "pl-accent" },
    { t: "$ ./init.sh",                                 c: "pl-prompt" },
    { t: "→ loading curriculum modules ........ [ ok ]", c: "" },
    { t: "→ mounting student_zone .............. [ ok ]", c: "" },
    { t: "→ warming up java | cpp | python runtimes . [ ok ]", c: "" },
    { t: "→ calibrating practice engine ......... [ ok ]", c: "" },
    { t: "→ 12,000+ students synced ............ [ ok ]", c: "" },
    { t: "✓ all systems nominal",                         c: "pl-ok" },
  ];

  let lineI = 0;
  let charI = 0;
  let current = "";
  let progress = 0;

  const type = () => {
    if (lineI >= LINES.length) {
      // finish
      count.textContent = "100%";
      bar.style.width = "100%";
      log.innerHTML += '<br><span class="pl-accent">welcome back, coder ▸</span> <span class="pl-cursor"></span>';
      setTimeout(() => {
        pre.classList.add("is-done");
        document.body.classList.add("is-loaded");
        $(".hero__title").classList.add("lines-in");
        setTimeout(() => pre.remove(), 1100);
      }, 480);
      return;
    }

    const line = LINES[lineI];
    if (charI === 0) current = "";
    if (charI < line.t.length) {
      current += line.t[charI];
      renderLog(line);
      charI++;
      setTimeout(type, 14 + Math.random() * 24);
    } else {
      // commit this line, advance progress, move on
      committed.push({ t: line.t, c: line.c });
      lineI++; charI = 0; current = "";
      progress = Math.round((lineI / LINES.length) * 100);
      count.textContent = progress + "%";
      bar.style.width = progress + "%";
      setTimeout(type, 90 + Math.random() * 120);
    }
  };

  const committed = [];
  function renderLog(currentLine) {
    let html = committed.map(l =>
      `<span class="${l.c}">${escapeHtml(l.t)}</span>`
    ).join("\n");
    if (currentLine) {
      html += (committed.length ? "\n" : "") +
              `<span class="${currentLine.c}">${escapeHtml(current)}</span>`;
    }
    log.innerHTML = html;
  }
  function escapeHtml(s) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  if (reducedMotion) {
    pre.remove();
    $(".hero__title").classList.add("lines-in");
  } else {
    type();
  }
})();

/* ============================================================
   1b. BINARY RAIN — subtle 0s and 1s drifting in the background
   ============================================================ */
(() => {
  const canvas = $("#binaryRain");
  if (!canvas || reducedMotion) { if (canvas) canvas.style.display = "none"; return; }
  const ctx = canvas.getContext("2d");

  let w, h, cols, drops;
  const FONT = 14;
  const CHARS = "01";
  const CHANCE = 0.965; // most cells blank → very sparse, not matrix-dense

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    cols = Math.floor(w / FONT);
    drops = Array.from({ length: cols }, () => Math.random() * -h);
  }
  resize();
  addEventListener("resize", resize);

  let running = true;
  // pause when tab hidden (perf)
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) draw();
  });

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${FONT}px "JetBrains Mono", monospace`;
    for (let i = 0; i < cols; i++) {
      if (Math.random() > CHANCE) {
        const ch = CHARS[(Math.random() * CHARS.length) | 0];
        // leading char brighter (accent), trailing ones faint
        const bright = Math.random() > 0.85;
        ctx.fillStyle = bright ? "rgba(228, 87, 46, 0.95)" : "rgba(120, 110, 95, 0.6)";
        ctx.fillText(ch, i * FONT, drops[i]);
      }
      drops[i] = drops[i] > h && Math.random() > 0.975 ? 0 : drops[i] + 10;
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ============================================================
   1c. SCROLL PROGRESS BAR
   ============================================================ */
(() => {
  const bar = $("#scrollProgress")?.querySelector("span");
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? (scrollY / max) * 100 : 0;
    bar.style.width = p + "%";
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
})();

/* ============================================================
   1d. HERO TERMINAL — 3D parallax (tracks cursor across hero)
   ============================================================ */
(() => {
  if (isTouch || reducedMotion) return;
  const stage = $(".hero__terminal");
  if (!stage) return;
  let rx = 0, ry = 0, tx = 0, ty = 0;
  let raf = null;

  addEventListener("mousemove", e => {
    const cx = innerWidth / 2, cy = innerHeight / 2;
    tx = (e.clientX - cx) / cx;   // -1 .. 1
    ty = (e.clientY - cy) / cy;
    if (!raf) raf = requestAnimationFrame(loop);
  });

  function loop() {
    // ease toward target for smooth parallax
    rx += (tx - rx) * 0.06;
    ry += (ty - ry) * 0.06;
    stage.style.transform =
      `perspective(1400px) rotateY(${rx * 6}deg) rotateX(${-ry * 5}deg)`;
    if (Math.abs(tx - rx) > 0.001 || Math.abs(ty - ry) > 0.001) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }
})();

/* ============================================================
   2. CUSTOM CURSOR (lerped follow + hover states)
   ============================================================ */
(() => {
  if (isTouch) return;
  const ring = $("#cursor");
  const dot  = $("#cursorDot");
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;

  addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  addEventListener("mousedown", () => ring.classList.add("is-down"));
  addEventListener("mouseup",   () => ring.classList.remove("is-down"));

  const loop = () => {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  };
  loop();

  document.addEventListener("mouseover", e => {
    if (e.target.closest("a, button, .option, [data-magnetic]"))
      ring.classList.add("is-hover");
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest("a, button, .option, [data-magnetic]"))
      ring.classList.remove("is-hover");
  });
})();

/* ============================================================
   3. MAGNETIC ELEMENTS
   ============================================================ */
(() => {
  if (isTouch || reducedMotion) return;
  $$("[data-magnetic]").forEach(el => {
    const strength = 0.35;
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      el.style.transition = "transform .15s ease-out";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
      el.style.transform = "";
    });
  });
})();

/* ============================================================
   4. NAV — hide on scroll down, show on scroll up
   ============================================================ */
(() => {
  const nav = $("#nav");
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > 300 && y > lastY);
    lastY = y;
  }, { passive: true });
})();

/* ============================================================
   5. SCROLL REVEALS + COUNTER STATS
   ============================================================ */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-visible", "lines-in");
    revealObserver.unobserve(en.target);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

$$(".reveal, .cta__title").forEach(el => revealObserver.observe(el));

const countObserver = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const target = +el.dataset.count;
    const dur = 1600;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    countObserver.unobserve(el);
  });
}, { threshold: 0.6 });

$$("[data-count]").forEach(el => countObserver.observe(el));

/* ============================================================
   6. TILT CARDS
   ============================================================ */
(() => {
  if (isTouch || reducedMotion) return;
  $$("[data-tilt]").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform =
        `perspective(800px) rotateX(${-py * 6}deg) rotateY(${px * 6}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
})();

/* ============================================================
   7. QUESTION BANK — Java · C++ · Python
   ============================================================ */
const QUESTION_BANK = {
  java: {
    label: "Java",
    questions: [
      { q: "Which keyword declares a class that cannot be subclassed?", topic: "OOP",
        options: ["static", "final", "abstract", "sealed"], answer: 1 },
      { q: "What is the default value of an int field in Java?", topic: "Core",
        options: ["null", "0", "undefined", "garbage"], answer: 1 },
      { q: "Which collection does NOT allow duplicate elements?", topic: "Collections",
        options: ["ArrayList", "LinkedList", "HashSet", "Vector"], answer: 2 },
      { q: "What does JVM stand for?", topic: "Core",
        options: ["Java Variable Machine", "Java Virtual Machine", "Joint Vertex Module", "Java Verified Method"], answer: 1 },
      { q: "Which keyword is used to inherit a class in Java?", topic: "OOP",
        options: ["inherits", "implements", "extends", "super"], answer: 2 },
      { q: "Which method is the entry point of a Java program?", topic: "Core",
        options: ["start()", "init()", "main()", "run()"], answer: 2 },
    ],
  },
  cpp: {
    label: "C++",
    questions: [
      { q: "Which operator returns the memory address of a variable?", topic: "Pointers",
        options: ["*", "&", "->", "::"], answer: 1 },
      { q: "Which header is needed for std::cout?", topic: "Core",
        options: ["<stdio>", "<iostream>", "<conio>", "<string.h>"], answer: 1 },
      { q: "What does STL stand for in C++?", topic: "STL",
        options: ["Standard Type Library", "Standard Template Library", "System Type Loader", "Static Template Linker"], answer: 1 },
      { q: "Which keyword allocates memory dynamically?", topic: "Memory",
        options: ["malloc", "alloc", "new", "create"], answer: 2 },
      { q: "std::vector is an example of a…", topic: "STL",
        options: ["container", "algorithm", "iterator", "functor"], answer: 0 },
      { q: "What is the size of 'int' guaranteed to be at minimum?", topic: "Core",
        options: ["8 bits", "16 bits", "32 bits", "64 bits"], answer: 1 },
    ],
  },
  python: {
    label: "Python",
    questions: [
      { q: "Which symbol starts a single-line comment in Python?", topic: "Core",
        options: ["//", "#", "--", "/*"], answer: 1 },
      { q: "What is the output type of 7 // 2 in Python?", topic: "Core",
        options: ["float", "int", "string", "complex"], answer: 1 },
      { q: "Which data structure uses curly braces and key:value pairs?", topic: "Data Types",
        options: ["list", "tuple", "dict", "set"], answer: 2 },
      { q: "Which keyword defines a function in Python?", topic: "Core",
        options: ["func", "def", "function", "fn"], answer: 1 },
      { q: "Which library is the standard for numerical arrays?", topic: "Data Science",
        options: ["Pandas", "NumPy", "Matplotlib", "Flask"], answer: 1 },
      { q: "What does pip stand for / do?", topic: "Tooling",
        options: ["Python Installer Program", "Package manager for Python", "Python Internal Parser", "Print In Place"], answer: 1 },
    ],
  },
};

/* ============================================================
   8. QUIZ ENGINE
   ============================================================ */
const Quiz = (() => {
  const SECONDS_PER_Q = 20;
  const RING_LEN = 119.4;

  const overlay   = $("#quiz");
  const elSubject = $("#quizSubject");
  const elCount   = $("#quizCount");
  const elQ       = $("#quizQuestion");
  const elOpts    = $("#quizOptions");
  const elBody    = $("#quizBody");
  const elBar     = $("#quizBar");
  const elTime    = $("#timerText");
  const elRing    = $("#timerRing");

  let subjectKey, questions, index, results, timerId, timeLeft, locked;

  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ---------- timer ---------- */
  function startTimer() {
    stopTimer();
    timeLeft = SECONDS_PER_Q;
    paintTimer();
    timerId = setInterval(() => {
      timeLeft--;
      paintTimer();
      if (timeLeft <= 0) {
        stopTimer();
        lockAnswer(-1);
      }
    }, 1000);
  }
  function stopTimer() { clearInterval(timerId); }
  function paintTimer() {
    elTime.textContent = timeLeft;
    elRing.style.strokeDashoffset = RING_LEN * (1 - timeLeft / SECONDS_PER_Q);
    elRing.classList.toggle("is-low", timeLeft <= 5);
  }

  /* ---------- render one question ---------- */
  function renderQuestion() {
    const item = questions[index];
    locked = false;

    elCount.textContent =
      `Question ${String(index + 1).padStart(2, "0")} / ${String(questions.length).padStart(2, "0")}`;
    elQ.textContent = item.q;
    elBar.style.width = `${(index / questions.length) * 100}%`;

    elOpts.innerHTML = "";
    elOpts.classList.remove("is-locked");
    const keys = ["A", "B", "C", "D"];

    item.shuffled.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.type = "button";
      btn.innerHTML = `<kbd>${keys[i]}</kbd><span>${opt.text}</span>`;
      btn.addEventListener("click", () => lockAnswer(i));
      elOpts.appendChild(btn);
    });

    elBody.classList.remove("is-switching");
    startTimer();
  }

  /* ---------- answer handling ---------- */
  function lockAnswer(choiceIndex) {
    if (locked) return;
    locked = true;
    stopTimer();
    elOpts.classList.add("is-locked");

    const item = questions[index];
    const correctIdx = item.shuffled.findIndex(o => o.correct);
    const buttons = $$(".option", elOpts);
    const isRight = choiceIndex === correctIdx;

    buttons.forEach((btn, i) => {
      if (i === correctIdx) btn.classList.add("is-correct");
      else if (i === choiceIndex) btn.classList.add("is-wrong");
      else btn.classList.add("is-dim");
    });

    results.push({
      question: item.q,
      topic: item.topic,
      correctText: item.shuffled[correctIdx].text,
      chosenText: choiceIndex >= 0 ? item.shuffled[choiceIndex].text : null,
      right: isRight,
      timeUsed: SECONDS_PER_Q - timeLeft,
    });

    setTimeout(() => {
      elBody.classList.add("is-switching");
      setTimeout(() => {
        index++;
        if (index < questions.length) renderQuestion();
        else finish();
      }, 380);
    }, isRight ? 750 : 1300);
  }

  /* ---------- lifecycle ---------- */
  function start(key) {
    subjectKey = key;
    const bank = QUESTION_BANK[key];
    if (!bank) return;

    questions = shuffle(bank.questions).map(q => ({
      ...q,
      shuffled: shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer }))),
    }));

    index = 0;
    results = [];

    elSubject.textContent = bank.label;
    overlay.hidden = false;
    document.body.classList.add("quiz-open");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      renderQuestion();
    }));
  }

  function quit() {
    stopTimer();
    overlay.classList.remove("is-open");
    document.body.classList.remove("quiz-open");
    setTimeout(() => { overlay.hidden = true; }, 500);
  }

  function finish() {
    elBar.style.width = "100%";
    quit();
    Analysis.show(QUESTION_BANK[subjectKey].label, results, subjectKey);
  }

  /* ---------- keyboard support ---------- */
  addEventListener("keydown", e => {
    if (overlay.hidden) return;
    if (e.key === "Escape") return quit();
    const map = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
    const idx = map[e.key.toLowerCase()];
    if (idx !== undefined && !locked) {
      const btn = $$(".option", elOpts)[idx];
      if (btn) btn.click();
    }
  });

  $("#quizQuit").addEventListener("click", quit);

  return { start, quit };
})();

/* ============================================================
   9. ANALYSIS / RESULTS
   ============================================================ */
const Analysis = (() => {
  const DONUT_LEN = 414.7;

  const section  = $("#analysis");
  const elPct    = $("#scorePct");
  const elVerdict= $("#scoreVerdict");
  const elDonut  = $("#donutRing");
  const elCorrect= $("#rCorrect");
  const elAvgTime= $("#rAvgTime");
  const elBest   = $("#rBest");
  const elWorst  = $("#rWorst");
  const elChart  = $("#barChart");
  const elReview = $("#reviewList");
  const btnRetry = $("#retryBtn");
  const btnOther = $("#newSubjectBtn");

  let lastSubjectKey = null;

  function verdictFor(pct) {
    if (pct >= 85) return "Excellent";
    if (pct >= 70) return "Strong";
    if (pct >= 50) return "Solid base";
    if (pct >= 30) return "Keep going";
    return "Needs work";
  }

  function show(label, results, subjectKey) {
    lastSubjectKey = subjectKey;
    const total   = results.length;
    const correct = results.filter(r => r.right).length;
    const pct     = Math.round((correct / total) * 100);
    const avgTime = (results.reduce((s, r) => s + r.timeUsed, 0) / total).toFixed(1);

    /* --- topic strengths --- */
    const topics = {};
    results.forEach(r => {
      topics[r.topic] ??= { right: 0, total: 0 };
      topics[r.topic].total++;
      if (r.right) topics[r.topic].right++;
    });
    const ranked = Object.entries(topics)
      .map(([name, t]) => ({ name, score: t.right / t.total }))
      .sort((a, b) => b.score - a.score);

    /* --- stat cards --- */
    elCorrect.textContent = `${correct} / ${total}`;
    elAvgTime.textContent = `${avgTime}s`;
    elBest.textContent    = ranked[0].name;
    elWorst.textContent   = ranked[ranked.length - 1].name;
    elVerdict.textContent = verdictFor(pct);

    /* --- donut + count up --- */
    elDonut.style.strokeDashoffset = DONUT_LEN;
    let shown = 0;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / 1400);
      shown = Math.round(pct * (1 - Math.pow(1 - p, 3)));
      elPct.textContent = shown + "%";
      if (p < 1) requestAnimationFrame(tick);
    };

    /* --- per-question time bar chart --- */
    elChart.innerHTML = "";
    const maxT = Math.max(...results.map(r => r.timeUsed), 1);
    results.forEach((r, i) => {
      const bar = document.createElement("div");
      bar.className = "bar" + (r.right ? "" : " is-wrong");
      bar.style.height = `${Math.max(6, (r.timeUsed / maxT) * 100)}%`;
      bar.style.animationDelay = `${0.3 + i * 0.07}s`;
      bar.innerHTML = `<span>${r.timeUsed}s</span>`;
      bar.title = `Q${i + 1}: ${r.timeUsed}s — ${r.right ? "correct" : "wrong"}`;
      elChart.appendChild(bar);
    });

    /* --- review list --- */
    elReview.innerHTML = results.map((r, i) => `
      <div class="review-item ${r.right ? "is-right" : "is-wrong"}">
        <div class="review-item__mark">${r.right ? "✓" : "✗"}</div>
        <div>
          <p class="review-item__q">${i + 1}. ${r.question}</p>
          <p class="review-item__a">
            ${r.right
              ? `Answered: <b>${r.correctText}</b>`
              : r.chosenText
                ? `You chose <s>${r.chosenText}</s> — correct: <b>${r.correctText}</b>`
                : `Timed out — correct: <b>${r.correctText}</b>`}
          </p>
          <span class="review-item__topic">${r.topic}</span>
        </div>
      </div>
    `).join("");

    /* --- reveal section & kick off animations --- */
    section.hidden = false;
    section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });

    setTimeout(() => {
      elDonut.style.strokeDashoffset = DONUT_LEN * (1 - pct / 100);
      requestAnimationFrame(tick);
    }, 400);
  }

  /* --- retry the same subject --- */
  btnRetry.addEventListener("click", () => {
    if (lastSubjectKey) Quiz.start(lastSubjectKey);
  });

  /* --- pick another subject: scroll to courses --- */
  btnOther.addEventListener("click", () => {
    const courses = $("#courses");
    if (courses) courses.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });

  return { show };
})();

/* ============================================================
   10. WIRE UP COURSE / SUBJECT BUTTONS
   ============================================================ */
$$("[data-subject]").forEach(btn => {
  btn.addEventListener("click", () => Quiz.start(btn.dataset.subject));
});

/* placement test → random language */
$("#takePlacement")?.addEventListener("click", () => {
  const keys = Object.keys(QUESTION_BANK);
  Quiz.start(keys[Math.floor(Math.random() * keys.length)]);
});

/* ============================================================
   11. STUDENT ZONE — login form (demo handler)
   ============================================================ */
(() => {
  const form = $("#zoneLogin");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const email = form.email.value.trim();
    const pass  = form.pass.value.trim();
    if (!email || !pass) {
      const hint = $(".zone__hint", form.parentElement) || form.querySelector(".zone__hint");
      if (hint) {
        hint.textContent = "Please enter both your ID and password.";
        hint.style.color = "var(--python)";
      }
      return;
    }
    const btn = $("button[type=submit]", form);
    const original = btn.innerHTML;
    btn.innerHTML = "<span>Welcome! 🎉</span>";
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2200);
  });
})();

/* ============================================================
   12. TERMINAL SHOWCASE — typewriter "video"
   Types real code → "compiles" → prints friendly output, on loop.
   ============================================================ */
const Terminal = (() => {
  const elCode   = $("#termCode");
  const elOut    = $("#termOut");
  const elTitle  = $("#termTitle");
  const elStatus = $("#termStatus");
  const tabs     = $$(".term-tab");

  // Each snippet is an array of { text, cls } tokens so we can color it.
  // cls options: kw, fn, str, num, com, type, punc  (or "" for default)
  const SNIPPETS = {
    java: {
      title: "techyuva — java",
      status: { running: "compiling Main.java", done: "ran in 0.12s" },
      code: [
        [{t:"public ",c:"kw"},{t:"class ",c:"kw"},{t:"Main",c:"type"},{t:" ",c:""},{t:"{",c:"punc"}],
        [{t:"  public ",c:"kw"},{t:"static ",c:"kw"},{t:"void ",c:"type"},{t:"main",c:"fn"},{t:"(",c:"punc"},{t:"String",c:"type"},{t:"[] ",c:"punc"},{t:"args",c:""},{t:") ",c:"punc"},{t:"{",c:"punc"}],
        [{t:"    ",c:""},{t:"// welcome to TechYuva",c:"com"}],
        [{t:"    int",c:"type"},{t:" year ",c:""},{t:"= ",c:"punc"},{t:"2026",c:"num"},{t:";",c:"punc"}],
        [{t:"    String",c:"type"},{t:" lang ",c:""},{t:"= ",c:"punc"},{t:"\"Java\"",c:"str"},{t:";",c:"punc"}],
        [{t:"    System",c:"type"},{t:".",c:"punc"},{t:"out",c:"fn"},{t:".println",c:"fn"},{t:"(",c:"punc"},{t:"\"Hello from \" + lang",c:"str"},{t:");",c:"punc"}],
        [{t:"  }",c:"punc"}],
        [{t:"}",c:"punc"}],
      ],
      out: [
        {p:"$ ", txt:"javac Main.java && java Main", cls:"out-prompt"},
        {p:"", txt:"Hello from Java", cls:"out-line"},
        {p:"", txt:"✓ Year 2026 · cohort is live", cls:"out-emoji"},
        {p:"", txt:"— exit code 0", cls:"out-prompt"},
      ],
    },
    cpp: {
      title: "techyuva — cpp",
      status: { running: "compiling main.cpp", done: "ran in 0.03s" },
      code: [
        [{t:"#include ",c:"kw"},{t:"<iostream>",c:"str"}],
        [{t:"using ",c:"kw"},{t:"namespace ",c:"kw"},{t:"std",c:"type"},{t:";",c:"punc"}],
        [{t:"int ",c:"type"},{t:"main",c:"fn"},{t:"() {",c:"punc"}],
        [{t:"  ",c:""},{t:"// competitive-ready",c:"com"}],
        [{t:"  int",c:"type"},{t:" n ",c:""},{t:"= ",c:"punc"},{t:"10",c:"num"},{t:", sum ",c:""},{t:"= ",c:"punc"},{t:"0",c:"num"},{t:";",c:"punc"}],
        [{t:"  for ",c:"kw"},{t:"(",c:"punc"},{t:"int ",c:"type"},{t:"i ",c:""},{t:"= ",c:"punc"},{t:"1",c:"num"},{t:"; i <= n; ",c:"punc"},{t:"++",c:"kw"},{t:"i) sum += i;",c:""}],
        [{t:"  cout ",c:"fn"},{t:"<< ",c:"punc"},{t:"\"1+2+...+10 = \" << sum << endl",c:"str"},{t:";",c:"punc"}],
        [{t:"  return ",c:"kw"},{t:"0",c:"num"},{t:";",c:"punc"}],
        [{t:"}",c:"punc"}],
      ],
      out: [
        {p:"$ ", txt:"g++ main.cpp -o main && ./main", cls:"out-prompt"},
        {p:"", txt:"1+2+...+10 = 55", cls:"out-line"},
        {p:"", txt:"✓ O(n) summed in one pass", cls:"out-emoji"},
        {p:"", txt:"— exit code 0", cls:"out-prompt"},
      ],
    },
    python: {
      title: "techyuva — python",
      status: { running: "running main.py", done: "ran in 0.08s" },
      code: [
        [{t:"import ",c:"kw"},{t:"math",c:"type"}],
        [{t:"",c:""}],
        [{t:"def ",c:"kw"},{t:"greet",c:"fn"},{t:"(name):",c:"punc"}],
        [{t:"    return ",c:"kw"},{t:"f\"Hi {name}, welcome to TechYuva\"",c:"str"}],
        [{t:"",c:""}],
        [{t:"# data science ready",c:"com"}],
        [{t:"nums ",c:""},{t:"= ",c:"punc"},{t:"[x * x for x in range(1, 6)]",c:"num"}],
        [{t:"print",c:"fn"},{t:"(greet(",c:"punc"},{t:"\"coder\"",c:"str"},{t:"))",c:"punc"}],
        [{t:"print",c:"fn"},{t:"(\"squares:\", nums)",c:"str"}],
      ],
      out: [
        {p:">>> ", txt:"python main.py", cls:"out-prompt"},
        {p:"", txt:"Hi coder, welcome to TechYuva", cls:"out-line"},
        {p:"", txt:"squares: [1, 4, 9, 16, 25]", cls:"out-line"},
        {p:"", txt:"✓ zero bugs, ship it 🚀", cls:"out-emoji"},
      ],
    },
  };

  const TYPE_SPEED = 24;     // ms per char
  const LINE_DELAY = 90;     // pause between lines
  const RUN_DELAY  = 600;    // pause before output
  const OUT_DELAY  = 320;    // ms between output lines
  const LOOP_DELAY = 2600;   // pause before next language
  const ORDER = ["java", "cpp", "python"];

  let current = "java";
  let timer = null;
  let cancelled = false;

  const wait = ms => new Promise(r => timer = setTimeout(r, ms));

  /* render accumulated tokens as colored HTML */
  function render(typedTokens) {
    let html = "";
    for (const {t, c} of typedTokens) {
      const esc = t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      html += c ? `<span class="tok-${c}">${esc}</span>` : esc;
    }
    elCode.innerHTML = html + '<span class="term-caret"></span>';
  }

  function setStatus(state, label) {
    elStatus.className = "terminal__status" + (state ? ` is-${state}` : "");
    elStatus.innerHTML = `<i></i> ${label}`;
  }

  async function typeSnippet(lang) {
    cancelled = false;
    const snip = SNIPPETS[lang];
    elTitle.textContent = snip.title;
    elOut.classList.remove("is-shown");
    elOut.innerHTML = "";
    setStatus("running", snip.status.running);

    // flatten tokens with line breaks
    const lines = snip.code;
    const typed = [];
    for (let li = 0; li < lines.length; li++) {
      for (const tok of lines[li]) {
        for (const ch of tok.t) {
          typed.push({ t: ch, c: tok.c });
          render(typed);
          if (cancelled) return;
          await wait(TYPE_SPEED);
        }
      }
      typed.push({ t: "\n", c: "" });
      render(typed);
      if (cancelled) return;
      await wait(LINE_DELAY);
    }

    // "compile/run" beat
    await wait(RUN_DELAY);
    if (cancelled) return;

    // print output lines one by one
    setStatus("running", "running…");
    let outHtml = "";
    for (const line of snip.out) {
      outHtml += `<div class="${line.cls}">${escapeHtml(line.p)}${escapeHtml(line.txt)}</div>`;
      elOut.innerHTML = outHtml;
      elOut.classList.add("is-shown");
      if (cancelled) return;
      await wait(OUT_DELAY);
    }
    setStatus("done", snip.status.done);

    // loop to next language
    await wait(LOOP_DELAY);
    if (cancelled) return;
    next();
  }

  function escapeHtml(s) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function setActiveTab(lang) {
    tabs.forEach(t => t.classList.toggle("is-active", t.dataset.term === lang));
  }

  function next() {
    const i = ORDER.indexOf(current);
    current = ORDER[(i + 1) % ORDER.length];
    setActiveTab(current);
    typeSnippet(current);
  }

  /* play a specific language (user clicked a tab / replay) */
  function play(lang) {
    clearTimeout(timer);
    cancelled = true;
    setTimeout(() => {
      current = lang;
      setActiveTab(lang);
      typeSnippet(lang);
    }, 60);
  }

  function replay() {
    play(current);
  }

  /* start only when the terminal scrolls into view */
  const startObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        typeSnippet(current);
        obs.disconnect();
      }
    });
  }, { threshold: 0.4 });

  startObserver.observe($(".terminal"));

  /* tab clicks */
  tabs.forEach(tab => {
    tab.addEventListener("click", () => play(tab.dataset.term));
  });

  $("#termReplay")?.addEventListener("click", replay);

  return { play, replay };
})();

/* ============================================================
   13. SMOOTH ANCHOR SCROLLING (respects fixed nav)
   ============================================================ */
$$('a[href^="#"]').forEach(link => {
  link.addEventListener("click", e => {
    const target = $(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });
});
