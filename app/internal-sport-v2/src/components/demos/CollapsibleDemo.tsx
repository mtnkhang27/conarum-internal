import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const CollapsibleDemo = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-6">
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full max-w-md space-y-2">
                <div className="flex items-center justify-between space-x-4 rounded-md border px-4 py-3">
                    <h4 className="text-sm font-semibold">
                        @peduarte starred 3 repositories
                    </h4>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronDown
                                className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <div className="rounded-md border px-4 py-3 text-sm">
                    @radix-ui/primitives
                </div>
                <CollapsibleContent className="space-y-2">
                    <div className="rounded-md border px-4 py-3 text-sm">
                        @radix-ui/colors
                    </div>
                    <div className="rounded-md border px-4 py-3 text-sm">
                        @stitches/react
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};

export default CollapsibleDemo;
