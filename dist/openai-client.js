"use strict";
/**
 * OpenAI API调用封装
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIClient = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIClient {
    constructor(config) {
        this.config = {
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 2000,
            ...config
        };
        this.client = new openai_1.default({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseUrl,
        });
    }
    /**
     * 非流式调用OpenAI API
     */
    async createCompletion(messages) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: messages,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
            });
            return response.choices[0]?.message?.content || '';
        }
        catch (error) {
            throw new Error(`OpenAI API调用失败: ${error.message}`);
        }
    }
    /**
     * 流式调用OpenAI API
     */
    async *createStreamCompletion(messages) {
        try {
            const stream = await this.client.chat.completions.create({
                model: this.config.model,
                messages: messages,
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
                stream: true,
            });
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    yield content;
                }
            }
        }
        catch (error) {
            throw new Error(`OpenAI API流式调用失败: ${error.message}`);
        }
    }
    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // 如果API密钥或baseUrl发生变化，重新创建客户端
        if (newConfig.apiKey || newConfig.baseUrl) {
            this.client = new openai_1.default({
                apiKey: this.config.apiKey,
                baseURL: this.config.baseUrl,
            });
        }
    }
}
exports.OpenAIClient = OpenAIClient;
