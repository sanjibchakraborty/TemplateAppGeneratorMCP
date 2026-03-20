export declare const wizardTool: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            appName: {
                type: string;
                description: string;
            };
            bundleId: {
                type: string;
                description: string;
            };
            architecture: {
                type: string;
                enum: string[];
                description: string;
            };
            modules: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            confirmed: {
                type: string;
                description: string;
            };
        };
        required: never[];
    };
};
export interface WizardInput {
    appName?: string;
    bundleId?: string;
    architecture?: string;
    modules?: string[];
    confirmed?: boolean;
}
export declare function handleWizard(input: WizardInput): Promise<string>;
//# sourceMappingURL=wizard.d.ts.map