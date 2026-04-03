import { Separator } from '../ui/separator';

const SeparatorDemo = () => {
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h4 className="font-semibold">Horizontal Separator</h4>
                <div className="space-y-1">
                    <h5 className="text-sm font-medium">Section 1</h5>
                    <p className="text-sm text-muted-foreground">Content for section 1</p>
                </div>
                <Separator />
                <div className="space-y-1">
                    <h5 className="text-sm font-medium">Section 2</h5>
                    <p className="text-sm text-muted-foreground">Content for section 2</p>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Vertical Separator</h4>
                <div className="flex h-20 items-center">
                    <div className="px-4">
                        <p className="text-sm">Item 1</p>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="px-4">
                        <p className="text-sm">Item 2</p>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="px-4">
                        <p className="text-sm">Item 3</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeparatorDemo;
