const sampleReports = [
  { name: "aryacorp_market_report_2026_08_10.pdf", date: "10 Aug 2026", pages: 7, focus: "大宗商品、干散货、燃油" },
  { name: "Hartland Shipping Weekly Commentary 14 August 2026.pdf", date: "14 Aug 2026", pages: 4, focus: "干散货、二手船、油轮" },
  { name: "HRP Dry Cargo Weekly Report 14 August.pdf", date: "14 Aug 2026", pages: 19, focus: "干散货、航线、拥堵与燃油" },
  { name: "Weekly Report 07.08.2026.pdf", date: "07 Aug 2026", pages: 7, focus: "干散货与二手船" },
];

const sampleMetrics = [
  { label: "BCI / Capesize TC", value: "$41,155", change: "WoW -$5,357", direction: "negative" },
  { label: "BPI / Panamax TC", value: "$20,055", change: "WoW -$629", direction: "negative" },
  { label: "BSI / Supramax TC", value: "$20,508", change: "WoW +$250", direction: "positive" },
  { label: "BHSI / Handysize TC", value: "$15,579", change: "WoW -$150", direction: "negative" },
];

const sampleInsights = [
  {
    title: "Capesize 短期转为偏弱，关键不是铁矿绝对价格而是 Pacific 可用船与矿商参与度。",
    body: "14 Aug 的 Capesize TC 为 $41,155，周降 $5,357；HRP 记录 C5 从周初 $16.23/t 下至周中约 $13.58/t，尽管大西洋 C3 相对坚挺。",
    evidence: [
      { source: "HRP Dry Cargo Weekly Report", page: "p.5-6", note: "Pacific tonnage 增加、矿商竞价偏弱；C5 和 C10 回落。" },
      { source: "Hartland Weekly Commentary", page: "p.2", note: "BCI $41,155，较前周下降 $5,357；Pacific 偏弱。" },
    ],
  },
  {
    title: "Panamax 没有形成新的趋势上行：Atlantic 走弱，Pacific 的天气支撑正在消退。",
    body: "HRP 指出 Atlantic 的矿货强势逐步消退、prompt tonnage 增加；Pacific 曾因天气延误走强，但周末动能放缓。Hartland 的 BPI 同样周降 $629。",
    evidence: [
      { source: "HRP Dry Cargo Weekly Report", page: "p.7", note: "Atlantic correction；Pacific 的替代船需求随天气积压清除而放缓。" },
      { source: "Hartland Weekly Commentary", page: "p.2", note: "BPI $20,055，周降 $629。" },
    ],
  },
  {
    title: "Supramax / Handysize 是区域市场：大西洋、北美或有支撑，亚洲和印度洋仍受船位压力。",
    body: "Supramax 指数整体仅小幅走高，但来自美国湾和部分 Atlantic 航线；亚洲 3TC 仍偏弱。Handysize 整体保持平静，Atlantic 货量有限。",
    evidence: [
      { source: "Hartland Weekly Commentary", page: "p.2", note: "BSI +$250；美国湾至印度货表现突出，Handysize 基本稳定。" },
      { source: "HRP Dry Cargo Weekly Report", page: "p.9, p.11, p.13", note: "Pacific/Indian Ocean 货量有限，区域间强弱分化。" },
      { source: "Doric Weekly Market Insight", page: "p.4-5", note: "07 Aug 时亚洲 Supramax 偏弱，Handysize 整体谨慎。" },
    ],
  },
  {
    title: "黑海粮运是“短期货量损失 vs. 中期吨海里替代”的条件性机会，不能直接等同为利多。",
    body: "黑海港口中断先压制东地中海 geared cargo；只有当进口方真正转向 ECSA 或 US Gulf 时，更远的替代航程才可能抵消损失。",
    evidence: [
      { source: "HRP Dry Cargo Weekly Report", page: "p.3-4", note: "报告列出 Black Sea 货量下降及替代来源的吨海里逻辑，同时明确说明不会一比一替代。" },
    ],
  },
  {
    title: "Hormuz / 红海仍是风险溢价而非确定的运力收缩；保险报价和船东选择将影响印度洋航线。",
    body: "各报告都把中东安全形势列为不确定性，但可见结论是船东选择和 AWRP 会受到影响，而不是可直接量化的全面供给冲击。",
    evidence: [
      { source: "Hartland Weekly Commentary", page: "p.1", note: "将 Hormuz 和红海局势列为持续的航运风险。" },
      { source: "HRP Dry Cargo Weekly Report", page: "p.13", note: "Hormuz 交通与保险报价继续影响 Persian Gulf / Indian Ocean 交易。" },
      { source: "Aryacorp Market Report", page: "p.1, p.5", note: "将相关局势与风险溢价、船位行为联系，但提示其非货量需求驱动。" },
    ],
  },
];

let reports = [...sampleReports];
let selectedFiles = null;
let selectedInsight = 0;
let activeMetrics = [...sampleMetrics];
let activeInsights = [...sampleInsights];

const sourceList = document.querySelector("#source-list");
const sourceCount = document.querySelector("#source-count");
const metricGrid = document.querySelector("#metric-grid");
const insightList = document.querySelector("#insight-list");
const evidenceTitle = document.querySelector("#evidence-title");
const evidenceSummary = document.querySelector("#evidence-summary");
const evidenceList = document.querySelector("#evidence-list");
const input = document.querySelector("#report-input");
const dropZone = document.querySelector("#drop-zone");
const toast = document.querySelector("#toast");

