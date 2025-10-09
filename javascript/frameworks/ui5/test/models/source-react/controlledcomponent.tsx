import { Input, Button } from '@ui5/webcomponents-react';
import { useRef, useState } from 'react';
import type { InputDomRef } from '@ui5/webcomponents-react';

function ControlledComponent( { props }) {
    const inputRef1 = useRef < InputDomRef > (null);
    const [inputRef2, setInputValue] = useState('');

    const handleButtonPress1 = () => {
        // Access the input value via the hook
            console.log('Current input value:', inputRef1.current.value); // SOURCE
    };

    const handleButtonPress2 = event => {
        setInputValue(event.target.value); // SOURCE
        console.log('Current input value:', inputRef2);  // SOURCE - only because of setInputValue
    };

    return (
        <div>
            <Input
                ref={inputRef1}
                placeholder="Enter some text"
            />
            <Button onClick={handleButtonPress1}>
                Get Input Value
            </Button>
            <Input
                placeholder="Enter some text"
                value={inputRef2}
            />
            <Button onClick={handleButtonPress2}>
                Get Input Value
            </Button>
        </div>
    );
}

