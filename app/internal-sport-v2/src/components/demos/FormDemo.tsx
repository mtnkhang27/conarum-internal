import { Label } from '../ui/label';

const FormDemo = () => {
    return (
        <div className="max-w-2xl space-y-8">
            <div className="space-y-4">
                <h4 className="font-semibold">User Registration Form</h4>
                <form className="space-y-6 rounded-lg border p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <input
                                id="firstName"
                                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                                placeholder="John"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <input
                                id="lastName"
                                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                                placeholder="Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <input
                            id="email"
                            type="email"
                            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                            placeholder="john.doe@example.com"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            We'll never share your email with anyone else.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <input
                            id="password"
                            type="password"
                            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm"
                            placeholder="••••••••"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Must be at least 8 characters long.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <textarea
                            id="bio"
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="terms"
                            className="size-4 rounded border-input"
                            required
                        />
                        <Label htmlFor="terms" className="text-sm font-normal">
                            I agree to the terms and conditions *
                        </Label>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                        >
                            Submit
                        </button>
                        <button
                            type="reset"
                            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FormDemo;
