export enum ModelProviderName {
    LLAMALOCAL = 'llamalocal'
}

export interface Character {
    name: string;
    username: string;
    modelProvider: ModelProviderName;
    settings: {
        voice: {
            model: string;
        };
    };
    system: string;
    bio: string[];
    lore: string[];
    messageExamples: Array<[
        { user: string; content: { text: string } },
        { user: string; content: { text: string } }
    ]>;
    postExamples: string[];
    topics: string[];
    style: {
        all: string[];
        chat: string[];
        post: string[];
    };
    adjectives: string[];
} 