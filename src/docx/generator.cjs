/**
 * OpenOxygen Document Generator
 * 
 * 智能文档生成器
 * 支持 DOCX, PDF, Markdown
 */

const fs = require("fs");
const path = require("path");

const log = {
    info: (...args) => console.log("[DocGen]", ...args),
    warn: (...args) => console.warn("[DocGen]", ...args),
    error: (...args) => console.error("[DocGen]", ...args)
};

/**
 * 文档生成器
 */
class DocumentGenerator {
    constructor(config = {}) {
        this.config = {
            outputDir: config.outputDir || "./output",
            templateDir: config.templateDir || "./templates",
            ...config
        };
        
        // 确保输出目录存在
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }
    }
    
    /**
     * 生成 Markdown 文档
     */
    async generateMarkdown(data, options = {}) {
        const { title, content, metadata = {} } = data;
        
        log.info(`Generating Markdown: ${title}`);
        
        let markdown = `# ${title}\n\n`;
        
        // 添加元数据
        if (metadata.author) {
            markdown += `**作者**: ${metadata.author}\n\n`;
        }
        if (metadata.date) {
            markdown += `**日期**: ${metadata.date}\n\n`;
        }
        
        markdown += `---\n\n`;
        markdown += content;
        
        // 保存
        const filename = options.filename || `${this.sanitizeFilename(title)}.md`;
        const filepath = path.join(this.config.outputDir, filename);
        
        fs.writeFileSync(filepath, markdown, "utf8");
        
        log.info(`Markdown saved: ${filepath}`);
        
        return {
            success: true,
            format: "markdown",
            path: filepath,
            size: fs.statSync(filepath).size
        };
    }
    
    /**
     * 生成 HTML 文档
     */
    async generateHTML(data, options = {}) {
        const { title, content, metadata = {} } = data;
        
        log.info(`Generating HTML: ${title}`);
        
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: "Consolas", monospace;
        }
        pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${metadata.author ? `<p><strong>作者</strong>: ${metadata.author}</p>` : ""}
    ${metadata.date ? `<p><strong>日期</strong>: ${metadata.date}</p>` : ""}
    <hr>
    ${this.markdownToHTML(content)}
</body>
</html>`;
        
        const filename = options.filename || `${this.sanitizeFilename(title)}.html`;
        const filepath = path.join(this.config.outputDir, filename);
        
        fs.writeFileSync(filepath, html, "utf8");
        
        log.info(`HTML saved: ${filepath}`);
        
        return {
            success: true,
            format: "html",
            path: filepath,
            size: fs.statSync(filepath).size
        };
    }
    
    /**
     * 生成 JSON 文档
     */
    async generateJSON(data, options = {}) {
        const { title, content, metadata = {} } = data;
        
        log.info(`Generating JSON: ${title}`);
        
        const jsonData = {
            title,
            metadata: {
                ...metadata,
                generatedAt: new Date().toISOString()
            },
            content
        };
        
        const filename = options.filename || `${this.sanitizeFilename(title)}.json`;
        const filepath = path.join(this.config.outputDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2), "utf8");
        
        log.info(`JSON saved: ${filepath}`);
        
        return {
            success: true,
            format: "json",
            path: filepath,
            size: fs.statSync(filepath).size
        };
    }
    
    /**
     * Markdown 转 HTML
     */
    markdownToHTML(markdown) {
        return markdown
            // 代码块
            .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
            // 行内代码
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            // 标题
            .replace(/^### (.+)$/gm, "<h3>$1</h3>")
            .replace(/^## (.+)$/gm, "<h2>$1</h2>")
            .replace(/^# (.+)$/gm, "<h1>$1</h1>")
            // 粗体
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            // 斜体
            .replace(/\*([^*]+)\*/g, "<em>$1</em>")
            // 列表
            .replace(/^- (.+)$/gm, "<li>$1</li>")
            // 段落
            .replace(/\n\n/g, "</p><p>")
            // 换行
            .replace(/\n/g, "<br>");
    }
    
    /**
     * 生成报告
     */
    async generateReport(data, options = {}) {
        const { title, sections = [], summary = "" } = data;
        
        log.info(`Generating report: ${title}`);
        
        let content = summary ? `## 摘要\n\n${summary}\n\n` : "";
        
        for (const section of sections) {
            content += `## ${section.title}\n\n`;
            content += `${section.content}\n\n`;
            
            if (section.data) {
                content += "```json\n";
                content += JSON.stringify(section.data, null, 2);
                content += "\n```\n\n";
            }
        }
        
        return this.generateMarkdown({
            title,
            content,
            metadata: {
                author: options.author,
                date: new Date().toISOString().split("T")[0]
            }
        }, options);
    }
    
    /**
     * 生成测试报告
     */
    async generateTestReport(testResults, options = {}) {
        const { total, passed, failed, tests = [] } = testResults;
        
        const sections = tests.map(test => ({
            title: test.name,
            content: `状态: ${test.status}\n耗时: ${test.duration}ms\n${test.error ? `错误: ${test.error}` : ""}`
        }));
        
        return this.generateReport({
            title: "测试报告",
            summary: `总计: ${total}, 通过: ${passed}, 失败: ${failed}, 通过率: ${(passed/total*100).toFixed(1)}%`,
            sections
        }, { filename: "test-report.md", ...options });
    }
    
    /**
     * 生成性能报告
     */
    async generatePerformanceReport(metrics, options = {}) {
        const sections = Object.entries(metrics).map(([name, stats]) => ({
            title: name,
            content: `平均: ${stats.avg.toFixed(2)}ms\n最小: ${stats.min}ms\n最大: ${stats.max}ms\nP95: ${stats.p95}ms`,
            data: stats
        }));
        
        return this.generateReport({
            title: "性能报告",
            summary: `生成时间: ${new Date().toISOString()}`,
            sections
        }, { filename: "performance-report.md", ...options });
    }
    
    /**
     * 文件名清理
     */
    sanitizeFilename(name) {
        return name
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase();
    }
}

module.exports = { DocumentGenerator };
