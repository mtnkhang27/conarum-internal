import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Label } from '../ui/label';

const SelectDemo = () => {
    return (
        <div className="max-w-md space-y-6">
            <div className="space-y-2">
                <Label>Select a fruit</Label>
                <Select>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a fruit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="apple">Apple</SelectItem>
                        <SelectItem value="banana">Banana</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="grape">Grape</SelectItem>
                        <SelectItem value="mango">Mango</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Select a timezone</Label>
                <Select defaultValue="utc">
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="utc">UTC (GMT+0)</SelectItem>
                        <SelectItem value="est">EST (GMT-5)</SelectItem>
                        <SelectItem value="pst">PST (GMT-8)</SelectItem>
                        <SelectItem value="jst">JST (GMT+9)</SelectItem>
                        <SelectItem value="aest">AEST (GMT+10)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

export default SelectDemo;
