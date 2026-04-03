import AccordionDemo from './demos/AccordionDemo';
import AlertDemo from './demos/AlertDemo';
import AlertDialogDemo from './demos/AlertDialogDemo';
import AspectRatioDemo from './demos/AspectRatioDemo';
import AvatarDemo from './demos/AvatarDemo';
import BadgeDemo from './demos/BadgeDemo';
import BreadcrumbDemo from './demos/BreadcrumbDemo';
import ButtonDemo from './demos/ButtonDemo';
import CarouselDemo from './demos/CarouselDemo';
import CardDemo from './demos/CardDemo';
import ChartDemo from './demos/ChartDemo';
import CheckboxDemo from './demos/CheckboxDemo';
import CollapsibleDemo from './demos/CollapsibleDemo';
import ContextMenuDemo from './demos/ContextMenuDemo';
import DatePickerDemo from './demos/DatePickerDemo';
import FilterBarDemo from './demos/FilterBarDemo';
import DialogDemo from './demos/DialogDemo';
import DrawerDemo from './demos/DrawerDemo';
import DropdownMenuDemo from './demos/DropdownMenuDemo';
import FormDemo from './demos/FormDemo';
import FormFieldDemo from './demos/FormFieldDemo';
import HoverCardDemo from './demos/HoverCardDemo';
import InputDemo from './demos/InputDemo';
import LabelDemo from './demos/LabelDemo';
import MenubarDemo from './demos/MenubarDemo';
import NavigationMenuDemo from './demos/NavigationMenuDemo';
import PaginationDemo from './demos/PaginationDemo';
import PopoverDemo from './demos/PopoverDemo';
import ProgressDemo from './demos/ProgressDemo';
import RadioGroupDemo from './demos/RadioGroupDemo';
import ResizableDemo from './demos/ResizableDemo';
import ScrollAreaDemo from './demos/ScrollAreaDemo';
import SelectDemo from './demos/SelectDemo';
import SeparatorDemo from './demos/SeparatorDemo';
import SheetDemo from './demos/SheetDemo';
import SkeletonDemo from './demos/SkeletonDemo';
import SliderDemo from './demos/SliderDemo';
import SwitchDemo from './demos/SwitchDemo';
import TableDemo from './demos/TableDemo';
import TabsDemo from './demos/TabsDemo';
import TextareaDemo from './demos/TextareaDemo';
import DataTableDemo from './demos/DataTableDemo';
import ToastDemo from './demos/ToastDemo';
import ToggleDemo from './demos/ToggleDemo';
import ToggleGroupDemo from './demos/ToggleGroupDemo';
import TokenDemo from './demos/TokenDemo';
import TooltipDemo from './demos/TooltipDemo';

interface ComponentShowcaseProps {
    componentName: string;
}

const ComponentShowcase = ({ componentName }: ComponentShowcaseProps) => {
    const renderDemo = () => {
        switch (componentName) {
            case 'Accordion':
                return <AccordionDemo />;
            case 'Alert':
                return <AlertDemo />;
            case 'Alert Dialog':
                return <AlertDialogDemo />;
            case 'Aspect Ratio':
                return <AspectRatioDemo />;
            case 'Avatar':
                return <AvatarDemo />;
            case 'Badge':
                return <BadgeDemo />;
            case 'Breadcrumb':
                return <BreadcrumbDemo />;
            case 'Button':
                return <ButtonDemo />;
            case 'Card':
                return <CardDemo />;
            case 'Carousel':
                return <CarouselDemo />;
            case 'Chart':
                return <ChartDemo />;
            case 'Checkbox':
                return <CheckboxDemo />;
            case 'Collapsible':
                return <CollapsibleDemo />;
            case 'Context Menu':
                return <ContextMenuDemo />;
            case 'Date Picker':
                return <DatePickerDemo />;
            case 'FilterBar':
            case 'Date Range Filter':
            case 'Multi Select Filter':
            case 'Text Filter':
            case 'Value Help Filter':
                return <FilterBarDemo />;
            case 'Dialog':
                return <DialogDemo />;
            case 'Drawer':
                return <DrawerDemo />;
            case 'Dropdown Menu':
                return <DropdownMenuDemo />;
            case 'Form':
                return <FormDemo />;
            case 'Form Field':
                return <FormFieldDemo />;
            case 'Hover Card':
                return <HoverCardDemo />;
            case 'Input':
                return <InputDemo />;
            case 'Label':
                return <LabelDemo />;
            case 'Menubar':
                return <MenubarDemo />;
            case 'Navigation Menu':
                return <NavigationMenuDemo />;
            case 'Pagination':
                return <PaginationDemo />;
            case 'Popover':
                return <PopoverDemo />;
            case 'Progress':
                return <ProgressDemo />;
            case 'Radio Group':
                return <RadioGroupDemo />;
            case 'Resizable':
                return <ResizableDemo />;
            case 'Scroll Area':
                return <ScrollAreaDemo />;
            case 'Select':
                return <SelectDemo />;
            case 'Separator':
                return <SeparatorDemo />;
            case 'Sheet':
                return <SheetDemo />;
            case 'Skeleton':
                return <SkeletonDemo />;
            case 'Slider':
                return <SliderDemo />;
            case 'Switch':
                return <SwitchDemo />;
            case 'Table':
                return <TableDemo />;
            case 'Tabs':
                return <TabsDemo />;
            case 'Textarea':
                return <TextareaDemo />;
            case 'Data Table':
                return <DataTableDemo />;
            case 'Toast (Sonner)':
                return <ToastDemo />;
            case 'Toggle':
                return <ToggleDemo />;
            case 'Toggle Group':
                return <ToggleGroupDemo />;
            case 'Token':
                return <TokenDemo />;
            case 'Tooltip':
                return <TooltipDemo />;
            default:
                return (
                    <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-muted-foreground">
                                Demo Coming Soon
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                The demo for <strong>{componentName}</strong> is being prepared.
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                <div className="rounded-lg border bg-card p-8">{renderDemo()}</div>
            </div>
        </div>
    );
};

export default ComponentShowcase;
