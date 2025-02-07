import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const taikoEnvSchema = z.object({
    GOLDRUSH_API_KEY: z.string().min(1, "Goldrush API key is required"),
    TAIKO_PRIVATE_KEY: z.string().min(1, "TAIKO private key is required"),
});

export type taikoConfig = z.infer<typeof taikoEnvSchema>;

export async function validateTaikoConfig(
    runtime: IAgentRuntime
): Promise<taikoConfig> {
    try {
        const config = {
            GOLDRUSH_API_KEY: runtime.getSetting("GOLDRUSH_API_KEY"),
            TAIKO_PRIVATE_KEY: runtime.getSetting("TAIKO_PRIVATE_KEY"),
        };

        return taikoEnvSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(
                `Taiko configuration validation failed:\n${errorMessages}`
            );
        }
        throw error;
    }
}
