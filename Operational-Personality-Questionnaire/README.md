# Architecture of Scale – Diagnostic Tool

A config-driven, Hebrew-first business scalability diagnostic tool. Users answer a contextual questionnaire (14-16 questions) and receive a personalised management report identifying their operational pattern, strengths, risks and a concrete action plan.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Routing:** React Router v7 (HashRouter)
- **Backend:** Supabase (Postgres + Row Level Security)
- **Edge Functions:** Supabase Edge Functions (Deno)
- **Automations:** Make.com (report delivery via email)
- **Language:** Hebrew (RTL-first)

## Getting Started

### Prerequisites

- Node.js >= 18

### Install dependencies

```bash
npm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Required variables:

| Variable                | Description                            |
| ----------------------- | -------------------------------------- |
| `VITE_SUPABASE_URL`    | Supabase project URL                   |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) key      |
| `VITE_PUBLIC_APP_URL`   | Public base URL (for OG tags & links) |
| `VITE_PAYMENT_URL`      | Payment link (Sumit / Stripe / etc.)  |

### Run locally

```bash
npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

## Project Structure

```
├── App.tsx                  # Main app with routing
├── index.tsx                # React DOM entry point
├── types.ts                 # Shared TypeScript types
├── pages/                   # Page components
│   ├── Intro.tsx            # Welcome / intro screen
│   ├── LeadForm.tsx         # Name + email capture
│   ├── DiagnosticChat.tsx   # Questionnaire flow
│   ├── FinalReport.tsx      # Report generation & display
│   └── LandingPage.tsx      # Post-report sales landing page
├── components/              # Reusable UI components
│   └── landing/             # Landing page section components
├── engine/                  # Business logic
│   ├── scoring.ts           # Score calculation & normalisation
│   ├── patterns.ts          # Management pattern detection
│   ├── branching.ts         # Adaptive question branching
│   ├── flags.ts             # Risk flag computation
│   ├── report.ts            # Report text generation
│   └── scale.ts             # Scale inference
├── config/                  # Configuration & copy
│   ├── diagnosticConfig.ts  # Questions, answers, scoring
│   ├── patternCopy.ts       # Report copy per pattern
│   ├── landingCopy.ts       # Landing page copy per pattern
│   └── designSystem.ts      # UI tokens & cluster metadata
├── lib/                     # Utilities
│   └── supabase.ts          # Supabase client
├── src/lib/                 # Additional utilities
│   ├── reportToken.ts       # Secure token generation
│   ├── buildReportLink.ts   # Public report URL builder
│   └── makeSendReport.ts    # Make.com trigger
├── styles/                  # Stylesheets
│   └── main.css             # Tailwind entry point
└── supabase/                # Supabase config & migrations
    ├── leads_table.sql      # Leads table DDL
    └── functions/            # Edge Functions
        └── trigger-send-report/
```

## Database Setup

See [supabase/README.md](supabase/README.md) for instructions on creating the `leads` table and deploying the Edge Function.

## License

Private – all rights reserved.
