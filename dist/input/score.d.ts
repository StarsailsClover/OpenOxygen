/**
 * OpenOxygen Phase 4 — Human-Likeness Scoring (26w11aE_P4)
 *
 * 评估输入序列的人类行为相似度
 * 用于反检测、质量保证、安全审计
 */
export interface HumanLikenessReport {
    overall: number;
    timing: TimingScore;
    movement: MovementScore;
    pattern: PatternScore;
    suggestions: string[];
}
export interface TimingScore {
    score: number;
    meanIntervalMs: number;
    stdDevMs: number;
    hasNaturalVariance: boolean;
    hasMicroPauses: boolean;
}
export interface MovementScore {
    score: number;
    pathSmoothness: number;
    hasAcceleration: boolean;
    hasOvershoot: boolean;
    straightLineRatio: number;
}
export interface PatternScore {
    score: number;
    isRepetitive: boolean;
    hasHesitation: boolean;
    clickPrecision: number;
}
export declare class HumanLikenessScorer {
    /**
     * 评估输入序列的人类行为相似度
     */
    score(actions: Array<{
        type: string;
        x?: number;
        y?: number;
        timestamp: number;
        duration?: number;
    }>): HumanLikenessReport;
    private scoreTiming;
    private scoreMovement;
    private scorePattern;
    private generateSuggestions;
}
export declare const humanScorer: HumanLikenessScorer;
//# sourceMappingURL=score.d.ts.map