/* ============================================================
   TECHYUVA v2 — script.js
   Gravity Sling · ASCII Fluid · File Explorer · Command Palette
   Mascot · Thinking States · Quiz · Terminal · Everything
   ============================================================ */
"use strict";

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;

/* ============================================================
   0. UTILITY
   ============================================================ */
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));

/* ============================================================
   1. PRELOADER (disabled)
   The animated character/intro loader was removed — the page
   now loads directly. This stub keeps the legacy init() call
   working and ensures the hero animates in immediately.
   ============================================================ */
const Preloader = (() => {
  function init() {
    document.body.classList.add("is-loaded");
    $(".hero__title")?.classList.add("lines-in");
  }
  return { init };
})();

/* ---------- shared helpers (must be global to all modules) ---------- */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   2. ASCII FLUID BACKGROUND
   White chars on paper, reacting to mouse like water ripples
   ============================================================ */
const AsciiFluid = (() => {
  const canvas = $("#asciiFluid");
  if (!canvas || reducedMotion) {
    if (canvas) canvas.style.display = "none";
    return {};
  }
  const ctx = canvas.getContext("2d");

  let w, h, cols, rows;
  const FONT = 13;
  const CHARS = " .-~=+*/|\{}[]()<>;:,!?&%$#@";
  const grid = [];
  let mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
  let lastMouse = { x: -1000, y: -1000 };
  let time = 0;

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    cols = Math.ceil(w / FONT);
    rows = Math.ceil(h / FONT);
    grid.length = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        grid.push({
          x: x * FONT,
          y: y * FONT,
          baseChar: CHARS[randInt(0, CHARS.length - 1)],
          phase: rand(0, Math.PI * 2),
          speed: rand(0.3, 1.2),
          amp: rand(0, 0.3),
        });
      }
    }
  }
  resize();
  addEventListener("resize", resize);

  addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) draw();
  });

  function draw() {
    if (!running) return;
    time += 0.016;

    // Mouse velocity
    mouse.vx = mouse.x - lastMouse.x;
    mouse.vy = mouse.y - lastMouse.y;
    lastMouse.x = mouse.x;
    lastMouse.y = mouse.y;

    ctx.clearRect(0, 0, w, h);
    ctx.font = `${FONT}px "JetBrains Mono", monospace`;
    ctx.textBaseline = "top";

    for (const cell of grid) {
      const dx = cell.x - mouse.x;
      const dy = cell.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 180;

      let char = cell.baseChar;
      let opacity = 0.04;
      let offsetY = 0;

      // Wave motion
      const wave = Math.sin(time * cell.speed + cell.phase) * cell.amp;

      if (dist < maxDist) {
        const influence = 1 - dist / maxDist;
        const ripple = Math.sin(dist * 0.05 - time * 3) * influence;

        // Char changes based on ripple intensity
        const charIndex = Math.floor((ripple + 1) * 0.5 * (CHARS.length - 1));
        char = CHARS[Math.min(charIndex, CHARS.length - 1)];
        opacity = 0.04 + influence * 0.12;
        offsetY = ripple * 8;

        // Mouse velocity push
        if (Math.abs(mouse.vx) > 2 || Math.abs(mouse.vy) > 2) {
          const pushX = (mouse.vx / 20) * influence;
          const pushY = (mouse.vy / 20) * influence;
          ctx.save();
          ctx.translate(pushX, pushY);
        }
      }

      ctx.fillStyle = `rgba(28, 25, 21, ${opacity + wave * 0.02})`;
      ctx.fillText(char, cell.x, cell.y + offsetY);

      if (dist < maxDist && (Math.abs(mouse.vx) > 2 || Math.abs(mouse.vy) > 2)) {
        ctx.restore();
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
  return {};
})();

/* ============================================================
   3. FILE EXPLORER NAV
   ============================================================ */
const FileExplorer = (() => {
  const nav = $("#nav");
  const toggle = $("#explorerToggle");
  const expand = $("#navExpand");
  const folders = $$('[data-folder]');

  // Collapse (hide the explorer tree)
  if (toggle) {
    toggle.addEventListener("click", () => {
      nav.classList.add("is-collapsed");
    });
  }
  // Expand (show it again) — handle lives in the slim rail so it's
  // always reachable even while collapsed.
  if (expand) {
    expand.addEventListener("click", () => {
      nav.classList.remove("is-collapsed");
    });
  }

  folders.forEach(folder => {
    folder.addEventListener("click", () => {
      const id = folder.dataset.folder;
      const children = $(`#folder-${id}`);
      if (children) {
        children.classList.toggle("is-collapsed");
        folder.classList.toggle("is-open");
      }
    });
  });

  // Active state on scroll
  const sections = ["#about", "#courses", "#zone", "#analysis"];
  const fileMap = { "#top": "index.html", "#about": "about.md", "#courses": "java.md", "#zone": "student-zone/", "#analysis": "practice.md" };

  addEventListener("scroll", () => {
    const y = scrollY + 200;
    let active = "#top";
    for (const sec of sections) {
      const el = $(sec);
      if (el && el.offsetTop <= y) active = sec;
    }
    $$(".nav__tree-item[data-file]").forEach(item => {
      item.classList.toggle("is-active", item.dataset.file === fileMap[active]);
    });
  }, { passive: true });

  return {};
})();

/* ============================================================
   4. COMMAND PALETTE
   ============================================================ */
const CommandPalette = (() => {
  const overlay = $("#cmdPaletteOverlay");
  const input = $("#cmdInput");
  const results = $("#cmdResults");
  const btn = $("#cmdPalette");
  let selectedIndex = -1;

  const COMMANDS = [
    { label: "Trending Courses", action: () => scrollToSection("#trending"), shortcut: "↵", keywords: "courses trending learn popular" },
    { label: "Upcoming Batches", action: () => scrollToSection("#schedule"), shortcut: "↵", keywords: "batches upcoming schedule timing" },
    { label: "Study Zone Updates", action: () => scrollToSection("#zone"), shortcut: "↵", keywords: "study zone materials jobs roadmap" },
    { label: "YouTube Channel", action: () => scrollToSection("#youtube"), shortcut: "↵", keywords: "youtube videos tutorials watch" },
    { label: "Our Location", action: () => scrollToSection("#location"), shortcut: "↵", keywords: "location map campus visit" },
    { label: "Contact Information", action: () => scrollToSection("#contact"), shortcut: "↵", keywords: "contact phone email support help" },
  ];

  function scrollToSection(selector) {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function open() {
    overlay.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      input.value = "";
      input.focus();
      renderResults("");
    });
  }

  function close() {
    overlay.classList.remove("is-open");
    setTimeout(() => { overlay.hidden = true; }, 300);
  }

  function renderResults(query) {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.keywords.includes(q))
      : COMMANDS;

    results.innerHTML = filtered.map((c, i) => `
      <div class="cmd-palette__result ${i === 0 ? 'is-selected' : ''}" data-index="${i}">
        <span>${escapeHtml(c.label)}</span>
        <kbd>${escapeHtml(c.shortcut)}</kbd>
      </div>
    `).join("");

    selectedIndex = 0;

    $$('.cmd-palette__result').forEach(el => {
      el.addEventListener("click", () => {
        const idx = +el.dataset.index;
        filtered[idx]?.action?.();
        close();
      });
    });
  }

  input?.addEventListener("input", e => renderResults(e.target.value));

  input?.addEventListener("keydown", e => {
    const items = $$('.cmd-palette__result');
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelection(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelection(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const q = input.value.toLowerCase().trim();
      const filtered = q
        ? COMMANDS.filter(c => c.label.toLowerCase().includes(q) || c.keywords.includes(q))
        : COMMANDS;
      filtered[selectedIndex]?.action?.();
      close();
    } else if (e.key === "Escape") {
      close();
    }
  });

  function updateSelection(items) {
    items.forEach((el, i) => el.classList.toggle("is-selected", i === selectedIndex));
  }

  btn?.addEventListener("click", open);

  addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      overlay.hidden ? open() : close();
    }
  });

  $(".cmd-palette__backdrop")?.addEventListener("click", close);

  return { open, close };
})();

