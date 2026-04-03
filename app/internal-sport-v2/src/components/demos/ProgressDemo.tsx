import { Progress } from '../ui/progress';

const ProgressDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="text-muted-foreground">25%</span>
                </div>
                <Progress value={25} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="text-muted-foreground">50%</span>
                </div>
                <Progress value={50} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="text-muted-foreground">75%</span>
                </div>
                <Progress value={75} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span className="text-muted-foreground">100%</span>
                </div>
                <Progress value={100} />
            </div>
        </div>
    );
};

export default ProgressDemo;
