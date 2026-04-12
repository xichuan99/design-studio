
import sys
import os

# Add app to path
sys.path.append(os.path.join(os.getcwd(), 'app'))

from app.services.llm_design_service import extract_json_from_text

def test_extraction():
    test_cases = [
        {
            "input": "Baik, berikut JSON-nya: {\"key\": \"value\"} Semoga membantu!",
            "expected": "{\"key\": \"value\"}"
        },
        {
            "input": "```json\n[{\"id\": 1}]\n```",
            "expected": "[{\"id\": 1}]"
        },
        {
            "input": "Plain text without json fallback",
            "expected": "Plain text without json fallback"
        },
        {
            "input": "Multiple blocks: {\"a\": 1} and {\"b\": 2}",
            "expected": "{\"a\": 1} and {\"b\": 2}" # Our regex finds FIRST { and LAST }
        }
    ]

    for i, case in enumerate(test_cases):
        result = extract_json_from_text(case['input'])
        print(f"Test {i+1}:")
        print(f"  Input: {case['input']}")
        print(f"  Result: {result}")
        print(f"  Passed: {result == case['expected']}")
        print("-" * 20)

if __name__ == "__main__":
    test_extraction()
