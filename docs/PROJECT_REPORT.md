# StockSim Application: Technical Deep Dive

## 1. Project Overview

**StockSim** is a web-based stock market simulation application designed to provide users with a realistic, risk-free trading experience. Users can create an account, receive virtual funds, and use those funds to buy and sell stocks based on real-world market data. The application features portfolio management, stock watchlists, and detailed transaction history, allowing users to practice trading strategies and learn about the stock market.

The architecture is built on a modern, server-centric web stack that prioritizes performance, scalability, and an excellent user experience.

---

## 2. Technology Stack

This project leverages a curated set of modern technologies to deliver a robust and efficient application.

#### Next.js (React)
*   **Role & Purpose:** The core framework for the application. It handles both the frontend (user interface) and the backend (server-side logic). We use the **App Router** with **React Server Components (RSCs)** to ensure fast initial page loads and reduced client-side JavaScript, leading to better performance.

#### Firebase
*   **Role & Purpose:** Serves as the comprehensive backend-as-a-service (BaaS) platform.
*   **Firebase Authentication:** Securely manages user identity, including registration, sign-in, and profile management.
*   **Firestore:** A NoSQL, cloud-based database used to store all application data, such as user profiles, portfolios, stock holdings, and watchlists.

#### TypeScript
*   **Role & Purpose:** The primary programming language. It adds static typing to JavaScript, which helps prevent common bugs during development, improves code quality, and makes the codebase easier to maintain.

#### ShadCN UI
*   **Role & Purpose:** A component library built on top of Radix UI and Tailwind CSS. It provides a set of accessible, themeable, and unstyled base components (like Cards, Buttons, Tables) that we use to build a consistent and professional user interface.

#### Tailwind CSS
*   **Role & Purpose:** A utility-first CSS framework for styling. It allows for rapid UI development by applying styles directly in the HTML, avoiding the need for separate CSS files and ensuring a consistent design system.

#### Genkit (by Google)
*   **Role & Purpose:** An open-source framework for building AI-powered features. While not currently used for any active feature, it is integrated into the project and ready to be used for future enhancements like an AI stock analyst or a financial Q&A chatbot.

---

## 3. Project Structure: File & Folder Breakdown

This section details the purpose of each file and folder in the project.

### 📁 `docs/`
This directory contains documentation and backend configuration blueprints.

- **`backend.json`**: Acts as a blueprint or Intermediate Representation (IR) for the application's data structures. It defines the schemas for entities like `UserProfile`, `Portfolio`, and `Trade` using JSON Schema. This file is a critical reference for ensuring consistency in data handling and is used to generate security rules and other backend configurations. It does **not** directly interact with the live database.
- **`PROJECT_REPORT.md`**: (This file) The comprehensive technical documentation for the project.

### 📁 `public/`
This folder contains static assets that are publicly accessible, such as images and logos.

- **`logo-dark.png` & `logo-light.png`**: Image files for the application logo, used in the `<Logo>` component and toggled based on the current theme (dark/light).

### 📁 `src/`
The main application source code.

#### 📁 `src/ai/`
Contains all code related to Generative AI functionality, powered by **Genkit**.

- **`genkit.ts`**: Initializes and configures the global Genkit `ai` instance. It sets up the necessary plugins (like `googleAI`) and defines a default AI model to be used across the application.
- **`dev.ts`**: A development server entry point for running and testing Genkit flows locally.

#### 📁 `src/app/`
The core of the **Next.js App Router**. Each folder inside `app` typically corresponds to a URL route.

- **`globals.css`**: The global stylesheet. It includes base styles from **Tailwind CSS** and defines the application's color palette and theme using HSL CSS variables for both light and dark modes. This is the central file for styling customizations.
- **`layout.tsx`**: The root layout for the entire application. It wraps all pages and includes essential providers like `<ThemeProvider>`, `<FirebaseClientProvider>`, and `<Toaster>` to make them available globally. It also defines the main `<html>` and `<body>` tags.
- **`page.tsx`**: The public-facing landing page of the application (the home route `/`). It's a server-rendered page that showcases the app's features to non-authenticated users.

- **📁 `(auth)/`**: A route group for authentication-related pages. The parentheses `()` mean this folder does not add a segment to the URL (e.g., `/login` instead of `/auth/login`).
  - **`layout.tsx`**: A shared layout for all auth pages, providing a centered card layout with the "StockSim" logo.
  - **`login/page.tsx`**: The user sign-in page. It uses `react-hook-form` for form validation and **Firebase Authentication** to handle the sign-in process.
  - **`register/page.tsx`**: The user registration page. It handles new user sign-ups, creates a user profile, and initializes a new portfolio in **Firestore**.
  - **`forgot-password/page.tsx`**: A placeholder page for a password reset flow.

- **📁 `dashboard/`**: The main application area for authenticated users, accessible at `/dashboard`.
  - **`layout.tsx`**: The layout for the entire dashboard. It protects the routes by checking for an authenticated user with the `useUser` hook and redirecting to `/login` if no user is found. It includes the main app header (`<AppHeader>`) and the primary content area.
  - **`page.tsx`**: The main dashboard page (`/dashboard`), which provides a summary view of the user's portfolio, holdings, and recent activity.
  - **`history/page.tsx`**: Displays the user's complete trade history using the `<HistoryTable>` component.
  - **`portfolio/page.tsx`**: Provides a more detailed view of the user's portfolio, including an asset allocation chart.
  - **`profile/page.tsx`**: Allows users to update their username, change their password, and reset their portfolio. It interacts with both **Firebase Authentication** (for password) and **Firestore** (for profile data).
  - **`sell/page.tsx`**: A page that lists the user's current holdings, allowing them to select a stock to sell.
  - **`sell/[ticker]/page.tsx`**: The specific page for selling a stock, identified by its ticker in the URL.
  - **`stock/[ticker]/page.tsx`**: The detailed view for a single stock, showing its chart, key statistics, and providing buy/sell actions.
  - **`trade/page.tsx`**: A dedicated page for searching and buying new stocks.
  - **`watchlist/page.tsx`**: The page for managing stock watchlists. It uses Firestore to create, update, and delete watchlists and the stocks within them.

