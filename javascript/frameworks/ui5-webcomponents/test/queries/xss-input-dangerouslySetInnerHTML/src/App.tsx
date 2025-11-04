import { useState, useRef, useEffect, useCallback } from 'react';
import "@ui5/webcomponents/dist/Input";

import type Input from "@ui5/webcomponents/dist/Input";

function App() {
  const [todo, setTodo] = useState<String>("");

  const todoInput = useRef<Input>();

  const handleAdd = useCallback(() => {
    setTodo((msg) => todoInput.current?.value || "", [setTodo]);
  });

	useEffect(() => {
		const currentTodoInput = todoInput.current;

		currentTodoInput?.addEventListener("change", handleAdd);
		return () => {
			currentTodoInput?.removeEventListener("change", handleAdd);
		};
	}, [handleAdd]);

  return (
    <div className="app">
      <ui5-input placeholder="Type a task..." ref={todoInput} class="add-todo-element-width" id="add-input"></ui5-input>
      <div dangerouslySetInnerHTML={{__html: todo}}></div>
    </div>
  );
}

export default App;
