import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline } from 'lucide-react';

const ToggleGroupDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Single Selection</h4>
                <ToggleGroup type="single" defaultValue="center">
                    <ToggleGroupItem value="left" aria-label="Align left">
                        <AlignLeft className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center" aria-label="Align center">
                        <AlignCenter className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right" aria-label="Align right">
                        <AlignRight className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="justify" aria-label="Align justify">
                        <AlignJustify className="size-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Multiple Selection</h4>
                <ToggleGroup type="multiple" defaultValue={['bold']}>
                    <ToggleGroupItem value="bold" aria-label="Toggle bold">
                        <Bold className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Toggle italic">
                        <Italic className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="underline" aria-label="Toggle underline">
                        <Underline className="size-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">With Text</h4>
                <ToggleGroup type="single">
                    <ToggleGroupItem value="left">
                        <AlignLeft className="mr-2 size-4" />
                        Left
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center">
                        <AlignCenter className="mr-2 size-4" />
                        Center
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right">
                        <AlignRight className="mr-2 size-4" />
                        Right
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Disabled</h4>
                <ToggleGroup type="single" disabled>
                    <ToggleGroupItem value="left">
                        <AlignLeft className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center">
                        <AlignCenter className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right">
                        <AlignRight className="size-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
        </div>
    );
};

export default ToggleGroupDemo;
