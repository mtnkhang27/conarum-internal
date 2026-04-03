import { useState, useCallback } from 'react';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Mock Data Type
interface Evaluation {
    id: string;
    description: string;
    supplier: string;
    status: '10' | '20' | '30' | '35' | '40' | '50';
    createdDate: string;
    score: number;
}

// Generate some mock data
const generateData = (startId: number, count: number): Evaluation[] => {
    const statuses: Array<Evaluation['status']> = ['10', '20', '30', '35', '40', '50'];
    const suppliers = ['ACME Corp', 'Globex Inc', 'Soylent Corp', 'Umbrella Corp', 'Stark Ind', 'Wayne Ent'];

    return Array.from({ length: count }).map((_, i) => ({
        id: (startId + i).toString(),
        description: `Evaluation Request ${startId + i}`,
        supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        score: Math.floor(Math.random() * 100),
    }));
};

export default function DataTableDemo() {
    const [data, setData] = useState<Evaluation[]>(generateData(1, 15));
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [demoMode, setDemoMode] = useState<'infinite' | 'pagination'>('infinite');

    const columns: DataTableColumn<Evaluation>[] = [
        { key: 'description', labelKey: 'Description', renderType: 'text', width: 200 },
        { key: 'supplier', labelKey: 'Supplier', renderType: 'text', width: 150 },
        { key: 'status', labelKey: 'Status', renderType: 'status', width: 120 },
        { key: 'createdDate', labelKey: 'Created Date', renderType: 'date', width: 120, className: 'text-info font-medium' },
        { key: 'score', labelKey: 'Score', renderType: 'number', width: 80 },
    ];

    const handleSelectionChange = (newSelected: Set<string>) => {
        setSelectedRows(newSelected);
    };

    // Simulate Infinite Scroll Load
    const loadMoreData = useCallback(async () => {
        if (isFetchingNextPage || data.length >= 100) return; // Limit to 100 items for demo

        setIsFetchingNextPage(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        setData(prev => [...prev, ...generateData(prev.length + 1, 10)]);
        setIsFetchingNextPage(false);
    }, [isFetchingNextPage, data.length]);

    // Scroll Handler for Infinite Scroll
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (demoMode !== 'infinite') return;

        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        // Load more when user is 50px from bottom
        if (scrollHeight - scrollTop - clientHeight < 50) {
            loadMoreData();
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Data Table</CardTitle>
                        <CardDescription>
                            Demonstrating {demoMode === 'infinite' ? 'Infinite Scroll' : 'Pagination'}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="mode-switch">Pagination</Label>
                        <Switch
                            id="mode-switch"
                            checked={demoMode === 'infinite'}
                            onCheckedChange={(checked) => setDemoMode(checked ? 'infinite' : 'pagination')}
                        />
                        <Label htmlFor="mode-switch">Infinite Scroll</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                            Loaded Items: {data.length} / {100}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRows(new Set())}>
                            Clear Selection ({selectedRows.size})
                        </Button>
                    </div>

                    <DataTable
                        data={data}
                        columns={columns}
                        selection={{
                            enabled: true,
                            mode: 'multiple',
                            selectedIds: selectedRows,
                            onSelectionChange: handleSelectionChange,
                            getRowId: (row) => row.id,
                        }}
                        // Infinite Scroll Props
                        maxHeight="400px" // Restrict height to enable internal scrolling
                        onScroll={handleScroll}
                        isFetchingNextPage={isFetchingNextPage}

                        // Pagination Props (conditional)
                        showFooter={demoMode === 'pagination'}
                        pagination={demoMode === 'pagination' ? {
                            page: 1,
                            pageSize: 15,
                            totalCount: 100, // mock total
                            hasNextPage: true,
                            onPageChange: (p) => console.log('Page change:', p),
                        } : undefined}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
