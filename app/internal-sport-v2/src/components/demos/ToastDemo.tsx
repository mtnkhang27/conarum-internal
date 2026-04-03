import { toast, Toaster } from 'sonner';
import { Button } from '../ui/button';

const ToastDemo = () => {
    return (
        <div className="space-y-6">
            <Toaster />
            <div className="space-y-4">
                <h4 className="font-semibold">Toast Types</h4>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => toast('Event has been created')}>
                        Default Toast
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            toast.success('Event created successfully', {
                                description: 'Your event has been added to the calendar.',
                            })
                        }
                    >
                        Success Toast
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            toast.error('Something went wrong', {
                                description: 'Please try again later.',
                            })
                        }
                    >
                        Error Toast
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            toast.info('New update available', {
                                description: 'Please refresh to see the latest changes.',
                            })
                        }
                    >
                        Info Toast
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            toast.warning('Low disk space', {
                                description: 'You have less than 10% storage remaining.',
                            })
                        }
                    >
                        Warning Toast
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Advanced Toasts</h4>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() =>
                            toast('Event created', {
                                action: {
                                    label: 'Undo',
                                    onClick: () => toast('Undo action'),
                                },
                            })
                        }
                    >
                        With Action
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            toast.promise(
                                new Promise((resolve) => setTimeout(resolve, 2000)),
                                {
                                    loading: 'Loading...',
                                    success: 'Data loaded successfully',
                                    error: 'Failed to load data',
                                }
                            )
                        }
                    >
                        Promise Toast
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            toast('Event created', {
                                duration: 10000,
                            })
                        }
                    >
                        Long Duration
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Positions</h4>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => toast('Top Left', { position: 'top-left' })}
                    >
                        Top Left
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => toast('Top Center', { position: 'top-center' })}
                    >
                        Top Center
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => toast('Top Right', { position: 'top-right' })}
                    >
                        Top Right
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => toast('Bottom Left', { position: 'bottom-left' })}
                    >
                        Bottom Left
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => toast('Bottom Center', { position: 'bottom-center' })}
                    >
                        Bottom Center
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => toast('Bottom Right', { position: 'bottom-right' })}
                    >
                        Bottom Right
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ToastDemo;
