/**
 * Python AI Module - OUV (OxygenUltraVision)
 * 
 * 基于人类规划:
 * - 26w15aB-26w15aHRoadmap.md: "Agent理解屏幕操作与进行屏幕操作的工具"
 * - 2603141948.md: "训练OxygenUltraVision并教会它反思和重来与试错的能力"
 */

import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import json
import os

@dataclass
class VisualElement:
    """视觉元素"""
    id: str
    element_type: str
    text: str
    x: int
    y: int
    width: int
    height: int
    confidence: float
    screenshot_region: Optional[Tuple[int, int, int, int]] = None

@dataclass
class OUVPrediction:
    """OUV 预测结果"""
    element: VisualElement
    action: str
    coordinates: Tuple[int, int]
    confidence: float
    reasoning: str

class OUVVectorDB:
    """OUV 向量数据库"""
    
    def __init__(self, db_path: str = ".state/ouv_vectors"):
        self.db_path = db_path
        self.vectors: Dict[str, np.ndarray] = {}
        self.metadata: Dict[str, Dict] = {}
        self._load()
    
    def _load(self):
        """加载向量数据库"""
        if os.path.exists(f"{self.db_path}/vectors.json"):
            with open(f"{self.db_path}/vectors.json", "r") as f:
                data = json.load(f)
                for key, vec in data.get("vectors", {}).items():
                    self.vectors[key] = np.array(vec)
                self.metadata = data.get("metadata", {})
    
    def _save(self):
        """保存向量数据库"""
        os.makedirs(self.db_path, exist_ok=True)
        data = {
            "vectors": {k: v.tolist() for k, v in self.vectors.items()},
            "metadata": self.metadata
        }
        with open(f"{self.db_path}/vectors.json", "w") as f:
            json.dump(data, f)
    
    def add(self, key: str, vector: np.ndarray, metadata: Dict = None):
        """添加向量"""
        self.vectors[key] = vector
        self.metadata[key] = metadata or {}
        self._save()
    
    def search(self, query_vector: np.ndarray, top_k: int = 5) -> List[Tuple[str, float]]:
        """相似度搜索"""
        if not self.vectors:
            return []
        
        similarities = []
        for key, vec in self.vectors.items():
            # Cosine similarity
            similarity = np.dot(query_vector, vec) / (np.linalg.norm(query_vector) * np.linalg.norm(vec))
            similarities.append((key, float(similarity)))
        
        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

