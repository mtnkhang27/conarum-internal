import { Token } from '../ui/token';
import { X } from 'lucide-react';

const TokenDemo = () => {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Default Tokens</h4>
                <div className="flex flex-wrap gap-2">
                    <Token>React</Token>
                    <Token>TypeScript</Token>
                    <Token>Vite</Token>
                    <Token>Tailwind CSS</Token>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Removable Tokens</h4>
                <div className="flex flex-wrap gap-2">
                    <Token onRemove={() => console.log('Remove clicked')}>
                        React
                        <X className="ml-1 size-3" />
                    </Token>
                    <Token onRemove={() => console.log('Remove clicked')}>
                        TypeScript
                        <X className="ml-1 size-3" />
                    </Token>
                    <Token onRemove={() => console.log('Remove clicked')}>
                        Vite
                        <X className="ml-1 size-3" />
                    </Token>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold">Colored Tokens</h4>
                <div className="flex flex-wrap gap-2">
                    <Token className="bg-blue-100 text-blue-800">Blue</Token>
                    <Token className="bg-green-100 text-green-800">Green</Token>
                    <Token className="bg-yellow-100 text-yellow-800">Yellow</Token>
                    <Token className="bg-red-100 text-red-800">Red</Token>
                    <Token className="bg-purple-100 text-purple-800">Purple</Token>
                </div>
            </div>
        </div>
    );
};

export default TokenDemo;
