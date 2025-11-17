# AI Development Rules

This document outlines the rules and conventions for AI-driven development of this application.

## Tech Stack

*   **Framework**: React 19 with Hooks
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS (configured via CDN in `index.html`)
*   **Routing**: React Router DOM for navigation between pages.
*   **Data Visualization**: Chart.js with `react-chartjs-2` for creating charts.
*   **Icons**: Lucide React for UI icons.
*   **UI Components**: Use shadcn/ui components for consistency (e.g., Input, Button, Card).

## Library Usage Rules

*   **Styling**: All styling MUST be done using Tailwind CSS utility classes. Avoid writing custom CSS files or using `<style>` tags unless absolutely necessary for global styles.
*   **State Management**: For component-level state, use `useState` and `useReducer`. For global state, use React Context API.
*   **Routing**: All page navigation MUST be handled by `react-router-dom`. Define routes in a central `App.tsx` file.
*   **Components**:
    *   Create small, reusable components in the `src/components` directory.
    *   Pages (top-level components for routes) should reside in `src/pages`.
    *   Keep components focused on a single responsibility.
*   **Icons**: Use icons from `lucide-react` to maintain visual consistency.
*   **Forms**: Build forms using shadcn/ui components like `Input`, `Label`, and `Button`.