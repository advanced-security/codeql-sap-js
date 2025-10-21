import { Input } from '@ui5/webcomponents-react';

// normal react component props 
function ChildComponent({ value }) { // SOURCE

 console.log('Input finalized with value:', value);

 return (
        <div>
            <Input
                placeholder={value}
            />
        </div>
    );
} 

function ParentComponent() {
  const data = "Hello from Parent";
  return <ChildComponent value={data} />;
}