/**
 * OpenOxygen Phase 4 �?Human-Likeness Scoring (26w11aE_P4)
 *
 * 评估输入序列的人类行为相似度
 * 用于反检测、质量保证、安全审�?
 */
import { createSubsystemLogger } from "../logging/index.js";
const log = createSubsystemLogger("input/score");
// ══════════════════════════════════════════════════════════════════════════�?
// Scoring Engine
// ══════════════════════════════════════════════════════════════════════════�?
export class HumanLikenessScorer {
    /**
     * 评估输入序列的人类行为相似度
     */
    score(actions) {
        const timing = this.scoreTiming(actions);
        const movement = this.scoreMovement(actions);
        const pattern = this.scorePattern(actions);
        const overall = Math.round(timing.score * 0.35 + movement.score * 0.4 + pattern.score * 0.25);
        const suggestions = this.generateSuggestions(timing, movement, pattern);
        return { overall, timing, movement, pattern, suggestions };
    }
    scoreTiming(actions) {
        if (actions.length < 2) {
            return {
                score: 50,
                meanIntervalMs: 0,
                stdDevMs: 0,
                hasNaturalVariance: false,
                hasMicroPauses: false,
            };
        }
        const intervals = [];
        for (let i = 1; i < actions.length; i++) {
            intervals.push(actions[i].timestamp - actions[i - 1].timestamp);
        }
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const stdDev = Math.sqrt(intervals.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
            intervals.length);
        // 人类行为特征
        const cv = mean > 0 ? stdDev / mean : 0; // 变异系数
        const hasNaturalVariance = cv > 0.1 && cv < 0.5; // 10%-50% 变异
        const hasMicroPauses = intervals.some((i) => i > 200 && i < 3000);
        // 评分
        let score = 50;
        if (hasNaturalVariance)
            score += 20;
        if (hasMicroPauses)
            score += 15;
        if (mean > 50 && mean < 2000)
            score += 15; // 合理的间隔范�?
        // 惩罚
        if (cv < 0.05)
            score -= 30; // 太均匀 = 机器�?
        if (mean < 10)
            score -= 20; // 太快
        return {
            score: Math.max(0, Math.min(100, score)),
            meanIntervalMs: Math.round(mean),
            stdDevMs: Math.round(stdDev),
            hasNaturalVariance,
            hasMicroPauses,
        };
    }
    scoreMovement(actions) {
        const moves = actions.filter((a) => (a.type === "move" || a.type === "click" || a.type === "smooth_move") &&
            a.x !== undefined &&
            a.y !== undefined);
        if (moves.length < 2) {
            return {
                score: 50,
                pathSmoothness: 0.5,
                hasAcceleration: false,
                hasOvershoot: false,
                straightLineRatio: 0,
            };
        }
        // 计算路径特征
        let totalSegments = 0;
        let straightSegments = 0;
        const distances = [];
        const angles = [];
        for (let i = 1; i < moves.length; i++) {
            const dx = (moves[i].x ?? 0) - (moves[i - 1].x ?? 0);
            const dy = (moves[i].y ?? 0) - (moves[i - 1].y ?? 0);
            const dist = Math.sqrt(dx * dx + dy * dy);
            distances.push(dist);
            if (i > 1) {
                const prevDx = (moves[i - 1].x ?? 0) - (moves[i - 2].x ?? 0);
                const prevDy = (moves[i - 1].y ?? 0) - (moves[i - 2].y ?? 0);
                const angle = Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx);
                angles.push(Math.abs(angle));
            }
            totalSegments++;
            // 直线检测：连续3点共�?
            if (angles.length > 0 && angles[angles.length - 1] < 0.05) {
                straightSegments++;
            }
        }
        const straightLineRatio = totalSegments > 0 ? straightSegments / totalSegments : 0;
        // 路径平滑�?= 角度变化不应太大也不应太�?
        const meanAngle = angles.length > 0 ? angles.reduce((a, b) => a + b, 0) / angles.length : 0;
        const pathSmoothness = meanAngle > 0.01 && meanAngle < 0.5 ? 0.8 : 0.3;
        // 加速→减速模�?
        const hasAcceleration = distances.length >= 3 &&
            distances[0] < distances[Math.floor(distances.length / 2)] &&
            distances[Math.floor(distances.length / 2)] >
                distances[distances.length - 1];
        // 过冲检测（最后几个点距离增大后减小）
        const hasOvershoot = distances.length >= 4 &&
            distances[distances.length - 2] > distances[distances.length - 1];
        let score = 50;
        if (pathSmoothness > 0.5)
            score += 15;
        if (hasAcceleration)
            score += 15;
        if (hasOvershoot)
            score += 10;
        if (straightLineRatio < 0.3)
            score += 10;
        if (straightLineRatio > 0.8)
            score -= 20; // 太直 = 机器�?
        return {
            score: Math.max(0, Math.min(100, score)),
            pathSmoothness,
            hasAcceleration,
            hasOvershoot,
            straightLineRatio,
        };
    }
    scorePattern(actions) {
<<<<<<< HEAD
        // 重复性检�?
=======
        // 重复性检测
>>>>>>> dev
        const typeSequence = actions.map((a) => a.type).join(",");
        const chunks = [];
        for (let len = 2; len <= 5; len++) {
            for (let i = 0; i <= actions.length - len; i++) {
                chunks.push(actions
                    .slice(i, i + len)
                    .map((a) => a.type)
                    .join(","));
            }
        }
        const uniqueChunks = new Set(chunks);
        const isRepetitive = chunks.length > 0 && uniqueChunks.size / chunks.length < 0.3;
        // 犹豫检�?
        const hasHesitation = actions.some((a, i) => {
            if (i === 0)
                return false;
            const gap = a.timestamp - actions[i - 1].timestamp;
            return gap > 500 && gap < 3000;
        });
<<<<<<< HEAD
        // 点击精确度（像素级精确不自然�?
=======
        // 点击精确度（像素级精确不自然）
>>>>>>> dev
        const clickActions = actions.filter((a) => a.type === "click" && a.x !== undefined);
        const clickPrecision = clickActions.length > 1
            ? (() => {
                const xValues = clickActions.map((a) => a.x);
                const yValues = clickActions.map((a) => a.y);
                const allRound = xValues.every((x) => x % 5 === 0) &&
                    yValues.every((y) => y % 5 === 0);
                return allRound ? 1.0 : 0.5;
            })()
            : 0.5;
        let score = 60;
        if (!isRepetitive)
            score += 15;
        if (hasHesitation)
            score += 15;
        if (clickPrecision < 0.8)
            score += 10;
        if (isRepetitive)
            score -= 25;
        return {
            score: Math.max(0, Math.min(100, score)),
            isRepetitive,
            hasHesitation,
            clickPrecision,
        };
    }
    generateSuggestions(timing, movement, pattern) {
        const suggestions = [];
        if (!timing.hasNaturalVariance) {
            suggestions.push("Add 10-30% random variation to action intervals");
        }
        if (!timing.hasMicroPauses) {
            suggestions.push("Insert occasional 200-2000ms pauses between action groups");
        }
        if (movement.straightLineRatio > 0.6) {
            suggestions.push("Use bezier curve interpolation instead of linear movement");
        }
        if (!movement.hasAcceleration) {
            suggestions.push("Add acceleration/deceleration pattern to mouse movements");
        }
        if (pattern.isRepetitive) {
            suggestions.push("Vary action sequences to reduce pattern predictability");
        }
        if (pattern.clickPrecision > 0.9) {
            suggestions.push("Add ±2-5px jitter to click coordinates");
        }
        return suggestions;
    }
}
// 全局评分�?
export const humanScorer = new HumanLikenessScorer();
