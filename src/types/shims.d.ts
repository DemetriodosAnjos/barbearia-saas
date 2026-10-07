declare module '@storybook/react' {
  export type Meta<T = any> = {
    title?: string;
    component?: T;
    tags?: string[];
    argTypes?: Record<string, any>;
    parameters?: Record<string, any>;
    [key: string]: any;
  };

  export type StoryObj<T = any> = {
    args?: any;
    render?: (args?: any) => any;
    parameters?: Record<string, any>;
    play?: (context: any) => Promise<void> | void;
    [key: string]: any;
  };

  export type Preview = {
    parameters?: Record<string, any>;
    decorators?: any[];
    [key: string]: any;
  };
}

declare module '@storybook/react-vite' {
  export type StorybookConfig = {
    stories: string[];
    addons: string[];
    framework: {
      name: string;
      options?: Record<string, any>;
    };
    docs?: Record<string, any>;
    core?: Record<string, any>;
    [key: string]: any;
  };
}

declare module '@playwright/test' {
  export interface Page {
    goto(url: string, options?: any): Promise<any>;
    waitForLoadState(state?: string): Promise<void>;
    evaluate(fn: any): Promise<any>;
    locator(selector: string): any;
  }

  export interface TestContext {
    page: Page;
  }

  export function test(title: string, testFunction: (context: TestContext) => Promise<void> | void): void;
  export namespace test {
    export function describe(title: string, callback: () => void): void;
    export function beforeEach(callback: (context: TestContext) => Promise<void> | void): void;
    export function afterEach(callback: (context: TestContext) => Promise<void> | void): void;
  }

  export function expect(actual: any): any;
  export function defineConfig(config: any): any;
  export const devices: Record<string, any>;
}