function renderSources() {
  sourceCount.textContent = reports.length;
  sourceList.innerHTML = reports.map((report, index) => `
    <li class="source-item">
      <span class="source-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="source-name" title="${escapeHtml(report.name)}">${escapeHtml(report.name)}</span>
      <span class="source-meta">${report.date || "待识别"}${report.pages ? ` / ${report.pages} 页` : ""}</span>
      <span class="source-badge">${report.focus || "待分析"}</span>
    </li>
  `).join("");
}

function renderMetrics() {
  metricGrid.innerHTML = activeMetrics.map(metric => `
    <article class="metric">
      <span class="metric-label">${metric.label}</span>
      <strong class="metric-value">${metric.value}</strong>
      <span class="metric-change ${metric.direction === "positive" ? "positive" : ""}">${metric.change}</span>
    </article>
  `).join("");
}

function renderInsights() {
  insightList.innerHTML = activeInsights.map((insight, index) => `
    <li class="insight">
      <div>
        <h3>${insight.title}</h3>
        <p>${insight.body}</p>
      </div>
      <button class="evidence-button ${selectedInsight === index ? "active" : ""}" type="button" data-index="${index}">查看证据 ${insight.evidence.length}</button>
    </li>
  `).join("");
  document.querySelectorAll(".evidence-button").forEach(button => {
    button.addEventListener("click", () => showEvidence(Number(button.dataset.index)));
  });
}

function showEvidence(index) {
  selectedInsight = index;
  const insight = activeInsights[index];
  evidenceTitle.textContent = `观点 ${String(index + 1).padStart(2, "0")}`;
  evidenceSummary.textContent = insight.title;
  evidenceList.innerHTML = insight.evidence.map(item => `
    <div class="evidence">
      <strong>${item.source}</strong>
      <span>${item.page}</span>
      <p>${item.note}</p>
    </div>
  `).join("");
  renderInsights();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 5000);
}

function setReports(files) {
  const validFiles = [...files].filter(file => file.name.toLowerCase().endsWith(".pdf"));
  if (!validFiles.length) {
    showToast("请选择 PDF 文件。");
    return;
  }
  if (validFiles.length > 10 || validFiles.reduce((total, file) => total + file.size, 0) > 50 * 1024 * 1024) {
    showToast("最多 10 份 PDF，且本期文件总计不得超过 50 MB。");
    return;
  }
  reports = validFiles.map(file => ({ name: file.name, date: "待分析", pages: null, focus: "等待生成" }));
  selectedFiles = validFiles;
  renderSources();
  showToast(`已加入 ${reports.length} 份报告。点击“生成本期观点”开始分析。`);
}

input.addEventListener("change", event => setReports(event.target.files));
dropZone.addEventListener("dragover", event => { event.preventDefault(); dropZone.classList.add("dragging"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", event => { event.preventDefault(); dropZone.classList.remove("dragging"); setReports(event.dataTransfer.files); });

document.querySelector("#clear-reports").addEventListener("click", () => {
  reports = [];
  selectedFiles = null;
  input.value = "";
  renderSources();
  showToast("已清空。可继续拖入新的 PDF。 ");
});

function applyAnalysis(result) {
  reports = result.sources.map(source => ({
    name: source.name,
    date: source.date || "待识别",
    pages: source.pages,
    focus: source.focus || "航运周报",
  }));
  activeMetrics = Array.isArray(result.analysis.metrics) ? result.analysis.metrics : [];
  activeInsights = result.analysis.insights;
  selectedInsight = 0;
  document.querySelector("#run-stamp span").textContent = "本期分析";
  document.querySelector("#run-stamp strong").textContent = result.analysis.as_of || "日期待识别";
  document.querySelector("#source-window").textContent = `统一时点：${result.analysis.as_of || "报告日期待识别"}`;
  document.querySelector("#metrics-title").textContent = `${result.analysis.as_of || "本期"} 干散货快照`;
  document.querySelector("#brief-title").textContent = result.analysis.title;
  document.querySelector("#brief-lead").textContent = result.analysis.lead;
  renderSources();
  renderMetrics();
  showEvidence(0);
}

async function requestAnalysis(button) {
  const formData = new FormData();
  selectedFiles.forEach(file => formData.append("reports", file));
  button.disabled = true;
  button.textContent = "正在提取证据…";
  try {
    const response = await fetch("/api/analyse", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "分析请求失败。");
    applyAnalysis(payload);
    document.querySelector("#brief-title").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("已完成逐份证据提取与跨报告综合。 ");
  } catch (error) {
    showToast(error.message || "分析请求失败，请检查本地服务。 ");
  } finally {
    button.disabled = false;
    button.textContent = "生成本期观点";
  }
}

document.querySelector("#analyse-button").addEventListener("click", async event => {
  if (!reports.length) {
    showToast("请先加入至少一份 PDF 报告。");
    return;
  }
  const onlySamples = !selectedFiles && reports.length === sampleReports.length && reports.every(report => sampleReports.some(sample => sample.name === report.name));
  if (onlySamples) {
    showEvidence(0);
    document.querySelector("#brief-title").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("已加载基于四份样本报告的可核查观点。 ");
  } else if (selectedFiles) {
    await requestAnalysis(event.currentTarget);
  } else {
    showToast("请重新选择要分析的 PDF 文件。 ");
  }
});

renderSources();
renderMetrics();
showEvidence(0);
