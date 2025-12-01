import { useState, useEffect } from 'react'
import './App.css'

const BEECEPTOR_PATH = '/api/todos';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const response = await fetch(BEECEPTOR_PATH);
      if (!response.ok) throw new Error('Failed to fetch todos');

      const text = await response.text();
      let data = [];

      if (text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("Invalid JSON response, using empty list:", text);
          data = [];
        }
      }

      const validTodos = Array.isArray(data) ? data.filter(t => t && t.id) : [];

      if (Array.isArray(data) && data.length !== validTodos.length) {
        console.warn(`Filtered out ${data.length - validTodos.length} invalid todos (missing IDs).`);
      }

      setTodos(validTodos);
      setError(null);
    } catch (err) {
      console.error("Error fetching todos:", err);
      if (err.message.includes("Failed to fetch")) {
        setError("Network Error. Could not connect to Beeceptor. Check your internet connection or Beeceptor URL.");
      } else {
        setError("Could not load tasks. Make sure your Beeceptor endpoint is set up correctly.");
      }
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const todoItem = {
      text: newTodo,
      completed: false
    };

    try {
      const response = await fetch(BEECEPTOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoItem)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add todo: ${response.status} ${errorText}`);
      }

      const savedTodo = await response.json();

      // Validation check: If Beeceptor old rules are active, they might return { status: "success" } without an ID.
      if (!savedTodo.id) {
        console.error("Server response missing ID:", savedTodo);
        throw new Error("Server didn't return an ID. Please ensure you have DELETED the old Beeceptor rules and created a CRUD Mock rule.");
      }

      setTodos([...todos, savedTodo]);
      setNewTodo('');
      setError(null);
    } catch (err) {
      console.error("Error adding todo:", err);
      if (err.message.includes("Failed to fetch")) {
        setError("Network Error (CORS). The browser blocked the request. This usually happens if the Beeceptor rule doesn't support the method (POST) or is misconfigured.");
      } else {
        setError(err.message || "Failed to save task to server.");
      }
    }
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updatedTodo = {
      ...todo,
      completed: !todo.completed
    };

    // Optimistic update
    const previousTodos = [...todos];
    setTodos(todos.map(t => t.id === id ? updatedTodo : t));

    const url = `${BEECEPTOR_URL}/${id}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTodo)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update todo: ${response.status} ${errorText}`);
      }

      // Consume the successful response
      await response.json();
    } catch (err) {
      console.error("Error updating todo:", err);
      if (err.message && err.message.includes("Failed to fetch")) {
        setError("Network Error (CORS). The browser blocked the PUT request. This often looks like an OPTIONS request failing. Check your Beeceptor CRUD rule.");
      } else {
        setError(err.message || err.toString());
      }
      setTodos(previousTodos);
    }
  };

  const deleteTodo = async (id) => {
    // Optimistic update
    const previousTodos = [...todos];
    setTodos(todos.filter(t => t.id !== id));

    const url = `${BEECEPTOR_URL}/${id}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete todo: ${response.status} ${errorText}`);
      }

      // Consume the successful response (e.g. {"success": true})
      await response.json();
    } catch (err) {
      console.error("Error deleting todo:", err);
      if (err.message && err.message.includes("Failed to fetch")) {
        setError("Network Error (CORS). The browser blocked the DELETE request. Check your Beeceptor CRUD rule.");
      } else {
        setError(err.message || err.toString());
      }
      setTodos(previousTodos);
    }
  };

  const clearAllTodos = async () => {
    if (!window.confirm("Are you sure you want to clear all tasks? This will delete them one by one.")) return;

    const previousTodos = [...todos];
    setTodos([]); // Optimistically clear UI

    try {
      // Standard CRUD doesn't have a clear all, so we delete one by one
      const results = await Promise.allSettled(previousTodos.map(async (todo) => {
        const url = `${BEECEPTOR_URL}/${todo.id}`;
        console.log(`Sending DELETE to ${url}`);
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error(`Failed to delete ${todo.id}: ${response.status}`);
        }
        return response.json();
      }));

      // Check if any deletions failed
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(`${failures.length} deletions failed:`, failures);
        setError(`Failed to delete ${failures.length} task(s). Refreshing...`);
        fetchTodos(); // Re-fetch to get accurate state
      }
    } catch (err) {
      console.error("Error clearing todos:", err);
      setError("Failed to clear tasks on server.");
      fetchTodos();
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Task Manager</h1>
      </header>

      <main className="todo-card">
        <form onSubmit={addTodo} className="todo-form">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a Task"
            className="todo-input"
          />
          <button type="submit" className="add-btn">
            Add Task
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        <div className="todo-list">
          {loading && todos.length === 0 ? (
            <div className="loading">Loading tasks...</div>
          ) : todos.length === 0 ? (
            <div className="empty-state">No tasks yet. Add one above!</div>
          ) : (
            <>
              {todos.map(todo => (
                <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                  <div className="todo-content" onClick={() => toggleTodo(todo.id)}>
                    <span className="checkbox"></span>
                    <span className="text">{todo.text}</span>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="delete-btn"
                    aria-label="Delete task"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="actions-footer">
                <button onClick={clearAllTodos} className="clear-btn">
                  Clear All Tasks
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
