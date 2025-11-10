import React, { useState } from 'react';

function MyFunctionalComponent({ props }) {
  const [count, setState] = useState({ count: 0 });

  const handleClick = event => {
    setState({ count: event.target.value + 1 }); // SOURCE - detected as event.target.value
    console.log('Current input value:', count);
  };

  return (
    <div>
      <input value={count.count} onChange={handleClick}></input>
    </div>
  );
}