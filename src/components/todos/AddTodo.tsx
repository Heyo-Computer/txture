import { useState } from "preact/hooks";

interface AddTodoProps {
  onAdd: (title: string) => void;
}

export function AddTodo({ onAdd }: AddTodoProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(e: Event) {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed) {
      onAdd(trimmed);
      setTitle("");
    }
  }

  return (
    <form class="add-todo" onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onInput={(e) => setTitle(e.currentTarget.value)}
        placeholder="Add a new todo..."
      />
      <button class="btn btn-primary" type="submit">
        Add
      </button>
    </form>
  );
}
