import { Skeleton } from '../ui/skeleton';

const SkeletonDemo = () => {
    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h4 className="font-semibold">Card Skeleton</h4>
                <div className="space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">List Skeleton</h4>
                <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                        <Skeleton className="size-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Skeleton className="size-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonDemo;
