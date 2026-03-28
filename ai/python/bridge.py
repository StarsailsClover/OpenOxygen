#!/usr/bin/env python3
"""
Python Bridge - Node.js Integration
Python side of the bridge
"""

import sys
import json
import traceback

# Add ai module to path
sys.path.insert(0, '/mnt/user-data/uploaded_files/D:\Coding\OpenOxygen\ai\python')

from ouv import OxygenUltraVision
from reflection import ReflectionEngine

# Initialize modules
ouv = OxygenUltraVision()
reflection = ReflectionEngine()

def handle_request(request):
    """Handle request from Node.js"""
    try:
        module = request.get('module')
        function = request.get('function')
        args = request.get('args', {})
        
        result = None
        
        if module == 'ouv':
            if function == 'analyze_screen':
                result = ouv.analyze_screen(
                    args.get('screenshotPath'),
                    args.get('instruction')
                )
                # Convert dataclass to dict
                result = [{
                    'id': e.id,
                    'element_type': e.element_type,
                    'text': e.text,
                    'x': e.x,
                    'y': e.y,
                    'width': e.width,
                    'height': e.height,
                    'confidence': e.confidence
                } for e in result]
                
            elif function == 'predict_action':
                pred = ouv.predict_action(
                    args.get('elements'),
                    args.get('instruction')
                )
                if pred:
                    result = {
                        'element': {
                            'id': pred.element.id,
                            'element_type': pred.element.element_type,
                            'text': pred.element.text,
                            'x': pred.element.x,
                            'y': pred.element.y,
                            'width': pred.element.width,
                            'height': pred.element.height,
                            'confidence': pred.element.confidence
                        },
                        'action': pred.action,
                        'coordinates': pred.coordinates,
                        'confidence': pred.confidence,
                        'reasoning': pred.reasoning
                    }
                else:
                    result = None
                    
            elif function == 'reflect':
                result = ouv.reflect(
                    args.get('prediction'),
                    args.get('actual_result')
                )
                
        elif module == 'reflection':
            if function == 'make_decision':
                from reflection import DecisionType
                
                decision_type = DecisionType(args.get('decisionType'))
                context = args.get('context')
                options = args.get('options')
                
                # Mock action function
                def mock_action(option):
                    return {'success': True, 'option': option}
                
                decision = reflection.make_decision(
                    decision_type,
                    context,
                    options,
                    mock_action
                )
                
                result = {
                    'id': decision.id,
                    'timestamp': decision.timestamp,
                    'decision_type': decision.decision_type.value,
                    'context': decision.context,
                    'decision': decision.decision,
                    'reasoning': decision.reasoning,
                    'confidence': decision.confidence,
                    'success': decision.success
                }
                
            elif function == 'get_statistics':
                result = reflection.get_learning_statistics()
        
        return {
            'id': request.get('id'),
            'result': result
        }
        
    except Exception as e:
        return {
            'id': request.get('id'),
            'error': str(e),
            'traceback': traceback.format_exc()
        }

def main():
    """Main loop"""
    print("Python bridge started", file=sys.stderr)
    
    while True:
        try:
            # Read line from stdin
            line = sys.stdin.readline()
            if not line:
                break
                
            # Parse request
            request = json.loads(line.strip())
            
            # Handle request
            response = handle_request(request)
            
            # Write response
            print(json.dumps(response), flush=True)
            
        except json.JSONDecodeError as e:
            print(json.dumps({'error': f'Invalid JSON: {str(e)}'}), flush=True)
        except Exception as e:
            print(json.dumps({'error': str(e)}), flush=True)

if __name__ == '__main__':
    main()
