import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const TodoApp = () => {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState("all");
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch todos
  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await axios.get("http://localhost:5000/api/todos");
      setTodos(res.data); // Remove the sorting here
    } catch (err) {
      setError("Failed to fetch todos. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // Add todo (click or Enter)
  const addTodo = async (e) => {
    if (e.type === "click" || e.key === "Enter") {
      if (!title.trim()) return;
      try {
        const res = await axios.post("http://localhost:5000/api/todos", { title });
        setTodos((prev) => [res.data, ...prev]);
        setTitle("");
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Toggle completed
  const toggleComplete = async (id) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/todos/${id}/toggle`);
      setTodos(prev => prev.map(t => t._id === id ? res.data : t)); // Simply update the todo
    } catch (err) {
      console.error(err);
    }
  };

  // Delete todo
  const deleteTodo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/todos/${id}`);
      setTodos((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError("Failed to delete todo. Please try again.");
      console.error(err);
    }
  };

  // Start edit
  const startEdit = (id, title) => {
    setEditId(id);
    setEditTitle(title);
  };

  // Save edit
  const saveEdit = async (id) => {
    if (!editTitle.trim()) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/todos/${id}`, { title: editTitle });
      setTodos((prev) => prev.map((t) => (t._id === id ? res.data : t)));
      setEditId(null);
      setEditTitle("");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete all completed
  const deleteAllCompleted = async () => {
    if (!window.confirm('Are you sure you want to delete all completed todos?')) return;
    try {
      await axios.delete("http://localhost:5000/api/todos/completed");
      setTodos((prev) => prev.filter((t) => !t.completed));
    } catch (err) {
      setError("Failed to delete completed todos. Please try again.");
      console.error(err);
    }
  };

  // Mark/Unmark all
  const toggleAll = useCallback(async () => {
    try {
      if (todos.length === 0) return;
      const allCompleted = todos.every((t) => t.completed);
      const promises = todos.map(async (t) => {
        if (t.completed === allCompleted) {
          const res = await axios.put(`http://localhost:5000/api/todos/${t._id}/toggle`);
          return res.data;
        }
        return t;
      });
      const results = await Promise.all(promises);
      const sorted = [
        ...results.filter((t) => !t.completed),
        ...results.filter((t) => t.completed),
      ];
      setTodos(sorted);
    } catch (err) {
      console.error(err);
    }
  }, [todos]); // Add todos as dependency

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        toggleAll();
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        deleteAllCompleted();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleAll]); // Add toggleAll to dependency array

  const filtered = todos.filter((t) => {
    if (filter === "completed") return t.completed;
    if (filter === "pending") return !t.completed;
    return true;
  });

  const allCompleted = todos.length > 0 && todos.every((t) => t.completed);

  return (
    <div className="todo-container" role="main">
      <h1 className="todo-title">✨ My To-Do List</h1>
      
      {error && <div className="error-message" role="alert">{error}</div>}
      
      <div className="input-section">
        <input
          type="text"
          placeholder="Add your task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={addTodo}
          aria-label="New todo input"
        />
        <button className="add-btn" onClick={addTodo} aria-label="Add todo">
          Add
        </button>
      </div>

      <div className="filter-buttons">
        {["all", "completed", "pending"].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="action-buttons">
        <button className="markall-btn" onClick={toggleAll}>
          {allCompleted ? "Unmark All" : "Mark All"}
        </button>
        <button className="deleteall-btn" onClick={deleteAllCompleted}>
          Delete All Completed
        </button>
      </div>

      {isLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <ul aria-label="Todo list"> {/* Remove redundant role="list" */}
          <AnimatePresence>
            {filtered.map((todo) => (
              <motion.li
                key={todo._id}
                className={todo.completed ? "completed" : "pending"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                // Remove layout prop to prevent position animations
              >
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleComplete(todo._id)}
                  />
                  <span className="checkmark" />
                </label>

                {editId === todo._id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => saveEdit(todo._id)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(todo._id)}
                    autoFocus
                  />
                ) : (
                  <span className="todo-text">{todo.title}</span>
                )}

                <div className="todo-buttons">
                  <button
                    className="edit-btn"
                    onClick={() => startEdit(todo._id, todo.title)}
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteTodo(todo._id)}
                  >
                    🗑️
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      
      <div className="keyboard-shortcuts">
        <p>Keyboard shortcuts:</p>
        <ul>
          <li>Ctrl + A: Mark/Unmark All</li>
          <li>Ctrl + D: Delete All Completed</li>
        </ul>
      </div>
    </div>
  );
};

export default TodoApp;
