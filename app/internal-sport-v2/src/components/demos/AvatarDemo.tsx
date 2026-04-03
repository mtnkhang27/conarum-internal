import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const AvatarDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Avatar Sizes</h4>
                <div className="flex items-center gap-4">
                    <Avatar className="size-8">
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Avatar className="size-10">
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <Avatar className="size-14">
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">With Fallbacks</h4>
                <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <Avatar>
                        <AvatarFallback>AB</AvatarFallback>
                    </Avatar>
                    <Avatar>
                        <AvatarFallback>MK</AvatarFallback>
                    </Avatar>
                    <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            +5
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </div>
    );
};

export default AvatarDemo;
