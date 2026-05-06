# 🚀 RankLens: SEO Intelligence Platform

RankLens is a professional-grade SEO audit and monitoring platform designed to provide deep insights into website performance, keyword rankings, and social media optimization (YouTube & Instagram). Built with a focus on speed, modularity, and privacy.

---

## 🌟 Key Features

- **Multi-Platform Analysis**: Deep-crawl websites or audit specific YouTube and Instagram content.
- **Keyword Tracking**: Monitor search rankings and historical trends for your projects.
- **AI-Powered Recommendations**: Actionable, priority-ranked advice to improve search dominance.
- **Enterprise Security**: 
    - Full authentication system (Passport.js).
    - User-based data isolation (Your data is yours alone).
    - Built-in Rate Limiting to prevent API abuse.
- **Self-Cleaning Architecture**: Automatic 3-day data TTL (Time-To-Live) to keep the system lightweight and fast.
- **Modern Dashboard**: Responsive, interactive UI with real-time performance metrics.

---

## 🛠 Tech Stack

### Frontend (`/client`)
- **React 19** (Vite-powered for instant HMR)
- **Tailwind CSS** (v4) with **Radix UI** primitives
- **React Query** (TanStack) for robust state management
- **Wouter** for lightweight routing
- **Lucide React** for enterprise iconography

### Backend (`/server`)
- **Node.js** with **Express 5**
- **TypeScript** (Runtime execution via `tsx`)
- **Drizzle ORM** (Type-safe database operations)
- **PostgreSQL** (Hosted on Neon)
- **Passport.js** (Session-based authentication)
- **Pino** (High-performance logging)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20 or higher)
- npm or pnpm
- A PostgreSQL Database URL (Neon.tech recommended)

### 1. Database Setup
1. Create a new PostgreSQL instance.
2. Inside `server/`, create a `.env` file based on your credentials:
   ```env
   DATABASE_URL="your_postgresql_url"
   SESSION_SECRET="your_random_secret_string"
   PORT=8080
   ```

### 2. Installation
Install dependencies in both directories:
```bash
# Install Server dependencies
cd server
npm install

# Install Client dependencies
cd ../client
npm install
```

### 3. Initialize Database
Push the schema to your fresh database:
```bash
cd server
npx drizzle-kit push
```

### 4. Running the Project
Open two terminals:

**Terminal 1 (Backend)**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend)**
```bash
cd client
npm run dev
```

---

## 🤝 Contributing

We welcome contributions! To maintain a high-quality codebase, please follow these steps:

1. **Fork the Repository** and create your feature branch (`git checkout -b feature/AmazingFeature`).
2. **Follow Coding Standards**: We use ESLint and Prettier. Ensure your code is clean and modular.
3. **Commit with Meaning**: Use conventional commits (e.g., `feat: add keyword history chart`).
4. **Push and Pull Request**: Push to your branch and open a PR against the `main` branch.

### Project Standards
- **DRY Logic**: Re-use UI components from `client/src/components/ui`.
- **Type Safety**: Avoid `any` types. Ensure Drizzle schemas and Zod types are updated.
- **Testing**: Verify your changes locally before submitting.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📞 Support

If you encounter bugs or have feature requests, please open an **Issue** on the GitHub repository.

*Happy Ranking!* 📈
