/**
 * OpenOxygen — DOCX Generator (26w15aD Phase 7)
 *
 * 真实 docx 文档生成
 * 集成 docx 库，支持表格、图片、样式
 */
export interface DocxSection {
    type: "paragraph" | "heading" | "table" | "image" | "list" | "pageBreak";
    content?: string;
    level?: number;
    items?: string[];
    rows?: any[][];
    imagePath?: string;
    style?: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        fontSize?: number;
        color?: string;
        alignment?: "left" | "center" | "right" | "justify";
    };
}
export interface DocxOptions {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    createdAt?: Date;
}
/**
 * Generate DOCX document
 * @param sections - Document sections
 * @param outputPath - Output file path
 * @param options - Document options
 */
export declare function generateDocx(sections: DocxSection[], outputPath: string, options?: DocxOptions): Promise<{
    success: boolean;
    outputPath: string;
    error?: string;
}>;
/**
 * Generate daily report
 * @param data - Report data
 * @param outputPath - Output path
 */
export declare function generateDailyReportDocx(data: {
    date: string;
    tasks: string[];
    progress: string;
    issues: string;
    plans: string[];
}, outputPath: string): Promise<{
    success: boolean;
    outputPath: string;
}>;
/**
 * Generate project report
 * @param data - Report data
 * @param outputPath - Output path
 */
export declare function generateProjectReportDocx(data: {
    title: string;
    summary: string;
    details: string[];
    conclusion: string;
}, outputPath: string): Promise<{
    success: boolean;
    outputPath: string;
}>;
declare const _default: {
    generateDocx: typeof generateDocx;
    generateDailyReportDocx: typeof generateDailyReportDocx;
    generateProjectReportDocx: typeof generateProjectReportDocx;
};
export default _default;
//# sourceMappingURL=generator.d.ts.map