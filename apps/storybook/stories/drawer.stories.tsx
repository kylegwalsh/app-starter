import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@repo/design';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

/**
 * A drawer component for React.
 */
const meta = {
  title: 'ui/Drawer',
  component: Drawer,
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger>Open</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Are you sure absolutely sure?</DrawerTitle>
          <DrawerDescription>This action cannot be undone.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <button className="rounded bg-primary px-4 py-2 text-primary-foreground" type="button">
            Submit
          </button>
          <DrawerClose>
            <button className="hover:underline" type="button">
              Cancel
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
  parameters: {
    layout: 'centered',
  },
} as Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the drawer.
 */
export const Default: Story = {} as Story;
