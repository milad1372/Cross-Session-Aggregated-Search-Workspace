# Cross-Session Aggregated Search Workspace (MERN Stack)

This repository implements a **provenance-preserving aggregated search workspace** for **cross-session exploratory search**, as described in:

**Does It Still Make Sense? Organizing, Highlighting, and Summarizing Resources in Cross-Session Aggregated Search** (CHIIR ’26)  
**Milad Momeni** and **Orland Hoeber**

The system aggregates search results from multiple independent platforms and provides workspace features designed to help users **save, organize, and resume** complex search tasks across sessions.

---

## 📚 Overview

The system provides a unified search interface that aggregates results from:

- **Europeana** (Digital Humanities Archive)
- **Ex Libris Primo** (University Academic Library)
- **Wikipedia**

Beyond aggregation, the system includes an **interactive workspace** for cross-session sensemaking. The paper investigates four workspace interface conditions:

- **ICR**: Interactive Cluster Refinement (the base workspace)
- **ICR+IPH**: ICR + Interactive Passage Highlighting
- **ICR+AIS**: ICR + AI-Generated Summarization (with citations)
- **ICR+IPH+AIS**: Combined highlighting + AI summaries (highlights steer the summaries)

---

## ✨ Key Features

### Aggregated Search (SERP)
- Parallel querying across Europeana / Primo / Wikipedia
- Result cards preserve **source provenance** (platform identity)
- Save results directly into a persistent workspace

### Workspace: Interactive Cluster Refinement (ICR)
- Automatically groups saved resources into **thematic clusters** (embedding-based clustering)
- Full user control: **drag-and-drop** items to reorganize, merge/split clusters, reorder clusters, and rename labels

### Interactive Passage Highlighting (ICR+IPH)
- Users can highlight salient passages in saved resources as durable “why I saved this” cues

### AI-Generated Summaries (ICR+AIS)
- Generates concise **workspace-level** and **cluster-level** summaries with **inline citations** back to saved resources
- Summaries are designed to be quickly readable and stable (e.g., low temperature generation)

### Combined Human-AI (ICR+IPH+AIS)
- Highlighted passages are injected into the summarization prompt as an explicit **salience signal**, steering what the AI prioritizes

---

## 🧠 Prompt Design (Prompt Programming)

The summarization prompt is intentionally simple and attribution-focused:

- **System role**: instructs the model to behave as a *concise, domain-expert summariser*.
- **Salience clause**: if highlights are available, the prompt includes a short clause such as  
  “Using the following highlighted keywords: …” (otherwise, it indicates no highlights were provided).
- **Reference mapping**: an optional mapping block provides document IDs for citation.
- **Task constraints**:
  - bullet-point summary by main topic  
  - cite items using **[docId:<id>]**  
  - do **not** mention the source/platform names

Implementation details (server route):
- Model: `gpt-4o-2024-05-13`, temperature `0.4`, with retries and a 1-job concurrency limiter.
- For long inputs, summarization falls back to a hierarchical process (chunk → partial summaries → final summary).

---

## 🧰 Tech Stack

- **MERN stack**: MongoDB, Express.js, React.js, Node.js
- **APIs**:
  - Europeana API
  - Ex Libris Primo API
  - Wikipedia API
- **LLM Summarization**:
  - OpenAI Chat Completions (used only for AIS conditions)

---

## ⚙️ Setup Instructions

### 1) Clone the repository

```bash
git clone https://github.com/milad1372/Search-Result-Aggregation-Approaches.git
cd Search-Result-Aggregation-Approaches
```

### 2) Configure environment variables

> ⚠️ Do not hardcode keys in the repo. Use env vars (recommended) or update your existing `server/config.js`.

#### Option A (recommended): `.env`

Create `server/.env`:

```env
EUROPEANA_API_KEY=XXXX
PRIMO_API_KEY=XXXX
MONGODB_URI=mongodb+srv://...

BASE_URL_EUROPEANA=https://api.europeana.eu/record/v2/search.json
BASE_URL_PRIMO=https://api-na.hosted.exlibrisgroup.com/primo/v1/search
BASE_URL_WIKIPEDIA=https://en.wikipedia.org/w/api.php

# AI summaries (required only for AIS conditions)
OPENAI_API_KEY=XXXX
```

#### Option B: `server/config.js` (legacy pattern)

If your project currently uses `server/config.js`, define your constants there (API keys, DB URI, base URLs), and replace all placeholders with your real credentials.

### 3) Install dependencies & run

#### Server

```bash
cd server
npm install
npm start
```

#### Client

Open a new terminal:

```bash
cd client
npm install
npm start
```

---

## 🧪 Workspace Conditions Implemented

All conditions share the same aggregated search backend and workspace persistence, but differ in cross-session support features:

1. **ICR** — clustering + interactive organization (baseline)
2. **ICR+IPH** — adds persistent user highlights
3. **ICR+AIS** — adds AI summaries with citations
4. **ICR+IPH+AIS** — highlights steer AI summarization (human-in-the-loop)

---

## 🔁 Cross-Session Support (What the system is designed for)

The workspace is intended to support tasks that span multiple sessions:
- Save and organize results in Session 1
- Return later, reacquaint quickly, and continue in Session 2

---

## 📝 Citation

If you use this system in research or teaching, please cite the CHIIR paper:

**Momeni, M., & Hoeber, O. (2026).** *Does It Still Make Sense? Organizing, Highlighting, and Summarizing Resources in Cross-Session Aggregated Search.* In **Proceedings of CHIIR ’26**. (DOI to be added when available.)

### BibTeX (update DOI when published)
```bibtex
@inproceedings{momeni2026crosssession,
  title     = {Does It Still Make Sense? Organizing, Highlighting, and Summarizing Resources in Cross-Session Aggregated Search},
  author    = {Momeni, Milad and Hoeber, Orland},
  booktitle = {Proceedings of the ACM SIGIR Conference on Human Information Interaction and Retrieval (CHIIR '26)},
  year      = {2026},
  publisher = {ACM},
}
```

---

## 📎 License

This project is licensed under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license.  
You are free to share and adapt the material for any purpose, including commercial use, provided appropriate credit is given.

See `LICENSE.md` for details.

---

## 📫 Contact

**Milad Momeni** — miladmomeni@uregina.ca  
University of Regina, Department of Computer Science
