import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const data = [
    {
        name: 'Jan',
        total: 2400,
        revenue: 1400,
    },
    {
        name: 'Feb',
        total: 1398,
        revenue: 2210,
    },
    {
        name: 'Mar',
        total: 9800,
        revenue: 2290,
    },
    {
        name: 'Apr',
        total: 3908,
        revenue: 2000,
    },
    {
        name: 'May',
        total: 4800,
        revenue: 2181,
    },
    {
        name: 'Jun',
        total: 3800,
        revenue: 2500,
    },
];

const ChartDemo = () => {
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h4 className="font-semibold">Bar Chart</h4>
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>Monthly revenue for the year</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Bar dataKey="total" fill="hsl(var(--primary))" />
                                <Bar dataKey="revenue" fill="hsl(var(--muted))" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Line Chart</h4>
                <Card>
                    <CardHeader>
                        <CardTitle>Sales Trends</CardTitle>
                        <CardDescription>Sales performance over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} />
                                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ChartDemo;
