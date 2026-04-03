import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

const CheckboxDemo = () => {
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms">Accept terms and conditions</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="marketing" defaultChecked />
                <Label htmlFor="marketing">Receive marketing emails</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox id="disabled" disabled />
                <Label htmlFor="disabled">Disabled checkbox</Label>
            </div>
        </div>
    );
};

export default CheckboxDemo;
