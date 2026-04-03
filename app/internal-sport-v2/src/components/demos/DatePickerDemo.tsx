import { useState } from 'react';
import { DatePicker } from '../ui/date-picker';
import { Label } from '../ui/label';

const DatePickerDemo = () => {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Date Picker</h4>
                <div className="max-w-sm space-y-2">
                    <Label>Select a date</Label>
                    <DatePicker value={date} onChange={(val) => setDate(val ? new Date(val) : undefined)} />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Date Picker with Placeholder</h4>
                <div className="max-w-sm space-y-2">
                    <Label>Pick your birthday</Label>
                    <DatePicker placeholder="Pick a date" />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Disabled Date Picker</h4>
                <div className="max-w-sm space-y-2">
                    <Label>Disabled picker</Label>
                    <DatePicker disabled />
                </div>
            </div>
        </div>
    );
};

export default DatePickerDemo;
