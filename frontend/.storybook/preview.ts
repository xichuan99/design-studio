import type { Preview } from "@storybook/react";
import { INITIAL_VIEWPORTS } from "@storybook/addon-viewport";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "hsl(0, 0%, 100%)" },
        { name: "dark", value: "hsl(240, 10%, 3.9%)" },
      ],
    },
    viewport: {
      viewports: {
        ...INITIAL_VIEWPORTS,
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '812px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.backgrounds?.value === "hsl(240, 10%, 3.9%)";
      document.documentElement.classList.toggle('dark', isDark);
      return Story();
    },
  ],
};

export default preview;
