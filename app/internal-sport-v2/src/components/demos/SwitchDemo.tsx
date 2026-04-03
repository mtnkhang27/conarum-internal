import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

const SwitchDemo = () => {
    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Switch id="airplane-mode" />
                <Label htmlFor="airplane-mode">Airplane Mode</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="notifications" defaultChecked />
                <Label htmlFor="notifications">Enable Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="disabled" disabled />
                <Label htmlFor="disabled">Disabled Switch</Label>
            </div>
        </div>
    );
};

export default SwitchDemo;
