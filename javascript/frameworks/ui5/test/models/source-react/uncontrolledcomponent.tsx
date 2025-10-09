import { Input, Button } from '@ui5/webcomponents-react';
import type { InputDomRef } from '@ui5/webcomponents-react';
import type { Ui5CustomEvent } from '@ui5/webcomponents-react-base';

function UncontrolledComponent({ props }) {

  //direct event value access, no hook/react specific function
  const handleButtonPress = (event: Ui5CustomEvent<InputDomRef>) => {
    const finalValue = event.target.value; // SOURCE
    console.log('Input finalized with value:', finalValue);
  };

    return (
        <div>
            <Input
                placeholder="Enter some text"
            />
            <Button>
                Get Input Value
            </Button>
        </div>
    );
}

