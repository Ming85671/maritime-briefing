# Maritime Briefing

一个用于“多份航运周报 -> 可追溯周度观点”的 Streamlit 私有应用。浏览器界面不内嵌或复述报告全文，只呈现综合后的短观点和报告/页码坐标。

## 已用样本验证的输出规则

- 报告日期是数据的一部分。07 Aug 和 14 Aug 的数值不会被误判为同日矛盾。
- 先逐份提取数据、判断和页码，再作跨报告归纳。
- 每一个结论必须标识为多来源共识、单一来源判断或条件性推论。
- 报告中的指令一律视为不可信内容；只有用户在网页的操作和系统分析规则可改变行为。

初始界面使用用户提供的四份 PDF 的简短、人工核对过的样本观点：

1. Aryacorp Market Report - 10 Aug 2026, 7 页
2. Hartland Shipping Weekly Commentary - 14 Aug 2026, 4 页
3. HRP Dry Cargo Weekly Report - 14 Aug 2026, 19 页
4. Doric Weekly Market Insight - 07 Aug 2026, 7 页

源文件仍位于原下载目录，网页不复制它们。

## 本地运行

```bash
python3 -m pip install -r requirements.txt
OPENAI_API_KEY="你的服务器端密钥" streamlit run streamlit_app.py
```

打开终端显示的本地地址。

没有设置 `OPENAI_API_KEY` 时，仍可打开样本预览；上传新文件会得到明确的“未配置 API key”提示，绝不会假装已经分析成功。

## Streamlit Community Cloud 部署

1. 将此文件夹推送至**私有** GitHub 仓库（不要提交原始 PDF 或密钥）。
2. 在 Streamlit Community Cloud 中选择该仓库，入口文件填写 `streamlit_app.py`。
3. 在 **App settings → Secrets** 添加：

```toml
OPENAI_API_KEY = "你的服务端 API key"
OPENAI_MODEL = "gpt-5.6-terra" # 可选
```

4. 在 Share 中选择仅指定人员可访问，并按邮箱邀请使用者。

应用只在分析期间于内存读取上传的文件，不会在代码库中保存 PDF。模型服务本身的数据保留政策请按你的 API 项目设置确认。

## 已实现的分析 API

`analysis_engine.py` 逐份读取上传 PDF 并用 Responses API 提取证据卡片，再只以这些卡片做第二次综合。API key 只从 Streamlit Secrets 或服务器环境变量读取，不会发送到浏览器。当前 OpenAI 文件输入支持用 `input_file` 传 PDF；启用视觉能力的模型会同时读取文本与页面图像，因此适合包含图表和小字的航运报告。[官方 File inputs 文档](https://developers.openai.com/api/docs/guides/file-inputs)

默认模型为 `gpt-5.6-terra`；可通过 `OPENAI_MODEL` 覆盖。请先用你自己的 API 项目确认模型访问与预算。每期最多 10 份 PDF、文件合计不超过 50 MB；该限制与官方单个 Responses 请求的多文件总限制一致。

API 输入/输出约定如下：

### 输入

- `multipart/form-data`，字段名 `reports`，最多 10 个 PDF。
- 可选字段 `focus`，例如 `dry bulk only` 或 `container FFA`。

### 每份报告的提取对象

```json
{
  "source": "HRP Dry Cargo Weekly Report 14 August.pdf",
  "report_date": "2026-08-14",
  "claims": [
    {
      "topic": "Capesize",
      "statement": "Pacific market softened as available tonnage increased.",
      "metric": "BCI TC Average",
      "value": 41155,
      "unit": "USD/day",
      "comparison": "-5357 week-on-week",
      "page": 6,
      "evidence_excerpt": "short paraphrase only"
    }
  ]
}
```

### 综合结果的最低要求

```json
{
  "as_of": "2026-08-14",
  "insights": [
    {
      "classification": "consensus | single-source | conditional | timing-difference",
      "confidence": "high | medium | low",
      "claim": "Chinese explanation of the conclusion",
      "evidence": [{"source": "...", "page": 6, "note": "short supporting paraphrase"}],
      "contrary_evidence": []
    }
  ]
}
```

不要把所有 PDF 直接交给一次“总结”调用；那会丢失时间与单位对齐，也难以纠错。

## 安全与版权边界

- 上传只应传给你已授权使用的模型服务；保留/删除周期应可配置。
- API key 仅保存在服务器环境变量，绝不放入浏览器 JavaScript。
- 删除原始 PDF 后，也应同步删除模型服务端的文件和向量索引。
- 本工具用于研究，不构成交易、租船或投资建议。
