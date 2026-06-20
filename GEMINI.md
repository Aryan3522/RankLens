## Project guide (read first)

**Read [`RANKLENS_ENGINEERING_GUIDE.md`](./RANKLENS_ENGINEERING_GUIDE.md) before answering questions or writing code.** It is the single source of truth for the tech stack (React 19 + **Vite**, NOT Next.js), the full folder structure, and the design rules (skeuomorphic graphite UI, 4× spacing, responsive + 3D conventions) — so you don't hallucinate structure or styles that don't exist. Product mission/principles are in `RANKLENS_PRODUCT_GUIDELINES.md`.

## graphify-ts

IMPORTANT: This project has a graphify-ts knowledge graph. You MUST follow these rules:

1. **BEFORE answering ANY codebase question**, start with the graph tool that matches the question:
   - `retrieve` for "how does X work?" and other direct codebase questions
   - `relevant_files` for "which files should I open first?"
   - `feature_map` for "what parts of the codebase are involved?"
   - `risk_map` before editing to see likely hotspots
   - `implementation_checklist` for edit order and validation checkpoints
   - `impact` for "what breaks if I change X?"
2. **Do NOT search the codebase with other tools first** for codebase questions.
3. **Only fall back to raw file tools** if the graph tools cannot answer the question or the MCP server is unavailable. In that case, read graphify-out/GRAPH_REPORT.md first.
