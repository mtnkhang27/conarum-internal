import { AspectRatio } from '../ui/aspect-ratio';

const AspectRatioDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">16:9 Aspect Ratio</h4>
                <div className="w-full max-w-md">
                    <AspectRatio ratio={16 / 9} className="bg-muted rounded-md overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
                            alt="Photo by Drew Beamer"
                            className="h-full w-full object-cover"
                        />
                    </AspectRatio>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">1:1 Square</h4>
                <div className="w-full max-w-xs">
                    <AspectRatio ratio={1} className="bg-muted rounded-md overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1535025183041-0991a977e25b?w=800&dpr=2&q=80"
                            alt="Photo"
                            className="h-full w-full object-cover"
                        />
                    </AspectRatio>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">4:3 Aspect Ratio</h4>
                <div className="w-full max-w-md">
                    <AspectRatio ratio={4 / 3} className="bg-muted rounded-md overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1682407186023-12c70a4a35e0?w=800&dpr=2&q=80"
                            alt="Photo"
                            className="h-full w-full object-cover"
                        />
                    </AspectRatio>
                </div>
            </div>
        </div>
    );
};

export default AspectRatioDemo;
