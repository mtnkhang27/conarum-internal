import { useState } from 'react';
import { Menu, Search, Github, Code2 } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Badge } from './components/ui/badge';
import ComponentShowcase from './components/ComponentShowcase';

// List all components
const components = [
    { name: 'Accordion', category: 'Layout' },
    { name: 'Alert', category: 'Feedback' },
    { name: 'Alert Dialog', category: 'Overlay' },
    { name: 'Avatar', category: 'Display' },
    { name: 'Badge', category: 'Display' },
    { name: 'Breadcrumb', category: 'Navigation' },
    { name: 'Button', category: 'Form' },
    { name: 'Card', category: 'Layout' },
    { name: 'Carousel', category: 'Display' },
    { name: 'Chart', category: 'Data' },
    { name: 'Checkbox', category: 'Form' },
    { name: 'Collapsible', category: 'Layout' },
    { name: 'Command', category: 'Overlay' },
    { name: 'Context Menu', category: 'Overlay' },
    { name: 'DatePicker', category: 'Form' },
    { name: 'FilterBar', category: 'Form' },
    { name: 'Data Table', category: 'Data' },
    { name: 'Dialog', category: 'Overlay' },
    { name: 'Drawer', category: 'Overlay' },
    { name: 'Dropdown Menu', category: 'Overlay' },
    { name: 'Form Field', category: 'Form' },
    { name: 'Form', category: 'Form' },
    { name: 'Hover Card', category: 'Overlay' },
    { name: 'Input', category: 'Form' },
    { name: 'Input Container', category: 'Form' },
    { name: 'Label', category: 'Form' },
    { name: 'Menubar', category: 'Navigation' },
    { name: 'Navigation Menu', category: 'Navigation' },
    { name: 'Pagination', category: 'Navigation' },
    { name: 'Popover', category: 'Overlay' },
    { name: 'Progress', category: 'Feedback' },
    { name: 'Radio Group', category: 'Form' },
    { name: 'Resizable', category: 'Layout' },
    { name: 'Scroll Area', category: 'Layout' },
    { name: 'Select', category: 'Form' },
    { name: 'Separator', category: 'Layout' },
    { name: 'Sheet', category: 'Overlay' },
    { name: 'Sidebar', category: 'Navigation' },
    { name: 'Skeleton', category: 'Feedback' },
    { name: 'Slider', category: 'Form' },
    { name: 'Switch', category: 'Form' },
    { name: 'Table', category: 'Data' },
    { name: 'Tabs', category: 'Navigation' },
    { name: 'Textarea', category: 'Form' },
    { name: 'Toast (Sonner)', category: 'Feedback' },
    { name: 'Toggle', category: 'Form' },
    { name: 'Toggle Group', category: 'Form' },
    { name: 'Token', category: 'Display' },
    { name: 'Tooltip', category: 'Overlay' },
];

const categories = Array.from(new Set(components.map((c) => c.category))).sort();

function App() {
    const [selectedComponent, setSelectedComponent] = useState(components[0].name);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const filteredComponents = components.filter((comp) =>
        comp.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedComponents = categories.map((category) => ({
        category,
        items: filteredComponents.filter((c) => c.category === category),
    }));

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <aside
                className={`border-r bg-card transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-0'
                    } overflow-hidden`}
            >
                <div className="flex h-16 items-center gap-2 border-b px-6">
                    <Code2 className="size-6 text-primary" />
                    <div>
                        <h1 className="text-lg font-semibold">UI Components</h1>
                        <p className="text-xs text-muted-foreground">CNMA Showcase</p>
                    </div>
                </div>

                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search components..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <ScrollArea className="h-[calc(100vh-140px)]">
                    <div className="px-4 pb-4">
                        {groupedComponents.map((group) =>
                            group.items.length > 0 ? (
                                <div key={group.category} className="mb-6">
                                    <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                                        {group.category}
                                    </h3>
                                    <div className="space-y-1">
                                        {group.items.map((comp) => (
                                            <button
                                                key={comp.name}
                                                onClick={() => setSelectedComponent(comp.name)}
                                                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${selectedComponent === comp.name
                                                    ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                                                    : ''
                                                    }`}
                                            >
                                                {comp.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : null
                        )}
                    </div>
                </ScrollArea>
            </aside>

            {/* Main Content */}
            <main className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <Menu className="size-5" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex flex-1 items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">{selectedComponent}</h2>
                            <p className="text-sm text-muted-foreground">
                                Component from CNMA UI Library
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">
                                {components.find((c) => c.name === selectedComponent)?.category}
                            </Badge>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button variant="ghost" size="icon">
                                    <Github className="size-5" />
                                </Button>
                            </a>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <ScrollArea className="h-[calc(100vh-64px)]">
                    <div className="p-8">
                        <ComponentShowcase componentName={selectedComponent} />
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}

export default App;
