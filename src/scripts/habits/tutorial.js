const SEEN_KEY = "daily-scorecard-tutorial-v1";
const steps = [
  {
    screen: "today",
    title: "Small habits. Visible progress.",
    description:
      "Habit tracking makes your effort visible, one check-in at a time. In a 2008 study of 1,685 adults, more frequent food logging was associated with greater weight loss. Start small, notice your progress, and keep going. A missed day is a chance to begin again—not a reason to quit.",
    source: {
      label: "Hollis et al., 2008 · Study summary",
      url: "https://pubmed.ncbi.nlm.nih.gov/18617080/",
    },
  },
  {
    screen: "setup",
    title: "Make it your daily scorecard",
    image: {
      src: "/habits-demo.png",
      alt: "Example habit list with editable names and reorder arrows in Settings",
    },
    description:
      "Define the tasks you want to turn into habits: read a page, take a walk, or stretch for a minute. Add them to your daily scorecard in Settings. Start with a few; there's room for eight. You can add, rearrange, or remove habits there anytime.",
  },
  {
    screen: "today",
    title: "Keep it simple",
    description:
      "Do the habit. Tap the circle. That's it. A check mark gives you a little satisfaction now, even when the bigger payoff takes time. Try checking in right after you finish. Need a reminder of your habits? Tap ? to reveal their names. Less time tracking, more time doing.",
    source: {
      label: "James Clear · Why habit tracking helps",
      url: "https://jamesclear.com/habit-tracker",
    },
  },
  {
    screen: "history",
    title: "Past at a Glance",
    image: {
      src: "/past-demo.png",
      alt: "Example daily scorecards with filled and empty completion dots",
    },
    description:
      "Small wins can be easy to forget. Your past scorecards make them visible: filled dots show what you completed, and empty dots show where you can try again. Look back to see your progress. You don't need a perfect record to build a habit.",
  },
  {
    screen: "stats",
    title: "Notice what works",
    image: {
      src: "/insights-demo.png",
      alt: "Example Insights showing perfect days, a longest streak, and a habit to give more attention",
    },
    description:
      "Insights helps you spot patterns: your longest streak, habits you tend to miss, and how often you follow through. Let those patterns guide one small adjustment. Make a habit easier, try a different time, and come back tomorrow. Ready? Pick one small habit and start today.",
  },
];

export function setupTutorial({ setScreen, getScreen, autoShow = true }) {
  const dialog = document.getElementById("tutorial");
  const help = document.getElementById("tutorial-help");
  const back = document.getElementById("tutorial-back");
  const next = document.getElementById("tutorial-next");
  let index = 0;
  let originalScreen;

  function renderStep() {
    const step = steps[index];
    document.getElementById("tutorial-progress").textContent =
      `QUICK TOUR · ${index + 1} / ${steps.length}`;
    document.getElementById("tutorial-title").textContent = step.title;
    document.getElementById("tutorial-description").textContent =
      step.description;
    const image = document.getElementById("tutorial-image");
    image.hidden = !step.image;
    if (step.image) {
      image.src = step.image.src;
      image.alt = step.image.alt;
    } else {
      image.removeAttribute("src");
      image.alt = "";
    }
    dialog.scrollTop = 0;
    const source = document.getElementById("tutorial-source");
    source.hidden = !step.source;
    if (step.source) {
      source.textContent = step.source.label;
      source.href = step.source.url;
    } else {
      source.textContent = "";
      source.removeAttribute("href");
    }
    back.disabled = index === 0;
    next.textContent = index === steps.length - 1 ? "Got it" : "Next";
    setScreen(step.screen);
  }

  function open() {
    if (dialog.open) return;
    originalScreen = getScreen();
    index = 0;
    renderStep();
    dialog.showModal();
    next.focus();
  }

  help.addEventListener("click", open);
  document
    .getElementById("tutorial-close")
    .addEventListener("click", () => dialog.close());
  back.addEventListener("click", () => {
    if (index > 0) {
      index--;
      renderStep();
    }
    // Moving back to step one disables Back; keep keyboard focus in the dialog.
    if (back.disabled) next.focus();
  });
  next.addEventListener("click", () => {
    if (index === steps.length - 1) dialog.close();
    else {
      index++;
      renderStep();
    }
  });
  dialog.addEventListener("close", () => {
    try {
      localStorage.setItem(SEEN_KEY, "true");
    } catch {
      /* Help still works with storage disabled. */
    }
    setScreen(originalScreen);
    help.focus();
  });

  let seen = false;
  try {
    seen = localStorage.getItem(SEEN_KEY) === "true";
  } catch {
    /* Show the tour when a visit cannot be remembered. */
  }
  if (!seen && autoShow) open();
}