/* ============================================================
   5. SCROLL PROGRESS
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
   6. CUSTOM CURSOR
   ============================================================ */
(() => {
  if (isTouch) return;
  const ring = $("#cursor");
  const dot  = $("#cursorDot");
  if (!ring || !dot) return;
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;

  addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  addEventListener("mousedown", () => ring.classList.add("is-down"));
  addEventListener("mouseup",   () => ring.classList.remove("is-down"));

  const loop = () => {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  };
  loop();

  document.addEventListener("mouseover", e => {
    if (e.target.closest("a, button, .option, [data-magnetic], .nav__tree-item, .cmd-palette__result"))
      ring.classList.add("is-hover");
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest("a, button, .option, [data-magnetic], .nav__tree-item, .cmd-palette__result"))
      ring.classList.remove("is-hover");
  });
})();

/* ============================================================
   7. MAGNETIC ELEMENTS
   ============================================================ */
(() => {
  if (isTouch || reducedMotion) return;
  $$("[data-magnetic]").forEach(el => {
    const strength = 0.3;
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      el.style.transition = "transform .12s ease-out";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
      el.style.transform = "";
    });
  });
})();

/* ============================================================
   8. SCROLL REVEALS + COUNTER STATS
   ============================================================ */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-visible", "lines-in");
    revealObserver.unobserve(en.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

$$(".reveal, .cta__title").forEach(el => revealObserver.observe(el));

const countObserver = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const target = +el.dataset.count;
    const dur = 1400;
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
}, { threshold: 0.5 });

