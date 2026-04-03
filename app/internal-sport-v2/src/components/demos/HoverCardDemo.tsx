import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { CalendarDays } from 'lucide-react';

const HoverCardDemo = () => {
    return (
        <div className="flex flex-wrap gap-4">
            <HoverCard>
                <HoverCardTrigger asChild>
                    <Button variant="link">@nextjs</Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                    <div className="flex justify-between space-x-4">
                        <Avatar>
                            <AvatarImage src="https://github.com/vercel.png" />
                            <AvatarFallback>VC</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold">@nextjs</h4>
                            <p className="text-sm">
                                The React Framework – created and maintained by @vercel.
                            </p>
                            <div className="flex items-center pt-2">
                                <CalendarDays className="mr-2 size-4 opacity-70" />
                                <span className="text-xs text-muted-foreground">
                                    Joined December 2021
                                </span>
                            </div>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>

            <HoverCard>
                <HoverCardTrigger asChild>
                    <Button variant="outline">Hover for info</Button>
                </HoverCardTrigger>
                <HoverCardContent>
                    <p className="text-sm">
                        This is additional information that appears on hover.
                    </p>
                </HoverCardContent>
            </HoverCard>
        </div>
    );
};

export default HoverCardDemo;
