import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const tags = Array.from({ length: 50 }).map(
    (_, i, a) => `Tag ${a.length - i}`
);

const ScrollAreaDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Vertical Scroll</h4>
                <ScrollArea className="h-72 w-full rounded-md border">
                    <div className="p-4">
                        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
                        {tags.map((tag) => (
                            <div key={tag}>
                                <div className="text-sm">{tag}</div>
                                <Separator className="my-2" />
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Horizontal Scroll</h4>
                <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
                    <div className="flex w-max space-x-4 p-4">
                        {tags.map((tag) => (
                            <div key={tag} className="shrink-0">
                                <div className="h-24 w-40 rounded-md border bg-muted p-4">
                                    <div className="text-sm font-medium">{tag}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

export default ScrollAreaDemo;
