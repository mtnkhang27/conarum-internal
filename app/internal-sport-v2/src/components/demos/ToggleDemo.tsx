import { Toggle } from '../ui/toggle';
import { Bold, Italic, Underline } from 'lucide-react';

const ToggleDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Toggle Variants</h4>
                <div className="flex flex-wrap gap-2">
                    <Toggle aria-label="Toggle bold">
                        <Bold className="size-4" />
                    </Toggle>
                    <Toggle aria-label="Toggle italic">
                        <Italic className="size-4" />
                    </Toggle>
                    <Toggle aria-label="Toggle underline">
                        <Underline className="size-4" />
                    </Toggle>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">With Text</h4>
                <div className="flex flex-wrap gap-2">
                    <Toggle>
                        <Bold className="mr-2 size-4" />
                        Bold
                    </Toggle>
                    <Toggle>
                        <Italic className="mr-2 size-4" />
                        Italic
                    </Toggle>
                    <Toggle>
                        <Underline className="mr-2 size-4" />
                        Underline
                    </Toggle>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Sizes</h4>
                <div className="flex flex-wrap items-center gap-2">
                    <Toggle size="sm">
                        <Bold className="size-4" />
                    </Toggle>
                    <Toggle size="default">
                        <Bold className="size-4" />
                    </Toggle>
                    <Toggle size="lg">
                        <Bold className="size-4" />
                    </Toggle>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Disabled</h4>
                <Toggle disabled>
                    <Bold className="size-4" />
                </Toggle>
            </div>
        </div>
    );
};

export default ToggleDemo;
