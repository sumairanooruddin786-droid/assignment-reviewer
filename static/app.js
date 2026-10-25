(() => {
  const $ = (id) => document.getElementById(id);
  const answer = $("answer"), submit = $("submit"), errBox = $("error");
  let rubric = [];

  const SAMPLES = [
    ["Strong answer", "Supervised learning uses labeled data, such as emails labeled spam or not spam. Unsupervised learning finds patterns in unlabeled data, such as grouping customers by purchasing behavior."],
    ["Partial answer", "Supervised learning trains a model on labeled data, for example classifying emails as spam or not spam. Unsupervised learning is the other type of machine learning."],
    ["Weak answer", "Machine learning is when computers learn things from data."]
  ];

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const showError = (m) => { errBox.textContent = m; errBox.hidden = !m; };

  function setRoute(route) {
    const on = (id, v) => $(id).classList.toggle("on", v);
    ["e-in", "n-dec"].forEach((id) => on(id, !!route));
    on("n-teacher", route === "teacher_review");
    on("e-teacher", route === "teacher_review");
    on("n-finish", route === "finish");
    on("e-finish", route === "finish");
  }

  function show(r) {
    $("empty").hidden = true;
    const box = $("result");
    box.hidden = false;
    box.classList.remove("pop"); void box.offsetWidth; box.classList.add("pop");
    $("score").textContent = r.score + "/" + r.max_score;
    const st = $("status");
    st.textContent = r.status;
    st.className = "status " + r.route;
    $("feedback").textContent = r.feedback;

    const list = $("rubric");
    list.replaceChildren();
    rubric.forEach((item) => {
      const got = r.breakdown[item.key] ?? 0;
      const li = el("li");
      li.append(el("span", "name", item.label), el("span", "val", got + " / " + item.max));
      const segs = el("div", "segs");
      segs.style.gridTemplateColumns = "repeat(" + item.max + ", 1fr)";
      for (let i = 0; i < item.max; i++) segs.append(el("span", "seg" + (i < got ? " f" : "")));
      li.append(segs);
      list.append(li);
    });
    setRoute(r.route);
  }

  async function run() {
    showError("");
    const text = answer.value.trim();
    if (!text) { showError("Please enter an answer."); answer.focus(); return; }
    submit.disabled = true; submit.textContent = "Reviewing…";
    setRoute(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed (" + res.status + ").");
      show(data);
    } catch (e) {
      showError(e.message || "Could not reach the server. Is it running?");
    } finally {
      submit.disabled = false; submit.textContent = "Review my answer";
    }
  }

  fetch("/api/question").then((r) => r.json()).then((d) => {
    $("question").textContent = d.question;
    rubric = d.rubric;
  }).catch(() => { $("question").textContent = "Could not load the question. Is the server running?"; });

  SAMPLES.forEach(([label, text]) => {
    const b = el("button", "", label);
    b.type = "button";
    b.onclick = () => { answer.value = text; answer.dispatchEvent(new Event("input")); answer.focus(); };
    $("samples").append(b);
  });
  answer.addEventListener("input", () => { $("count").textContent = answer.value.length + " / 3000"; });
  answer.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run(); });
  submit.addEventListener("click", run);
})();