$$("[data-count]").forEach(el => countObserver.observe(el));

/* ============================================================
   9. TILT CARDS
   ============================================================ */
(() => {
  if (isTouch || reducedMotion) return;
  $$("[data-tilt]").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform =
        `perspective(800px) rotateX(${-py * 5}deg) rotateY(${px * 5}deg) translateY(-3px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
})();

/* ============================================================
   10. ASCII TITLE SCRAMBLE — removed (static text only now)
   ============================================================ */

/* ============================================================
   11. COURSE ASCII ART
   ============================================================ */
const CourseAscii = (() => {
  const ARTS = {
    java: [
      "    ┌─────────────┐",
      "    │  public     │",
      "    │  class      │",
      "    │  Java       │",
      "    │  { }        │",
      "    └─────────────┘",
      "         │extends│",
      "    ┌────┴───────┐",
      "    │  Object    │",
      "    └────────────┘"
    ],
    cpp: [
      "    #include <iostream>",
      "    int main() {",
      "      int* ptr;",
      "      ptr = new int;",
      "      *ptr = 42;",
      "      std::cout <<",
      "        *ptr;",
      "      delete ptr;",
      "      return 0;",
      "    }"
    ],
    python: [
      "    import numpy as np",
      "    data = [1,2,3,4,5]",
      "    arr = np.array(data)",
      "    ",
      "    def analyze(x):",
      "      return x ** 2",
      "    ",
      "    result = analyze(arr)",
      "    print(result)"
    ]
  };

  Object.entries(ARTS).forEach(([key, lines]) => {
    const el = $(`#ascii-${key}`);
    if (el) el.textContent = lines.join("\n");
  });

  return {};
})();

/* ============================================================
   12. MASCOT
   ============================================================ */
const Mascot = (() => {
  const mascot = $("#mascot");
  const bubble = $("#mascotBubble");
  const text = $("#mascotText");
  const ascii = $("#mascotAscii");
  if (!mascot) return {};

  const TIPS = [
    "Try Cmd+K for commands!",
    "Hover over course cards...",
    "The terminal types real code!",
    "Take a placement test?",
    "Java track has 48 sessions.",
    "C++ is fastest — 10 weeks.",
    "Python: 8 weeks, 32 sessions.",
    "Student Zone has live cohorts!",
    "Press 1-4 during quizzes.",
    "We have 12,000+ students.",
    "94% complete their track.",
    "45+ hands-on projects."
  ];

  let tipIndex = 0;
  let bubbleTimer = null;

  function showTip() {
    text.textContent = TIPS[tipIndex];
    bubble.hidden = false;
    tipIndex = (tipIndex + 1) % TIPS.length;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 4000);
  }

  mascot.addEventListener("click", showTip);

  // Show first tip after 5 seconds
  setTimeout(showTip, 5000);

  // Periodic tips
  setInterval(() => {
    if (bubble.hidden) showTip();
  }, 15000);

  // Look at cursor
  if (!isTouch) {
    addEventListener("mousemove", e => {
      const r = mascot.getBoundingClientRect();
      const mx = r.left + r.width / 2;
      const my = r.top + r.height / 2;
      const angle = Math.atan2(e.clientY - my, e.clientX - mx);
      const lookX = Math.cos(angle) * 2;
      const lookY = Math.sin(angle) * 1;
      ascii.style.transform = `translate(${lookX}px, ${lookY}px)`;
    });
  }

  return { showTip };
})();

