import { expandedTodoId } from "../../state/store";
import { TodoSpec } from "./TodoSpec";
import type { TodoItem as TodoItemType } from "../../types";

interface TodoItemProps {
  todo: TodoItemType;
  date: string;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (todo: TodoItemType) => void;
}

export function TodoItem({ todo, date, onToggle, onDelete, onUpdate }: TodoItemProps) {
  const isExpanded = expandedTodoId.value === todo.id;

  function toggleExpand() {
    expandedTodoId.value = isExpanded ? null : todo.id;
  }

  return (
    <div class="todo-item">
      <div class="todo-item-row">
        <button
          class={`todo-checkbox ${todo.completed ? "checked" : ""}`}
          onClick={onToggle}
        />
        <span class={`todo-title ${todo.completed ? "completed" : ""}`}>
          {todo.title}
        </span>
        <button class="todo-expand-btn" onClick={toggleExpand}>
          {isExpanded ? "Collapse" : "Spec"}
        </button>
        <button class="todo-expand-btn" onClick={onDelete} title="Delete">
          &times;
        </button>
      </div>
      {isExpanded && (
        <TodoSpec todo={todo} date={date} onUpdate={onUpdate} />
      )}
    </div>
  );
}
