import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const TextareaDemo = () => {
    return (
        <div className="max-w-md space-y-6">
            <div className="space-y-2">
                <Label htmlFor="message">Your message</Label>
                <Textarea id="message" placeholder="Type your message here." />
            </div>

            <div className="space-y-2">
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    className="min-h-[120px]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="disabled-textarea">Disabled</Label>
                <Textarea
                    id="disabled-textarea"
                    placeholder="This textarea is disabled"
                    disabled
                />
            </div>
        </div>
    );
};

export default TextareaDemo;
