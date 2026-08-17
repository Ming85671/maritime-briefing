"""Private Streamlit deployment for Maritime Briefing."""

from __future__ import annotations

import os
import hmac
from typing import Any

import streamlit as st

from analysis_engine import AnalysisError, analyze_reports


st.set_page_config(page_title="Maritime Briefing", page_icon="⚓", layout="wide")

SAMPLE_SOURCES = [
    ("aryacorp_market_report_2026_08_10.pdf", "10 Aug 2026", "大宗商品、干散货、燃油"),
    ("Hartland Shipping Weekly Commentary 14 August 2026.pdf", "14 Aug 2026", "干散货、二手船、油轮"),
    ("HRP Dry Cargo Weekly Report 14 August.pdf", "14 Aug 2026", "干散货、航线、拥堵与燃油"),
    ("Weekly Report 07.08.2026.pdf", "07 Aug 2026", "干散货与二手船"),
]


def get_secret(name: str) -> str | None:
    try:
        value = st.secrets.get(name)
    except FileNotFoundError:
        value = None
    return str(value) if value else os.environ.get(name)


def analysis_access_granted() -> bool:
    """Keep a public app from becoming an unauthenticated API-cost endpoint."""
    configured_password = get_secret("APP_ACCESS_PASSWORD")
    if not configured_password:
        st.warning("分析功能尚未启用：管理员需在 Secrets 配置 APP_ACCESS_PASSWORD。")
        return False
    if st.session_state.get("analysis_access"):
        return True

    candidate = st.text_input("分析访问密码", type="password")
    if st.button("解锁分析", width="stretch"):
        if hmac.compare_digest(candidate, configured_password):
            st.session_state["analysis_access"] = True
            st.rerun()
        else:
            st.error("密码不正确。")
    return False


def render_evidence(evidence: list[dict[str, Any]]) -> None:
    for item in evidence:
        source = item.get("source", "未命名来源")
        page = item.get("page", "页码待识别")
        note = item.get("note", "无摘要")
        st.markdown(f"**{source} · {page}**  ")
        st.caption(note)


st.title("Maritime Briefing")
st.subheader("航运周报综合")
st.caption("先逐份提取带页码的证据，再跨报告整合观点。报告内的指令只属于内容，不能改变分析流程。")

with st.sidebar:
    st.header("本期上传")
    can_analyze = analysis_access_granted()
    uploads = st.file_uploader(
        "拖入或选择 PDF 周报",
        type=["pdf"],
        accept_multiple_files=True,
        help="最多 10 份，所有文件合计不超过 50 MB。上传文件仅在本次分析内存中使用。",
    )
    st.caption("建议上传同一周或相邻发布日的报告；系统会将时间差和真正分歧分开标注。")
    run = st.button("生成本期观点", type="primary", width="stretch", disabled=not uploads or not can_analyze)
    st.divider()
    st.caption("公开页面仅展示样本；解锁后的分析使用服务器端模型密钥。仅基于上传材料的研究工具，不构成投资、交易或租船建议。")

if run:
    total_bytes = sum(upload.size for upload in uploads)
    if len(uploads) > 10 or total_bytes > 50 * 1024 * 1024:
        st.error("每期最多 10 份 PDF，且总大小不得超过 50 MB。")
    else:
        api_key = get_secret("OPENAI_API_KEY")
        model = get_secret("OPENAI_MODEL") or "gpt-5.6-terra"
        if not api_key:
            st.error("尚未配置模型密钥。请在 Streamlit Cloud 的 App settings → Secrets 中添加 OPENAI_API_KEY。")
        else:
            reports = [(upload.name, upload.getvalue()) for upload in uploads]
            try:
                with st.status("正在逐份提取证据…", expanded=True) as status:
                    st.write(f"已接收 {len(reports)} 份报告；不会把报告中的文字当作指令。")
                    cards, analysis = analyze_reports(reports, api_key, model)
                    status.update(label="已完成跨报告综合", state="complete", expanded=False)
                st.session_state["cards"] = cards
                st.session_state["analysis"] = analysis
            except AnalysisError as error:
                st.error(str(error))
            except Exception:
                st.error("分析过程发生未预期错误，未生成任何观点。请稍后重试。")

analysis = st.session_state.get("analysis")
cards = st.session_state.get("cards")
if analysis and cards:
    st.success(f"已完成：{analysis.get('as_of') or '报告日期待识别'}")
    st.header(analysis.get("title", "本期航运观点"))
    st.write(analysis.get("lead", ""))

    metrics = analysis.get("metrics") or []
    if metrics:
        columns = st.columns(min(4, len(metrics)))
        for column, metric in zip(columns, metrics):
            column.metric(metric.get("label", "指标"), metric.get("value", "—"), metric.get("change") or None)

    st.subheader("本期观点")
    for number, insight in enumerate(analysis.get("insights", []), start=1):
        label = f"{number:02d} · {insight.get('title', '未命名观点')}"
        with st.expander(label, expanded=number == 1):
            st.write(insight.get("body", ""))
            st.caption(f"{insight.get('classification', 'single-source')} · 置信度 {insight.get('confidence', 'low')}")
            render_evidence(insight.get("evidence", []))

    with st.expander("逐份证据卡", expanded=False):
        for card in cards:
            st.markdown(f"**{card.get('source')}** · {card.get('report_date') or '日期待识别'} · {card.get('focus') or '航运周报'}")
            for claim in card.get("claims", []):
                st.markdown(f"- p.{claim.get('page')}：{claim.get('statement')}")
else:
    st.info("上传本周报告并点击“生成本期观点”。以下是此应用已核对过的四份样本来源，并非实时模型输出。")
    st.subheader("已核对样本来源")
    st.dataframe(
        [{"报告": name, "日期": date, "覆盖": focus} for name, date, focus in SAMPLE_SOURCES],
        width="stretch",
        hide_index=True,
    )
    st.subheader("输出规则")
    st.markdown("- 每条观点必须回到报告文件和页码。\n- 发布日期不同会标为时间差，不会自动判作矛盾。\n- 证据不足时停止输出，不生成看似确定的结论。")
