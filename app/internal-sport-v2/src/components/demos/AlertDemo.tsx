import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

const AlertDemo = () => {
    return (
        <div className="space-y-4">
            <Alert>
                <Info className="size-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                    This is a default alert. Use it to display general information to users.
                </AlertDescription>
            </Alert>

            <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Your session has expired. Please login again to continue.
                </AlertDescription>
            </Alert>

            <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
                <CheckCircle2 className="size-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                    Your changes have been saved successfully.
                </AlertDescription>
            </Alert>

            <Alert className="border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
                <AlertTriangle className="size-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                    You have unsaved changes. Please save before navigating away.
                </AlertDescription>
            </Alert>
        </div>
    );
};

export default AlertDemo;