class OxygenUltraVision:
    """
    OUV - Agent 理解屏幕操作与进行屏幕操作的工具
    
    功能:
    1. 精确识别元素
    2. 预测操作
    3. 精确获取坐标
    4. 精确操作
    5. 精确反思
    """
    
    def __init__(self, model_path: str = None):
        self.vector_db = OUVVectorDB()
        self.training_data: List[Dict] = []
        self.reflection_history: List[Dict] = []
        self.correction_count = 0
        self.success_count = 0
        self.failure_count = 0
    
    def analyze_screen(self, screenshot_path: str, instruction: str) -> List[VisualElement]:
        """
        分析屏幕，识别所有交互元素
        
        基于 26w15aB-26w15aHRoadmap.md:
        "精确识别元素->预测->精确获取坐标->精确操作->精确反思的链路循环"
        """
        # This would integrate with VLM (Vision Language Model)
        # For now, return placeholder
        elements = [
            VisualElement(
                id="btn_1",
                element_type="button",
                text="确定",
                x=100,
                y=200,
                width=80,
                height=30,
                confidence=0.95
            ),
            VisualElement(
                id="input_1",
                element_type="input",
                text="",
                x=100,
                y=250,
                width=200,
                height=25,
                confidence=0.92
            )
        ]
        
        # Store in vector DB for learning
        self._store_screenshot_features(screenshot_path, elements)
        
        return elements
    
    def _store_screenshot_features(self, screenshot_path: str, elements: List[VisualElement]):
        """存储截图特征到向量数据库"""
        # Extract features (simplified)
        for element in elements:
            feature_vector = np.array([
                element.x / 1920.0,  # Normalized x
                element.y / 1080.0,  # Normalized y
                element.width / 1920.0,
                element.height / 1080.0,
                element.confidence,
                hash(element.element_type) % 100 / 100.0  # Type encoding
            ])
            
            self.vector_db.add(
                f"{screenshot_path}_{element.id}",
                feature_vector,
                {
                    "element_type": element.element_type,
                    "text": element.text,
                    "coordinates": (element.x, element.y, element.width, element.height),
                    "timestamp": datetime.now().isoformat()
                }
            )
    
    def predict_action(self, elements: List[VisualElement], instruction: str) -> OUVPrediction:
        """
        预测要执行的操作
        
        基于 2603141948.md:
        "赋予它判断操作可能带来的事件触发、风险或者效果和影响"
        """
        # Find best matching element
        best_element = None
        best_score = 0
        
        for element in elements:
            score = self._calculate_match_score(element, instruction)
            if score > best_score:
                best_score = score
                best_element = element
        
        if best_element:
            # Predict action type
            action = self._predict_action_type(instruction)
            
            # Calculate precise coordinates (center of element)
            target_x = best_element.x + best_element.width // 2
            target_y = best_element.y + best_element.height // 2
            
            # Assess risk
            risk = self._assess_risk(best_element, action)
            
            return OUVPrediction(
                element=best_element,
                action=action,
                coordinates=(target_x, target_y),
                confidence=best_score * best_element.confidence,
                reasoning=f"匹配元素 '{best_element.text}'，执行 {action} 操作，风险等级: {risk}"
            )
        
        return None
    
    def _calculate_match_score(self, element: VisualElement, instruction: str) -> float:
        """计算元素与指令的匹配分数"""
        score = 0.0
        
        # Text matching
        if element.text and element.text in instruction:
            score += 0.5
        
        # Type matching
        if element.element_type == "button" and ("点击" in instruction or "按" in instruction):
            score += 0.3
        elif element.element_type == "input" and ("输入" in instruction or "填写" in instruction):
            score += 0.3
        
        # Confidence boost
        score += element.confidence * 0.2
        
        return min(score, 1.0)
    
    def _predict_action_type(self, instruction: str) -> str:
        """预测操作类型"""
        if "点击" in instruction or "按" in instruction:
            return "click"
        elif "输入" in instruction or "填写" in instruction:
            return "type"
        elif "拖拽" in instruction or "拖动" in instruction:
            return "drag"
        elif "滚动" in instruction or "滑动" in instruction:
            return "scroll"
        else:
            return "click"  # Default
    
    def _assess_risk(self, element: VisualElement, action: str) -> str:
        """评估操作风险
        
        基于 2603141948.md:
        "赋予它判断操作可能带来的事件触发、风险或者效果和影响"
        """
        # High risk elements - 系统破坏性操作
        high_risk_keywords = ["删除", "移除", "清空", "格式化", "卸载", "rm -rf", "del /f /s /q"]
        
        # Medium risk - 数据变更操作
        medium_risk_keywords = ["保存", "提交", "发送", "确认", "安装", "修改"]
        
        # Check element text
        element_text = element.text.lower() if element.text else ""
        
        for kw in high_risk_keywords:
            if kw in element_text or kw in action.lower():
                return "high"
        
        for kw in medium_risk_keywords:
            if kw in element_text or kw in action.lower():
                return "medium"
        
        # Check element type
        if element.element_type in ["delete_button", "danger_button"]:
            return "high"
        
        return "low"
    
    def reflect(self, prediction: OUVPrediction, actual_result: Dict) -> Dict:
        """
        反思操作结果并执行修复
        
        基于 2603141948.md:
        "训练OxygenUltraVision并教会它反思和重来与试错的能力"
        "当犯错时让OpenOxygen知道自己在做什么，以及如何修复它"
        """
        success = actual_result.get("success", False)
        
        reflection = {
            "timestamp": datetime.now().isoformat(),
            "prediction": {
                "element_id": prediction.element.id,
                "action": prediction.action,
                "confidence": prediction.confidence
            },
            "actual_result": actual_result,
            "success": success,
            "analysis": "",
            "correction_executed": False,
            "retry_result": None
        }
        
        if success:
            self.success_count += 1
            reflection["analysis"] = "操作成功，预测准确"
            self._update_training_data(prediction, True)
        else:
            self.failure_count += 1
            error = actual_result.get("error", "Unknown error")
            reflection["analysis"] = f"操作失败: {error}"
            
            # Analyze failure and suggest correction
            correction = self._suggest_correction(prediction, error)
            reflection["suggested_correction"] = correction
            
            # Execute correction if possible
            if correction.get("can_retry"):
                retry_result = self._execute_correction(prediction, correction)
                reflection["correction_executed"] = True
                reflection["retry_result"] = retry_result
                
                if retry_result.get("success"):
                    reflection["analysis"] += " | 修复成功"
                    self.success_count += 1
                else:
                    reflection["analysis"] += f" | 修复失败: {retry_result.get('error')}"
            
            # Update vector DB with feedback
            self._update_training_data(prediction, False)
        
        self.reflection_history.append(reflection)
        
        return reflection
    
    def _execute_correction(self, prediction: OUVPrediction, correction: Dict) -> Dict:
        """执行修复策略"""
        # This would integrate with native modules to execute correction
        # For now, return placeholder
        return {
            "success": False,
            "error": "Correction execution not yet implemented - requires native module integration"
        }
    
    def _update_training_data(self, prediction: OUVPrediction, success: bool):
        """更新训练数据"""
        self.training_data.append({
            "element_id": prediction.element.id,
            "action": prediction.action,
            "coordinates": prediction.coordinates,
            "success": success,
            "timestamp": datetime.now().isoformat()
        })
    
    def _suggest_correction(self, prediction: OUVPrediction, error: str) -> Dict:
        """建议修正方案"""
        correction = {
            "should_retry": True,
            "adjustments": []
        }
        
        if "timeout" in error.lower():
            correction["adjustments"].append("increase_timeout")
        elif "not found" in error.lower():
            correction["adjustments"].append("expand_search_area")
            correction["should_retry"] = False
        elif "permission" in error.lower():
            correction["adjustments"].append("elevate_privilege")
        
        return correction
    
    def get_statistics(self) -> Dict:
        """获取训练和反思统计"""
        total = self.success_count + self.failure_count
        success_rate = self.success_count / total if total > 0 else 0
        
        return {
            "total_operations": total,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": success_rate,
            "correction_count": self.correction_count,
            "reflection_count": len(self.reflection_history),
            "vector_db_size": len(self.vector_db.vectors)
        }

# Export
__all__ = ['OxygenUltraVision', 'OUVVectorDB', 'VisualElement', 'OUVPrediction']
