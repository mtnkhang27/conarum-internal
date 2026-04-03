import { Badge } from '../ui/badge';

const BadgeDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Badge Variants</h4>
                <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="info">Info</Badge>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Usage Examples</h4>
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Status:</span>
                        <Badge variant="success">Active</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Priority:</span>
                        <Badge variant="destructive">High</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Type:</span>
                        <Badge variant="outline">Beta</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Count:</span>
                        <Badge>12</Badge>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BadgeDemo;
