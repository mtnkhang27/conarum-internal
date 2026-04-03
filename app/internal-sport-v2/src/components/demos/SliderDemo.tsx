import { useState } from 'react';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';

const SliderDemo = () => {
    const [value, setValue] = useState([50]);

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <Label>Volume: {value[0]}</Label>
                <Slider value={value} onValueChange={setValue} max={100} step={1} />
            </div>

            <div className="space-y-4">
                <Label>Default Slider</Label>
                <Slider defaultValue={[33]} max={100} step={1} />
            </div>

            <div className="space-y-4">
                <Label>Disabled Slider</Label>
                <Slider defaultValue={[50]} max={100} step={1} disabled />
            </div>
        </div>
    );
};

export default SliderDemo;
