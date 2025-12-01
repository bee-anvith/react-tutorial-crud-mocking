# React Task Manager with Beeceptor CRUD

A React application demonstrating **Beeceptor's CRUD Mocking** feature. It provides a full task manager with persistent storage without any backend code.

## Prerequisites

1.  **Beeceptor Endpoint**: Create an endpoint at [Beeceptor](https://beeceptor.com) (e.g., `react-demo`).
2.  **CRUD Rule**:
    *   Create a new **CRUD Mock** rule.
    *   Set path to `/api/todos`.
    *   Save the rule.

## Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Configure Proxy**:
    *   Open `vite.config.js`.
    *   Update the proxy `target` to your Beeceptor endpoint:
        ```javascript
        server: {
          proxy: {
            '/api': {
              target: 'https://YOUR-ENDPOINT.proxy.beeceptor.com',
              changeOrigin: true,
              secure: true,
            }
          }
        }
        ```

3.  **Run Application**:
    ```bash
    npm run dev
    ```

## Features

*   **Create**: Add new tasks (POST).
*   **Read**: List all tasks (GET).
*   **Update**: Toggle completion status (PUT).
*   **Delete**: Remove tasks (DELETE).
*   **Optimistic UI**: Immediate interface updates with rollback on error.
*   **Vite Proxy**: Configured to avoid CORS preflight issues with PUT/DELETE requests.

