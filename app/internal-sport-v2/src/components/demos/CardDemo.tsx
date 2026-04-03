import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';

const CardDemo = () => {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card description goes here</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        This is the card content area. You can put any content here.
                    </p>
                </CardContent>
                <CardFooter className="justify-between border-t">
                    <Button variant="ghost">Cancel</Button>
                    <Button>Continue</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Project Overview</CardTitle>
                    <CardDescription>Last updated 2 hours ago</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">75%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-3/4 bg-primary" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                    <CardDescription>Monthly performance</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-2xl font-bold">12,345</span>
                            <span className="text-sm text-green-600">+12.5%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Total users this month</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CardDemo;
