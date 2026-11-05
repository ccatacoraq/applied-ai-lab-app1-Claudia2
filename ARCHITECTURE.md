# Application Architecture

RevLens is an executive sales analytics platform that processes sales order datasets to provide commercial leaders with instant visibility into regional performance, quarter-over-quarter swings, and year-over-year revenue growth. Users can upload their own CSV datasets or choose from curated presets to inspect interactive revenue matrices, product/channel breakdowns, and unit volume shifts. The platform pairs rigorous client-side data hygiene and deterministic mathematical calculations with a secure server-side Gemini AI integration to produce concise, three-sentence variance summaries strictly grounded in verified ledger metrics—empowering decision-makers with reliable, audit-proof sales intelligence.

## File Inventory

| File Path | Description |
| :--- | :--- |
| `.env.example` | Provides an environment variable template documenting required configuration keys, such as `GEMINI_API_KEY`, without exposing sensitive secrets. |
| `.gitignore` | Specifies untracked files and directories, such as build artifacts and dependencies, that Git should exclude from version control. |
| `bun.lock` | A dependency lockfile recording the exact dependency versions resolved during package installation. |
| `index.html` | The HTML entry document configuring page titles, metadata tags, Google Fonts, and the root DOM element for the React application. |
| `metadata.json` | Stores AI Studio platform configuration, including application branding, descriptions, and server-side Gemini API permissions. |
| `package.json` | Outlines project dependencies, runtime configurations, and lifecycle scripts for building, linting, and running the application. |
| `public/assets/aistudio/Lab_1_-_Regional_Sales_de1de499.csv` | A benchmark sales order dataset used for initial demonstration, data validation, and exploratory analysis. |
| `server.ts` | The backend Express server responsible for hosting the application, mounting Vite development middleware, and executing server-side Gemini AI summarization requests. |
| `src/App.tsx` | The central React component managing user state, CSV upload workflows, interactive SVG charts, data grid filtering, and AI commentary rendering. |
| `src/index.css` | The global stylesheet that imports Tailwind CSS and standardizes font definitions and tabular numeral formatting across analytics components. |
| `src/main.tsx` | The browser runtime entry point that initializes and renders the React application tree into the HTML document. |
| `src/utils/salesAnalytics.ts` | The core analytical utility suite that parses raw CSV data, normalizes text inconsistencies, computes financial matrices and year-over-year trends, and prepares strict payloads for AI analysis. |
| `tsconfig.json` | Configures TypeScript compiler settings, type checking, path aliases, and module resolution rules for the project. |
| `vite.config.ts` | Configures the Vite build tool and development server, integrating React plugins and Tailwind CSS processing. |
