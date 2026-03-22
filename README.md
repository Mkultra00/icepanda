# AIDDS - AI-Driven Due Diligence System

AIDDS (also branded as Ice Panda) is an AI-powered open-source intelligence (OSINT) and due diligence platform designed to help investigators, compliance teams, and researchers conduct thorough background checks on individuals and organizations.

## What It Does

The platform provides four core investigation capabilities:

1. Deep Research - Takes a name, description, or LinkedIn profile screenshot and runs an AI-driven investigation that scans for litigation history, sanctions listings, regulatory actions, adverse media, political exposure, Epstein flight log connections, and other risk indicators. Results are enriched with live web searches to surface publicly available records and news articles.

2. GitHub Integrity Analysis - Analyzes a GitHub repository to determine whether the codebase is legitimately developed or potentially fabricated. It evaluates commit patterns, contributor history, code quality, documentation, dependency usage, and searches for similar repositories to assign a similarity score. It also flags single-day commit histories as a red flag for manufactured portfolios.

3. Photo Identify - Accepts an uploaded photo along with optional context and uses AI vision capabilities to attempt identification and generate a research briefing on the individual depicted.

4. Live Investigation - Provides a real-time research interface where users can input targets and watch the AI compile findings as they stream in.

## Tech Stack

- Frontend: React 18 with TypeScript, built with Vite
- Styling: Tailwind CSS with a custom dark theme and shadcn/ui components
- State Management: TanStack React Query for server state
- Routing: React Router v6
- Animation: Framer Motion for UI transitions
- Backend: Lovable Cloud (Supabase) for edge functions and serverless compute
- AI: Lovable AI-supported models (Google Gemini, OpenAI GPT) for analysis and reasoning
- Web Search: Integrated web search APIs for real-time OSINT enrichment
- Markdown Rendering: react-markdown for formatted report output

## Project Structure

The application is a single-page app with a dashboard landing page that branches into specialized investigation flows. Edge functions handle the AI processing and external API calls server-side, keeping API keys secure. Reports are generated in structured formats with risk assessments, confidence scores, and clickable source links.

## Deployment

The app is deployed via Lovable and published at https://icepanda.lovable.app. Edge functions are automatically deployed to Lovable Cloud.
