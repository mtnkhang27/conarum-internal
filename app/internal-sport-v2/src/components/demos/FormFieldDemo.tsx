import { FormField } from '../ui/form-field';

const FormFieldDemo = () => {
    return (
        <div className="max-w-md space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Form Fields</h4>
                <FormField label="Username" required value="" placeholder="Enter your username" />

                <FormField label="Email" value="" type="text" placeholder="email@example.com" />

                <FormField
                    label="Password"
                    value=""
                    required
                    placeholder="Enter password"
                    variant="destructive"
                />

                <FormField label="Bio" value="" placeholder="Write a short bio..." />

                <FormField label="Disabled Field" disabled value="" placeholder="This field is disabled" />
            </div>
        </div>
    );
};

export default FormFieldDemo;
