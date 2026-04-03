import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuCheckboxItem,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuLabel,
} from '../ui/context-menu';

const ContextMenuDemo = () => {
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Right-click on the boxes below to see context menus
            </p>

            <div className="grid gap-4 md:grid-cols-2">
                <ContextMenu>
                    <ContextMenuTrigger className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm hover:bg-muted">
                        Right click here
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem>Back</ContextMenuItem>
                        <ContextMenuItem>Forward</ContextMenuItem>
                        <ContextMenuItem>Reload</ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem>Save Page As...</ContextMenuItem>
                        <ContextMenuItem>Print...</ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>

                <ContextMenu>
                    <ContextMenuTrigger className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm hover:bg-muted">
                        Right click for options
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuLabel>Appearance</ContextMenuLabel>
                        <ContextMenuSeparator />
                        <ContextMenuCheckboxItem checked>
                            Status Bar
                        </ContextMenuCheckboxItem>
                        <ContextMenuCheckboxItem>Activity Bar</ContextMenuCheckboxItem>
                        <ContextMenuCheckboxItem>Panel</ContextMenuCheckboxItem>
                        <ContextMenuSeparator />
                        <ContextMenuLabel>Position</ContextMenuLabel>
                        <ContextMenuRadioGroup value="bottom">
                            <ContextMenuRadioItem value="top">Top</ContextMenuRadioItem>
                            <ContextMenuRadioItem value="bottom">Bottom</ContextMenuRadioItem>
                            <ContextMenuRadioItem value="left">Left</ContextMenuRadioItem>
                        </ContextMenuRadioGroup>
                    </ContextMenuContent>
                </ContextMenu>
            </div>
        </div>
    );
};

export default ContextMenuDemo;
