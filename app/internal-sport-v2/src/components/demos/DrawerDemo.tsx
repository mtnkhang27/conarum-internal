import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';
import { Button } from '../ui/button';

const DrawerDemo = () => {
    return (
        <div className="flex gap-4">
            <Drawer>
                <DrawerTrigger asChild>
                    <Button variant="outline">Open Drawer</Button>
                </DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Drawer Title</DrawerTitle>
                        <DrawerDescription>This is a drawer component for mobile-friendly bottom sheets.</DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4">
                        <p className="text-sm text-muted-foreground">
                            Drawer content goes here. This component is particularly useful for mobile interfaces
                            where you want to present options or forms from the bottom of the screen.
                        </p>
                    </div>
                    <DrawerFooter>
                        <Button>Submit</Button>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    );
};

export default DrawerDemo;