/* ============================================================
   13. THINKING STATES
   ============================================================ */
const Thinking = (() => {
  const overlay = $("#thinkingOverlay");
  const log = $("#thinkingLog");
  if (!overlay) return {};

  const SEQUENCES = {
    enroll: [
      "$ techyuva enroll --course=java",
      "→ Parsing request...",
      "→ Validating prerequisites...",
      "→ Allocating cohort slot...",
      "→ Generating learning path...",
      "→ Optimizing curriculum...",
      "✓ Enrolled successfully!"
    ],
    placement: [
      "$ techyuva test --placement",
      "→ Loading question bank...",
      "→ Calibrating difficulty...",
      "→ Shuffling questions...",
      "→ Timer synchronized...",
      "✓ Ready to begin!"
    ],
    login: [
      "$ auth.login(user)",
      "→ Verifying credentials...",
      "→ Loading student profile...",
      "→ Syncing progress...",
      "→ Fetching cohort data...",
      "✓ Welcome back, coder!"
    ]
  };

  async function show(type) {
    const seq = SEQUENCES[type] || SEQUENCES.enroll;
    overlay.hidden = false;
    log.textContent = "";

    for (const line of seq) {
      log.textContent += line + "\n";
      await wait(300 + Math.random() * 400);
    }

    await wait(600);
    overlay.hidden = true;
  }

  return { show };
})();

/* ============================================================
   14. QUESTION BANK
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
   15. QUIZ ENGINE
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
      btn.innerHTML = `<kbd>${keys[i]}</kbd><span>${escapeHtml(opt.text)}</span>`;
      btn.addEventListener("click", () => lockAnswer(i));
      elOpts.appendChild(btn);
    });

    elBody.classList.remove("is-switching");
    startTimer();
  }

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
      }, 350);
    }, isRight ? 700 : 1200);
  }

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

  $("#quizQuit")?.addEventListener("click", quit);

  return { start, quit };
})();

/* ============================================================
   16. ANALYSIS / RESULTS
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

    const topics = {};
    results.forEach(r => {
      topics[r.topic] ??= { right: 0, total: 0 };
      topics[r.topic].total++;
      if (r.right) topics[r.topic].right++;
    });
    const ranked = Object.entries(topics)
      .map(([name, t]) => ({ name, score: t.right / t.total }))
      .sort((a, b) => b.score - a.score);

    elCorrect.textContent = `${correct} / ${total}`;
    elAvgTime.textContent = `${avgTime}s`;
    elBest.textContent    = ranked[0]?.name || "—";
    elWorst.textContent   = ranked[ranked.length - 1]?.name || "—";
    elVerdict.textContent = verdictFor(pct);

    elDonut.style.strokeDashoffset = DONUT_LEN;
    let shown = 0;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / 1400);
      shown = Math.round(pct * (1 - Math.pow(1 - p, 3)));
      elPct.textContent = shown + "%";
      if (p < 1) requestAnimationFrame(tick);
    };

    elChart.innerHTML = "";
    const maxT = Math.max(...results.map(r => r.timeUsed), 1);
    results.forEach((r, i) => {
      const bar = document.createElement("div");
      bar.className = "bar" + (r.right ? "" : " is-wrong");
      bar.style.height = `${Math.max(5, (r.timeUsed / maxT) * 100)}%`;
      bar.style.animationDelay = `${0.25 + i * 0.06}s`;
      bar.innerHTML = `<span>${r.timeUsed}s</span>`;
      bar.title = `Q${i + 1}: ${r.timeUsed}s — ${r.right ? "correct" : "wrong"}`;
      elChart.appendChild(bar);
    });

    elReview.innerHTML = results.map((r, i) => `
      <div class="review-item ${r.right ? "is-right" : "is-wrong"}">
        <div class="review-item__mark">${r.right ? "✓" : "✗"}</div>
        <div>
          <p class="review-item__q">${i + 1}. ${escapeHtml(r.question)}</p>
          <p class="review-item__a">
            ${r.right
              ? `Answered: <b>${escapeHtml(r.correctText)}</b>`
              : r.chosenText
                ? `You chose <s>${escapeHtml(r.chosenText)}</s> — correct: <b>${escapeHtml(r.correctText)}</b>`
                : `Timed out — correct: <b>${escapeHtml(r.correctText)}</b>`}
          </p>
          <span class="review-item__topic">${escapeHtml(r.topic)}</span>
        </div>
      </div>
    `).join("");

    section.hidden = false;
    section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });

    setTimeout(() => {
      elDonut.style.strokeDashoffset = DONUT_LEN * (1 - pct / 100);
      requestAnimationFrame(tick);
    }, 350);
  }

  btnRetry?.addEventListener("click", () => {
    if (lastSubjectKey) Quiz.start(lastSubjectKey);
  });

  btnOther?.addEventListener("click", () => {
    const courses = $("#courses");
    if (courses) courses.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });

  return { show };
})();

/* ============================================================
   17. WIRE UP COURSE / SUBJECT BUTTONS + THINKING STATES
   ============================================================ */
