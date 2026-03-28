/**
 * Python AI Module - Reflection Engine
 * 
 * 反思引擎 - 自动决策、错误修复、学习优化
 * 
 * 基于 2603141948.md:
 * "训练OxygenUltraVision并教会它反思和重来与试错的能力"
 */

import json
import os
from typing import List, Dict, Any, Callable, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

class DecisionType(Enum):
    """决策类型"""
    TASK_DECOMPOSITION = "task_decomposition"
    AGENT_SELECTION = "agent_selection"
    ERROR_RECOVERY = "error_recovery"
    STRATEGY_ADJUSTMENT = "strategy_adjustment"

@dataclass
class AutonomousDecision:
    """自主决策记录"""
    id: str
    timestamp: str
    decision_type: DecisionType
    context: str
    decision: str
    reasoning: str
    confidence: float
    action_taken: str
    result: Any
    success: bool
    learning_applied: bool = False

class ReflectionEngine:
    """
    反思引擎
    
    功能:
    1. 自动决策
    2. 错误识别与修复
    3. 策略调整
    4. 持续学习
    """
    
    def __init__(self, memory_path: str = ".state/reflection_memory.json"):
        self.memory_path = memory_path
        self.decisions: List[AutonomousDecision] = []
        self.patterns: Dict[str, Any] = {}
        self.correction_strategies: Dict[str, Callable] = {}
        self._load_memory()
        self._register_default_strategies()
    
    def _load_memory(self):
        """加载反思记忆"""
        if os.path.exists(self.memory_path):
            with open(self.memory_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.decisions = [AutonomousDecision(**d) for d in data.get("decisions", [])]
                self.patterns = data.get("patterns", {})
    
    def _save_memory(self):
        """保存反思记忆"""
        os.makedirs(os.path.dirname(self.memory_path), exist_ok=True)
        data = {
            "decisions": [asdict(d) for d in self.decisions],
            "patterns": self.patterns,
            "last_updated": datetime.now().isoformat()
        }
        with open(self.memory_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _register_default_strategies(self):
        """注册默认修复策略"""
        self.correction_strategies = {
            "timeout": self._fix_timeout,
            "not_found": self._fix_not_found,
            "permission_denied": self._fix_permission,
            "network_error": self._fix_network,
            "element_not_interactable": self._fix_element_interaction,
            "stale_element": self._fix_stale_element,
        }
    
    def make_decision(
        self,
        decision_type: DecisionType,
        context: str,
        options: List[str],
        action_func: Callable[[str], Any]
    ) -> AutonomousDecision:
        """
        做出自主决策
        
        基于历史数据和模式识别选择最佳选项
        """
        # Analyze similar past decisions
        similar_decisions = self._find_similar_decisions(decision_type, context)
        
        # Score each option
        option_scores = {}
        for option in options:
            score = self._score_option(option, similar_decisions)
            option_scores[option] = score
        
        # Select best option
        best_option = max(option_scores, key=option_scores.get)
        confidence = option_scores[best_option]
        
        # Generate reasoning
        reasoning = self._generate_reasoning(best_option, similar_decisions, confidence)
        
        # Execute action
        try:
            result = action_func(best_option)
            success = True
        except Exception as e:
            result = {"error": str(e)}
            success = False
        
        # Record decision
        decision = AutonomousDecision(
            id=f"dec_{len(self.decisions)}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            timestamp=datetime.now().isoformat(),
            decision_type=decision_type,
            context=context,
            decision=best_option,
            reasoning=reasoning,
            confidence=confidence,
            action_taken=best_option,
            result=result,
            success=success
        )
        
        self.decisions.append(decision)
        self._save_memory()
        
        # If failed, attempt reflection and retry
        if not success:
            self._reflect_and_retry(decision, action_func)
        
        return decision
    
    def _find_similar_decisions(
        self,
        decision_type: DecisionType,
        context: str
    ) -> List[AutonomousDecision]:
        """查找相似的历史决策"""
        similar = []
        
        for decision in self.decisions:
            if decision.decision_type == decision_type:
                # Simple similarity check
                context_words = set(context.lower().split())
                decision_words = set(decision.context.lower().split())
                overlap = len(context_words & decision_words)
                
                if overlap > 2:  # Threshold
                    similar.append(decision)
        
        # Sort by recency
        similar.sort(key=lambda d: d.timestamp, reverse=True)
        return similar[:10]  # Last 10 similar decisions
    
    def _score_option(
        self,
        option: str,
        similar_decisions: List[AutonomousDecision]
    ) -> float:
        """评分选项"""
        score = 0.5  # Base score
        
        for decision in similar_decisions:
            if decision.decision == option:
                if decision.success:
                    score += 0.2 * decision.confidence
                else:
                    score -= 0.15
        
        return max(0.0, min(1.0, score))
    
    def _generate_reasoning(
        self,
        option: str,
        similar_decisions: List[AutonomousDecision],
        confidence: float
    ) -> str:
        """生成决策理由"""
        success_count = sum(1 for d in similar_decisions if d.decision == option and d.success)
        total_count = sum(1 for d in similar_decisions if d.decision == option)
        
        if total_count > 0:
            success_rate = success_count / total_count
            return f"基于 {total_count} 次相似决策，成功率 {success_rate:.1%}，置信度 {confidence:.2f}"
        else:
            return f"无历史数据，基于默认策略选择，置信度 {confidence:.2f}"
    
    def _reflect_and_retry(
        self,
        failed_decision: AutonomousDecision,
        action_func: Callable[[str], Any],
        max_retries: int = 3
    ) -> Optional[AutonomousDecision]:
        """
        反思失败并尝试修复
        
        基于 2603141948.md:
        "当犯错时让OpenOxygen知道自己在做什么，以及如何修复它"
        """
        error = str(failed_decision.result.get("error", ""))
        
        for attempt in range(max_retries):
            # Identify error type
            error_type = self._classify_error(error)
            
            # Get correction strategy
            strategy = self.correction_strategies.get(error_type)
            
            if strategy:
                # Apply correction
                correction = strategy(failed_decision)
                
                if correction.get("can_retry", False):
                    try:
                        # Retry with correction
                        new_result = action_func(correction.get("adjusted_action", failed_decision.decision))
                        
                        # Record successful correction
                        success_decision = AutonomousDecision(
                            id=f"dec_retry_{attempt}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                            timestamp=datetime.now().isoformat(),
                            decision_type=failed_decision.decision_type,
                            context=failed_decision.context,
                            decision=correction.get("adjusted_action", failed_decision.decision),
                            reasoning=f"修复后重试: {correction.get('reasoning', '')}",
                            confidence=failed_decision.confidence * 0.9,  # Lower confidence
                            action_taken=correction.get("adjusted_action", failed_decision.decision),
                            result=new_result,
                            success=True,
                            learning_applied=True
                        )
                        
                        self.decisions.append(success_decision)
                        self._save_memory()
                        
                        # Learn from this correction
                        self._learn_correction(failed_decision, success_decision, correction)
                        
                        return success_decision
                        
                    except Exception as e:
                        error = str(e)
                        continue
            else:
                # No known strategy, can't fix
                break
        
        # All retries failed
        return None
    
    def _classify_error(self, error: str) -> str:
        """分类错误类型"""
        error_lower = error.lower()
        
        if "timeout" in error_lower:
            return "timeout"
        elif "not found" in error_lower or "no such" in error_lower:
            return "not_found"
        elif "permission" in error_lower or "access denied" in error_lower:
            return "permission_denied"
        elif "network" in error_lower or "connection" in error_lower:
            return "network_error"
        elif "interactable" in error_lower or "click intercepted" in error_lower:
            return "element_not_interactable"
        elif "stale" in error_lower:
            return "stale_element"
        else:
            return "unknown"
    
    def _fix_timeout(self, decision: AutonomousDecision) -> Dict:
        """修复超时错误"""
        return {
            "can_retry": True,
            "adjusted_action": decision.decision,
            "adjustments": ["increase_timeout"],
            "reasoning": "增加超时时间后重试"
        }
    
    def _fix_not_found(self, decision: AutonomousDecision) -> Dict:
        """修复未找到错误"""
        return {
            "can_retry": False,
            "adjusted_action": decision.decision,
            "adjustments": ["expand_search_area", "wait_for_element"],
            "reasoning": "元素未找到，需要调整搜索策略"
        }
    
    def _fix_permission(self, decision: AutonomousDecision) -> Dict:
        """修复权限错误"""
        return {
            "can_retry": True,
            "adjusted_action": decision.decision,
            "adjustments": ["elevate_privilege"],
            "reasoning": "提升权限后重试"
        }
    
    def _fix_network(self, decision: AutonomousDecision) -> Dict:
        """修复网络错误"""
        return {
            "can_retry": True,
            "adjusted_action": decision.decision,
            "adjustments": ["retry_with_backoff"],
            "reasoning": "网络错误，指数退避后重试"
        }
    
    def _fix_element_interaction(self, decision: AutonomousDecision) -> Dict:
        """修复元素交互错误"""
        return {
            "can_retry": True,
            "adjusted_action": decision.decision,
            "adjustments": ["scroll_into_view", "wait_for_clickable"],
            "reasoning": "滚动到视口并等待可点击后重试"
        }
    
    def _fix_stale_element(self, decision: AutonomousDecision) -> Dict:
        """修复元素过期错误"""
        return {
            "can_retry": True,
            "adjusted_action": decision.decision,
            "adjustments": ["re_find_element"],
            "reasoning": "重新查找元素后重试"
        }
    
    def _learn_correction(
        self,
        failed: AutonomousDecision,
        success: AutonomousDecision,
        correction: Dict
    ):
        """学习修复模式"""
        error_type = self._classify_error(str(failed.result.get("error", "")))
        
        if error_type not in self.patterns:
            self.patterns[error_type] = {
                "count": 0,
                "successful_corrections": []
            }
        
        self.patterns[error_type]["count"] += 1
        self.patterns[error_type]["successful_corrections"].append({
            "from": failed.decision,
            "to": success.decision,
            "adjustments": correction.get("adjustments", []),
            "timestamp": datetime.now().isoformat()
        })
    
    def get_learning_statistics(self) -> Dict:
        """获取学习统计"""
        total_decisions = len(self.decisions)
        successful_decisions = sum(1 for d in self.decisions if d.success)
        learning_applied = sum(1 for d in self.decisions if d.learning_applied)
        
        return {
            "total_decisions": total_decisions,
            "successful_decisions": successful_decisions,
            "success_rate": successful_decisions / total_decisions if total_decisions > 0 else 0,
            "learning_applied": learning_applied,
            "error_patterns": len(self.patterns),
            "pattern_details": self.patterns
        }

# Export
__all__ = ['ReflectionEngine', 'AutonomousDecision', 'DecisionType']
