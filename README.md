# Expense Tracker 🚜

A comprehensive farm management application built with **Next.js 14**, **Firebase**, and **Tailwind CSS**. This application is designed to help farm owners manage expenses, plantation activities, and staff payments with ease. It supports **English** and **Kannada** languages and features voice-command input for easy data entry.

## 🌟 Key Features

### 1. 💰 Expense Diary (`/expenses`)
- **Voice-Activated Entry**: Just tap the mic and speak (e.g., "Milan Food 500"). The app automatically detects the category (Food, Salary, Fuel, etc.) and amount.
- **Categorization**: Visual categories with color codes. Custom categories can be added on the fly.
- **Reports**: View monthly or yearly expense breakdowns with interactive pie charts.
- **Export**: Download expense reports as CSV.

### 2. 🌱 Plantation Manager (`/plantation`)
- **Activity Tracking**: Record daily farm activities like Pruning, Harvesting, Manuring, and Weeding.
- **Cost Calculation**: Auto-calculates total cost based on Duration × People × Wage.
- **Income Tracking**: Record sales (Coffee, Pepper) to track profitability.
- **Profit/Loss Analysis**: Yearly reports showing Total Expense vs. Total Income.

### 3. 👥 Staff & Stay Manager (`/stay-manager`)
- **Daily Wage Entry**: Track daily base wages and extra pay for workers.
- **Payment Management**: Record payments/advances given to workers.
- **Balance Tracking**: Real-time view of outstanding dues for each worker.
- **History**: Detailed log of all work and payments.

### 4. 🌍 Localization
- **Bilingual Support**: Fully localized in **English** and **Kannada**.
- **Persistence**: Language preference is saved across sessions.

### 5. 📱 PWA Support
- **Installable**: Can be installed as a native app on Android/iOS.
- **Offline Capable**: Basic UI works offline (data syncs when online).

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📂 Project Structure

The project follows a modular, route-based architecture:

```
app/
 ├── (routes)/           # Route Groups
 │   ├── expenses/       # Expense Diary Page
 │   ├── plantation/     # Plantation Manager Page
 │   └── stay-manager/   # Staff Manager Page
 ├── layout.tsx          # Root Layout (includes AuthProvider)
 └── page.tsx            # Main Dashboard & Login
components/
 └── ui/                 # Reusable UI components (Tiles, Headers, etc.)
contexts/
 └── AuthContext.tsx     # Global State (User, Language)
lib/
 ├── firebase.ts         # Firebase Config & Helper Functions
 ├── translations.ts     # All EN/KN Translations
 └── constants.tsx       # App Constants & Config
types/
 └── index.ts            # TypeScript Interfaces
```

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone <repository_url>
    cd expense-tracker
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file with your Firebase credentials:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📦 Build & Deploy

To create a production build:

```bash
npm run build
```

This project is optimized for deployment on **Vercel** or **Firebase Hosting**.

## 📝 License

Private / Proprietary.
