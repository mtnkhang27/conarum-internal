import { Button } from '../ui/button';
import { Mail, Download, Loader2, ChevronRight } from 'lucide-react';

const ButtonDemo = () => {
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h4 className="font-semibold">Button Variants</h4>
                <div className="flex flex-wrap gap-4">
                    <Button variant="default">Default</Button>
                    <Button variant="create">Create</Button>
                    <Button variant="filter">Filter</Button>
                    <Button variant="action">Action</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="subtle">Subtle</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Button Sizes</h4>
                <div className="flex flex-wrap items-center gap-4">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">
                        <Mail className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">With Icons</h4>
                <div className="flex flex-wrap gap-4">
                    <Button>
                        <Mail />
                        Login with Email
                    </Button>
                    <Button variant="outline">
                        <Download />
                        Download
                    </Button>
                    <Button variant="action">
                        Continue
                        <ChevronRight />
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">States</h4>
                <div className="flex flex-wrap gap-4">
                    <Button disabled>Disabled</Button>
                    <Button>
                        <Loader2 className="animate-spin" />
                        Please wait
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ButtonDemo;