$$("[data-subject]").forEach(btn => {
  btn.addEventListener("click", async () => {
    await Thinking.show("enroll");
    Quiz.start(btn.dataset.subject);
  });
});

$("#takePlacement")?.addEventListener("click", async () => {
  await Thinking.show("placement");
  const keys = Object.keys(QUESTION_BANK);
  Quiz.start(keys[Math.floor(Math.random() * keys.length)]);
});

$("#heroEnroll")?.addEventListener("click", async (e) => {
  // Let the anchor work, but show thinking if it's a button action
});

$("#ctaEnroll")?.addEventListener("click", async (e) => {
  // Same
});

/* ============================================================
   18. STUDENT ZONE — login form
   ============================================================ */
(() => {
  const form = $("#zoneLogin");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = form.email.value.trim();
    const pass  = form.pass.value.trim();
    if (!email || !pass) {
      const hint = $(".zone__hint", form);
      if (hint) {
        hint.textContent = "Please enter both your ID and password.";
        hint.style.color = "var(--accent)";
      }
      return;
    }
    await Thinking.show("login");
    const btn = $("button[type=submit]", form);
    const original = btn.innerHTML;
    btn.innerHTML = "<span>Welcome! 🎉</span>";
    btn.disabled = true;
    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2200);
  });
})();

/* ============================================================
   19. WHITE PAPER TERMINAL — typewriter showcase
   ============================================================ */
const Terminal = (() => {
  const elCode   = $("#termCode");
  const elOut    = $("#termOut");
  const elTitle  = $("#termTitle");
  const elStatus = $("#termStatus");
  const tabs     = $$(".term-tab");

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

  const TYPE_SPEED = 20;
  const LINE_DELAY = 70;
  const RUN_DELAY  = 500;
  const OUT_DELAY  = 280;
  const LOOP_DELAY = 2200;
  const ORDER = ["java", "cpp", "python"];

  let current = "java";
  let timer = null;
  let cancelled = false;

  function render(typedTokens) {
    let html = "";
    for (const {t, c} of typedTokens) {
      const esc = escapeHtml(t);
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

    await wait(RUN_DELAY);
    if (cancelled) return;

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

    await wait(LOOP_DELAY);
    if (cancelled) return;
    next();
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

  function play(lang) {
    clearTimeout(timer);
    cancelled = true;
    setTimeout(() => {
      current = lang;
      setActiveTab(lang);
      typeSnippet(lang);
    }, 50);
  }

  const startObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        typeSnippet(current);
        obs.disconnect();
      }
    });
  }, { threshold: 0.3 });

  startObserver.observe($(".terminal"));

  tabs.forEach(tab => {
    tab.addEventListener("click", () => play(tab.dataset.term));
  });

  return { play };
})();

/* ============================================================
   20. SHELL PROMPT CTA HOVER EFFECT — removed (static text only now)
   ============================================================ */

/* ============================================================
   21. SMOOTH ANCHOR SCROLLING
   ============================================================ */
$$('a[href^="#"]').forEach(link => {
  link.addEventListener("click", e => {
    const target = $(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });
});

/* ============================================================
   22. INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  Preloader.init();
});
