import { Button } from '../ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { Info } from 'lucide-react';

const TooltipDemo = () => {
    return (
        <div className="flex flex-wrap gap-4">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline">Hover me</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>This is a tooltip</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Info className="size-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>More information available</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button>Top tooltip</Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>Tooltip appears on top</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="action">Bottom tooltip</Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>Tooltip appears at bottom</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
};

export default TooltipDemo;
