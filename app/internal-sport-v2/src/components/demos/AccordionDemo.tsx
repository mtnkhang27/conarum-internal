import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '../ui/accordion';

const AccordionDemo = () => {
    return (
        <div className="max-w-2xl space-y-4">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>What is CNMA?</AccordionTrigger>
                    <AccordionContent>
                        CNMA is a comprehensive supplier evaluation system that helps organizations
                        manage and evaluate their suppliers efficiently.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>How do I use the components?</AccordionTrigger>
                    <AccordionContent>
                        Simply import the component from the UI library and use it in your React
                        application. All components are built with TypeScript and fully typed.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                    <AccordionTrigger>Are these components accessible?</AccordionTrigger>
                    <AccordionContent>
                        Yes! All components are built on top of Radix UI primitives, ensuring full
                        accessibility compliance with WAI-ARIA standards.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                    <AccordionTrigger>Can I customize the styling?</AccordionTrigger>
                    <AccordionContent>
                        Absolutely! The components use Tailwind CSS and CSS variables, making it
                        easy to customize colors, spacing, and other design tokens.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

export default AccordionDemo;
