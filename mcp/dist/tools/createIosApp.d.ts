export declare const createIosAppTool: {
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
                default: never[];
            };
        };
        required: string[];
    };
};
export interface AssembleGenerationPromptInput {
    appName: string;
    bundleId: string;
    architecture: string;
    modules?: string[];
}
export declare function handleAssembleGenerationPrompt(input: AssembleGenerationPromptInput): Promise<string>;
//# sourceMappingURL=createIosApp.d.ts.map