import { useState, useRef, useEffect, useCallback } from 'react';

import { Input, InputDomRef } from "@ui5/webcomponents-react/Input";
//import { DatePicker } from "@ui5/webcomponents-react/DatePicker";

function App() {
  const [todo, setTodo] = useState<string>("");

  //const todoInput = useRef<typeof DatePicker>();
  const todoInput = useRef<InputDomRef>(null);

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
  <Input placeholder="Type a task..." ref={todoInput} id="add-input"></Input>
      <div dangerouslySetInnerHTML={{__html: todo}}></div>
    </div>
  );
}

export default App;
