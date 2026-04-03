import { Input } from '../ui/input';
import { Label } from '../ui/label';

const InputDemo = () => {
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h4 className="font-semibold">Input Variants</h4>
                <div className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="default">Default</Label>
                        <Input id="default" placeholder="Enter text..." />
                    </div>
                    <div>
                        <Label htmlFor="readonly">Readonly</Label>
                        <Input id="readonly" value="Read only value" variant="readonly" readOnly />
                    </div>
                    <div>
                        <Label htmlFor="info">Info</Label>
                        <Input id="info" value="Information state" variant="info" readOnly />
                    </div>
                    <div>
                        <Label htmlFor="success">Success</Label>
                        <Input id="success" value="Success state" variant="success" readOnly />
                    </div>
                    <div>
                        <Label htmlFor="warning">Warning</Label>
                        <Input id="warning" value="Warning state" variant="warning" readOnly />
                    </div>
                    <div>
                        <Label htmlFor="destructive">Destructive</Label>
                        <Input id="destructive" value="Error state" variant="destructive" readOnly />
                    </div>
                    <div>
                        <Label htmlFor="disabled">Disabled</Label>
                        <Input id="disabled" placeholder="Disabled input" disabled />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Input Types</h4>
                <div className="max-w-md space-y-4">
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="email@example.com" />
                    </div>
                    <div>
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="Enter password" />
                    </div>
                    <div>
                        <Label htmlFor="number">Number</Label>
                        <Input id="number" type="number" placeholder="Enter number" />
                    </div>
                    <div>
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InputDemo;
