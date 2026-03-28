/**
 * OpenOxygen Intelligent Summarizer
 * 
 * 智能文本总结与翻译
 * 集成 LLM 进行高质量总结
 */

const { createSubsystemLogger } = require("../logging/index.js");

const log = createSubsystemLogger("summarizer");

/**
 * 总结选项
 */
const SummaryOptions = {
    maxLength: 200,
    language: "zh",
    style: "concise", // concise, detailed, bullet
    includeKeyPoints: true
};

/**
 * 总结结果
 */
class SummaryResult {
    constructor(data) {
        this.summary = data.summary || "";
        this.originalLength = data.originalLength || 0;
        this.summaryLength = data.summary.length;
        this.keyPoints = data.keyPoints || [];
        this.language = data.language || "zh";
        this.compressionRatio = this.originalLength > 0 
            ? (this.summaryLength / this.originalLength).toFixed(2)
            : "0.00";
    }
}

/**
 * 智能总结器
 */
class IntelligentSummarizer {
    constructor(config = {}) {
        this.config = {
            llmEndpoint: config.llmEndpoint || "http://localhost:11434",
            model: config.model || "qwen3:4b",
            ...config
        };
    }
    
    /**
     * 总结文本
     */
    async summarize(text, options = {}) {
        const opts = { ...SummaryOptions, ...options };
        
        log.info(`Summarizing text (${text.length} chars)`);
        
        // 如果文本很短，直接返回
        if (text.length <= opts.maxLength) {
            return new SummaryResult({
                summary: text,
                originalLength: text.length,
                keyPoints: [text]
            });
        }
        
        try {
            // 调用 LLM 进行总结
            const summary = await this.callLLM(text, opts);
            
            // 提取关键点
            const keyPoints = await this.extractKeyPoints(text, opts);
            
            return new SummaryResult({
                summary,
                originalLength: text.length,
                keyPoints,
                language: opts.language
            });
            
        } catch (error) {
            log.error("Summarization failed:", error);
            // 降级到简单总结
            return this.simpleSummarize(text, opts);
        }
    }
    
    /**
     * 调用 LLM 进行总结
     */
    async callLLM(text, options) {
        const prompt = this.buildPrompt(text, options);
        
        try {
            const response = await fetch(`${this.config.llmEndpoint}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: this.config.model,
                    prompt: prompt,
                    stream: false
                })
            });
            
            const data = await response.json();
            return data.response || text.substring(0, options.maxLength);
            
        } catch (error) {
            log.warn("LLM call failed, using fallback:", error);
            return text.substring(0, options.maxLength);
        }
    }
    
    /**
     * 构建提示词
     */
    buildPrompt(text, options) {
        const styleMap = {
            concise: "简洁",
            detailed: "详细",
            bullet: "要点列表"
        };
        
        const langMap = {
            zh: "中文",
            en: "英文",
            ja: "日文"
        };
        
        return `请对以下文本进行总结，要求：
- 风格：${styleMap[options.style] || "简洁"}
- 语言：${langMap[options.language] || "中文"}
- 长度：不超过 ${options.maxLength} 字

文本内容：
${text.substring(0, 2000)}

请直接输出总结内容：`;
    }
    
    /**
     * 简单总结（降级方案）
     */
    simpleSummarize(text, options) {
        // 提取前几句
        const sentences = text.match(/[^。！？.!?]+[。！？.!?]+/g) || [text];
        const summary = sentences.slice(0, 3).join("");
        
        return new SummaryResult({
            summary: summary.substring(0, options.maxLength),
            originalLength: text.length,
            keyPoints: sentences.slice(0, 5)
        });
    }
    
    /**
     * 提取关键点
     */
    async extractKeyPoints(text, options) {
        // 简单实现：提取包含关键词的句子
        const keywords = ["重要", "关键", "主要", "核心", "首先", "其次", "最后"];
        const sentences = text.match(/[^。！？.!?]+[。！？.!?]+/g) || [];
        
        const keyPoints = sentences
            .filter(s => keywords.some(k => s.includes(k)))
            .slice(0, 5);
        
        if (keyPoints.length === 0 && sentences.length > 0) {
            // 如果没有关键词，取前几句
            keyPoints.push(...sentences.slice(0, 3));
        }
        
        return keyPoints;
    }
    
    /**
     * 总结网页
     */
    async summarizeWebpage(url, options = {}) {
        log.info(`Summarizing webpage: ${url}`);
        
        try {
            // 获取网页内容
            const response = await fetch(url);
            const html = await response.text();
            
            // 提取文本
            const text = this.extractTextFromHTML(html);
            
            return await this.summarize(text, options);
            
        } catch (error) {
            log.error("Failed to summarize webpage:", error);
            return new SummaryResult({
                summary: `无法访问网页: ${url}`,
                originalLength: 0,
                keyPoints: []
            });
        }
    }
    
    /**
     * 从 HTML 提取文本
     */
    extractTextFromHTML(html) {
        // 简单实现：移除标签
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 5000);
    }
    
    /**
     * 翻译总结
     */
    async translateSummary(summary, targetLang) {
        log.info(`Translating summary to ${targetLang}`);
        
        const langNames = {
            zh: "中文",
            en: "英文",
            ja: "日文",
            ko: "韩文"
        };
        
        try {
            const response = await fetch(`${this.config.llmEndpoint}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: this.config.model,
                    prompt: `请将以下内容翻译成${langNames[targetLang] || targetLang}：\n\n${summary}\n\n翻译：`,
                    stream: false
                })
            });
            
            const data = await response.json();
            return data.response || summary;
            
        } catch (error) {
            log.warn("Translation failed:", error);
            return summary;
        }
    }
}

module.exports = {
    IntelligentSummarizer,
    SummaryResult,
    SummaryOptions
};
