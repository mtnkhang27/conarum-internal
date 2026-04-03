import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';

const ResizableDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Horizontal Resizable</h4>
                <ResizablePanelGroup
                    direction="horizontal"
                    className="max-w-2xl rounded-lg border"
                >
                    <ResizablePanel defaultSize={50}>
                        <div className="flex h-[200px] items-center justify-center p-6">
                            <span className="font-semibold">Panel One</span>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={50}>
                        <div className="flex h-[200px] items-center justify-center p-6">
                            <span className="font-semibold">Panel Two</span>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Vertical Resizable</h4>
                <ResizablePanelGroup
                    direction="vertical"
                    className="max-w-2xl rounded-lg border"
                >
                    <ResizablePanel defaultSize={50}>
                        <div className="flex h-[200px] items-center justify-center p-6">
                            <span className="font-semibold">Header</span>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={50}>
                        <div className="flex h-[200px] items-center justify-center p-6">
                            <span className="font-semibold">Content</span>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Complex Layout</h4>
                <ResizablePanelGroup
                    direction="horizontal"
                    className="max-w-2xl rounded-lg border"
                >
                    <ResizablePanel defaultSize={25}>
                        <div className="flex h-[400px] items-center justify-center p-6">
                            <span className="font-semibold">Sidebar</span>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={75}>
                        <ResizablePanelGroup direction="vertical">
                            <ResizablePanel defaultSize={50}>
                                <div className="flex h-full items-center justify-center p-6">
                                    <span className="font-semibold">Content</span>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle />
                            <ResizablePanel defaultSize={50}>
                                <div className="flex h-full items-center justify-center p-6">
                                    <span className="font-semibold">Footer</span>
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
};

export default ResizableDemo;
