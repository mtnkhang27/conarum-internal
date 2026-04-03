import { Label } from '../ui/label';

const LabelDemo = () => {
    return (
        <div className="space-y-4">
            <div>
                <Label>Default Label</Label>
            </div>
            <div>
                <Label htmlFor="email">Email Address</Label>
                <input
                    id="email"
                    type="email"
                    className="mt-1 block w-full rounded-md border px-3 py-2"
                />
            </div>
            <div>
                <Label className="text-destructive">Error Label</Label>
            </div>
        </div>
    );
};

export default LabelDemo;