#### 📁 `src/components/`
This directory contains all the reusable **React** components.

- **📁 `dashboard/`**: Components used specifically within the dashboard layout and pages.
  - **`header.tsx`**: The main application header, containing navigation links, the theme toggle, and the user menu.
  - **`holdings-table.tsx`**: Displays the user's current stock holdings, fetching real-time data from Firestore and stock prices from the data library.
  - **`portfolio-summary.tsx`**: Shows cards with key portfolio metrics like total value and buying power.
  - **`stock-search.tsx`**: A client-side component that enables users to search for stocks by name or ticker within a selected exchange. It uses debouncing to provide fast, real-time search results.
  - **`trade-dialog.tsx`**: A crucial component that handles the logic for both buying and selling stocks. It uses a Firestore transaction to ensure that portfolio updates, holding changes, and trade logging are all performed atomically and safely.
  - **`user-nav.tsx`**: The user dropdown menu in the header for accessing the profile and signing out.
  - **`watchlist.tsx`**: A placeholder component for a simplified watchlist view on the dashboard.

- **📁 `stock/`**: Components specifically for displaying stock information.
  - **`stock-chart.tsx`**: Renders a historical performance chart for a stock using the **Recharts** library.
  - **`stock-details-card.tsx`**: Displays key statistics for a stock, such as market cap, P/E ratio, etc.
  - **`stock-info.tsx`**: The main header card for a stock, showing its ticker, company name, logo, and current price.

- **📁 `ui/`**: Base UI components provided by **ShadCN UI**. These are the building blocks for the entire interface (e.g., `button.tsx`, `card.tsx`, `table.tsx`).

- **`FirebaseErrorListener.tsx`**: A client-side component that listens for custom `permission-error` events and throws them to be caught by Next.js's error overlay, providing rich debugging information for Firestore security rule denials.
- **`icons.tsx`**: A component that dynamically renders the light or dark mode logo.
- **`theme-provider.tsx` & `theme-toggle.tsx`**: Components that manage and allow switching between light and dark themes using `next-themes`.

#### 📁 `src/firebase/`
This is the central hub for all Firebase-related code, designed to be modular and reusable.

- **`config.ts`**: Exports the Firebase project configuration object (`firebaseConfig`), which is used to initialize the Firebase app.
- **`client-provider.tsx`**: A client-side provider that ensures Firebase is initialized only once and provides the necessary contexts to the rest of the app.
- **`index.ts`**: The main entry point for Firebase functionality. It initializes Firebase and exports all necessary hooks and providers (`useAuth`, `useFirestore`, `useUser`, etc.) so that other parts of the app can easily access Firebase services.
- **`provider.tsx`**: The core React Context provider for Firebase. It manages the Firebase app instance, service instances (Auth, Firestore), and the user's authentication state.
- **`auth/use-user.tsx` & `firestore/use-collection.tsx` & `firestore/use-doc.tsx`**: Custom hooks that simplify interacting with Firebase. They handle real-time data fetching, loading states, and errors, making it much easier to work with Firestore and Auth in React components.
- **`errors.ts` & `error-emitter.ts`**: A custom error handling system. `errors.ts` defines `FirestorePermissionError` to create detailed error messages, and `error-emitter.ts` provides a global event emitter to propagate these errors to the UI.

#### 📁 `src/hooks/`
Contains custom React hooks for shared logic.
- **`use-mobile.tsx`**: A hook to detect if the user is on a mobile device.
- **`use-toast.ts`**: A hook for showing toast notifications (pop-up messages) to the user.

#### 📁 `src/lib/`
A directory for utility functions, type definitions, and application-wide data.
- **`data/`**: A structured directory containing all the stock market data. It is organized by exchange (e.g., `NASDAQ`, `NYSE`), with each folder containing a metadata file and individual JSON files for each stock's historical data. This structure is designed for the dynamic file-loading system.
- **`stock-data.ts`**: A critical server-side module responsible for all stock data retrieval. It dynamically reads files from the `src/lib/data/` directory, providing functions to search stocks and get detailed data for a specific ticker without hardcoding any file paths.
- **`types.ts`**: Contains all the core **TypeScript** type definitions for the application's data models (`UserProfile`, `Portfolio`, `StockData`, `Trade`, etc.), ensuring data consistency.
- **`utils.ts`**: A utility file containing helper functions, most notably `cn`, which is used to merge **Tailwind CSS** classes conditionally.

### 📄 Root Files
- **`package.json`**: Lists all project dependencies (like React, Next.js, Firebase) and defines scripts for running, building, and linting the application.
- **`tailwind.config.ts`**: The configuration file for **Tailwind CSS**, where the design system (colors, fonts, spacing) is defined.
- **`next.config.ts`**: The configuration file for **Next.js**, where we can set up image optimization, redirects, and other framework-level settings.
- **`tsconfig.json`**: The configuration file for the **TypeScript** compiler, defining rules for how the code should be checked and compiled.
- **`firestore.rules`**: The security rules for the **Firestore** database. This is a critical file that defines who can read, write, or delete data, ensuring that users can only access and modify their own information.

---
This concludes the detailed report. I hope this provides a clear and thorough understanding of the project's structure and technology. Let me know if you have any questions!
