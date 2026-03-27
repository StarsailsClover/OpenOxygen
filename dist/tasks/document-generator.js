/**
 * OpenOxygen — Document Generator (P2 Implementation)
 *
 * 文档生成能力：
 *   - docx 文档创建
 *   - 网页内容提取
 *   - 自动总结生成
 *   - 模板支持
 */
import { createSubsystemLogger } from "../logging/index.js";
import { generateId, nowMs } from "../utils/index.js";
const log = createSubsystemLogger("tasks/docgen");

// ─── Document Generator ──────────────────────────────────────────────────────
export class DocumentGenerator {
    templates = new Map();
    
    constructor() {
        this.registerDefaultTemplates();
    }
    
    /**
     * 注册默认模板
     */
    registerDefaultTemplates() {
        this.templates.set("report", {
            name: "报告模板",
            sections: ["title", "summary", "details", "conclusion"],
        });
        this.templates.set("daily", {
            name: "日报模板",
            sections: ["date", "tasks", "progress", "issues", "plans"],
        });
        this.templates.set("meeting", {
            name: "会议纪要",
            sections: ["title", "attendees", "agenda", "decisions", "actions"],
        });
    }
    
    /**
     * 生成 docx 文档
     * @param {string} templateName - 模板名称
     * @param {Object} data - 文档数据
     * @param {string} outputPath - 输出路径
     */
    async generateDocx(templateName, data, outputPath) {
        log.info(`Generating docx: ${templateName} -> ${outputPath}`);
        
        const template = this.templates.get(templateName);
        if (!template) {
            return { success: false, error: `Template not found: ${templateName}` };
        }
        
        try {
            // Create document structure
            const doc = this.createDocumentStructure(template, data);
            
            // Write to file (simplified implementation)
            const content = this.renderDocument(doc);
            const fs = require("node:fs");
            const path = require("node:path");
            
            // Ensure directory exists
            const dir = path.dirname(outputPath);
            fs.mkdirSync(dir, { recursive: true });
            
            // Write as markdown for now (can be converted to docx)
            fs.writeFileSync(outputPath.replace(/\.docx$/, ".md"), content, "utf-8");
            
            log.info(`Document generated: ${outputPath}`);
            return {
                success: true,
                outputPath: outputPath.replace(/\.docx$/, ".md"),
                sections: template.sections,
            };
        } catch (error) {
            log.error(`Document generation failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 创建文档结构
     */
    createDocumentStructure(template, data) {
        const sections = [];
        
        for (const sectionName of template.sections) {
            const sectionData = data[sectionName];
            if (sectionData) {
                sections.push({
                    name: sectionName,
                    content: sectionData,
                });
            }
        }
        
        return {
            template: template.name,
            sections,
            generatedAt: new Date().toISOString(),
        };
    }
    
    /**
     * 渲染文档为 Markdown
     */
    renderDocument(doc) {
        let content = `# ${doc.template}\n\n`;
        content += `生成时间: ${doc.generatedAt}\n\n`;
        content += `---\n\n`;
        
        for (const section of doc.sections) {
            content += `## ${section.name}\n\n`;
            if (typeof section.content === "string") {
                content += `${section.content}\n\n`;
            } else if (Array.isArray(section.content)) {
                for (const item of section.content) {
                    content += `- ${item}\n`;
                }
                content += "\n";
            } else {
                content += `${JSON.stringify(section.content, null, 2)}\n\n`;
            }
        }
        
        return content;
    }
    
    /**
     * 从网页提取内容
     * @param {string} url - 网页 URL
     * @param {Object} options - 提取选项
     */
    async extractFromWebpage(url, options = {}) {
        log.info(`Extracting content from: ${url}`);
        
        try {
            // Use fetch to get webpage
            const response = await fetch(url);
            const html = await response.text();
            
            // Simple HTML to text extraction
            const text = this.htmlToText(html);
            
            // Generate summary if requested
            let summary = null;
            if (options.summarize) {
                summary = await this.generateSummary(text);
            }
            
            return {
                success: true,
                url,
                title: this.extractTitle(html),
                content: text.substring(0, options.maxLength || 10000),
                summary,
            };
        } catch (error) {
            log.error(`Webpage extraction failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * HTML 转文本
     */
    htmlToText(html) {
        // Remove script and style tags
        let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        
        // Decode HTML entities
        text = text
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ");
        
        return text;
    }
    
    /**
     * 提取标题
     */
    extractTitle(html) {
        const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        return match ? match[1].trim() : "Untitled";
    }
    
    /**
     * 生成内容总结
     * @param {string} text - 原始文本
     */
    async generateSummary(text) {
        log.info("Generating summary...");
        
        // Simple extractive summarization
        const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);
        
        if (sentences.length <= 3) {
            return text;
        }
        
        // Take first sentence, one from middle, and last sentence
        const summary = [
            sentences[0],
            sentences[Math.floor(sentences.length / 2)],
            sentences[sentences.length - 1],
        ].join(". ");
        
        return summary;
    }
    
    /**
     * 生成每日报告
     * @param {Object} data - 日报数据
     */
    async generateDailyReport(data) {
        const reportData = {
            date: data.date || new Date().toLocaleDateString("zh-CN"),
            tasks: data.tasks || [],
            progress: data.progress || "无",
            issues: data.issues || "无",
            plans: data.plans || [],
        };
        
        const outputPath = `reports/daily-report-${generateId()}.docx`;
        return this.generateDocx("daily", reportData, outputPath);
    }
    
    /**
     * 生成项目报告
     * @param {Object} data - 项目数据
     */
    async generateProjectReport(data) {
        const reportData = {
            title: data.title || "项目报告",
            summary: data.summary || "",
            details: data.details || [],
            conclusion: data.conclusion || "",
        };
        
        const outputPath = `reports/project-report-${generateId()}.docx`;
        return this.generateDocx("report", reportData, outputPath);
    }
}

// ─── Export ─────────────────────────────────────────────────────────────────
export { DocumentGenerator };
