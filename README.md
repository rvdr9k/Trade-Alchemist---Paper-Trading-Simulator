# TradeAlchemist: A Stock Market Simulation Application

Welcome to StockSim, a realistic, risk-free stock market trading simulator. This application allows users to practice trading strategies, manage a virtual portfolio, and learn about the stock market using real-world data.

## 1. Key Features

- **User Authentication**: Secure sign-up and login functionality powered by Firebase Authentication.
- **Virtual Trading**: Start with $100,000 in virtual cash to buy and sell stocks from various global exchanges.
- **Dynamic Stock Data**: Dynamically loads real-world stock data, including historical prices, for a seamless user experience.
- **Portfolio Management**: A comprehensive dashboard to track your holdings, view performance, and monitor your buying power.
- **Stock Watchlists**: Create and manage multiple watchlists to keep track of stocks you're interested in.
- **Trade History**: A complete log of all your buy and sell transactions.
- **Stock Details**: View detailed charts, key statistics, and company information for any stock.
- **Light & Dark Mode**: A modern, themeable interface for a comfortable viewing experience.

---

## 2. Technology Stack

This project is built with a modern, high-performance technology stack:

- **Framework**: [Next.js](https://nextjs.org/) (with App Router and React Server Components)
- **Programming Language**: [TypeScript](https://www.typescriptlang.org/)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit) (ready for future AI features)
- **Charting**: [Recharts](https://recharts.org/)
- **Form Management**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

---

## 3. Getting Started: Running Locally

To get the application running on your local machine, follow these steps.

**Prerequisites:**
- Node.js (v18 or later)
- npm

**Step 1: Install Dependencies**

Navigate to the project's root directory and install all the required packages.

```bash
npm install
```

**Step 2: Run the Development Server**

Once the dependencies are installed, you can start the Next.js development server.

```bash
npm run dev
```

The application will start on port `9002` by default. Open your browser and go to:

[http://localhost:9002](http://localhost:9002)

You should now see the StockSim landing page.

---

## 4. Project Structure

The project is organized to be modular and scalable, with a clear separation of concerns.

- **`/docs`**: Contains documentation, including a detailed `PROJECT_REPORT.md` and the `backend.json` data schema blueprint.
- **`/public`**: Static assets like logos and images.
- **`/src/ai`**: Genkit initialization and configuration for AI-powered features.
- **`/src/app`**: The core of the Next.js application, using the App Router.
  - **`/(auth)`**: Routes for authentication (login, register).
  - **`/dashboard`**: Protected routes for the main user dashboard and trading features.
- **`/src/components`**: Reusable React components, organized by feature (`dashboard`, `stock`) and the base `ui` components from ShadCN.
- **`/src/firebase`**: All Firebase-related logic, including configuration, providers, and custom hooks.
- **`/src/hooks`**: Custom React hooks used across the application.
- **`/src/lib`**: Core application logic, utilities, and data.
  - **`/data`**: Contains the stock market data, organized by exchange in subdirectories. This is where you can add new stock files.
  - **`stock-data.ts`**: The dynamic data-loading module that reads and serves stock information from the `/data` directory.
  - **`types.ts`**: TypeScript type definitions for all major data structures.

---

This README provides a high-level guide to the StockSim application. For a more exhaustive technical breakdown, please refer to the `docs/PROJECT_REPORT.md` file.
