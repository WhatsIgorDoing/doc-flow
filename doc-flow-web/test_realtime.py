import requests
import json
from datetime import datetime

# Configuration
API_URL = "http://localhost:3000/api/validation/submit"
API_KEY = "0729344937d3f075b2e8c616bf6a2eaea74749c21227a3248e444ef8949ad149"
CONTRACT_ID = "00000000-0000-0000-0000-000000000002"

def test_validation_submit():
    """Test submitting validation results to Next.js API"""
    
    # Sample validation results
    payload = {
        "contract_id": CONTRACT_ID,
        "batch_name": f"Test Batch {datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "results": [
            {
                "contract_id": CONTRACT_ID,
                "document_path": "/test/documents/contrato_social.pdf",
                "file_name": "contrato_social.pdf",
                "status": "valid",
                "validation_errors": [],
                "validated_at": datetime.utcnow().isoformat() + "Z",
                "metadata": {
                    "file_size": 2048000,
                    "pages": 10,
                    "validator_version": "2.0.0",
                    "test": True
                }
            },
            {
                "contract_id": CONTRACT_ID,
                "document_path": "/test/documents/procuracao.pdf",
                "file_name": "procuracao.pdf",
                "status": "invalid",
                "validation_errors": ["Assinatura ausente", "Data inválida"],
                "validated_at": datetime.utcnow().isoformat() + "Z",
                "metadata": {
                    "file_size": 512000,
                    "pages": 2,
                    "validator_version": "2.0.0",
                    "test": True
                }
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }
    
    print("🚀 Submitting validation results...")
    print(f"URL: {API_URL}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            API_URL,
            json=payload,
            headers=headers,
            timeout=30
        )
        
        print(f"\n📊 Response Status: {response.status_code}")
        print(f"Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 201:
            print("\n✅ SUCCESS! Validation results submitted.")
            print("👀 Check your frontend for realtime updates!")
        else:
            print(f"\n❌ FAILED: {response.text}")
        
        return response
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ ERROR: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        raise

if __name__ == "__main__":
    print("="*60)
    print("🧪 Testing Python → Next.js → Supabase → Realtime")
    print("="*60)
    
    test_validation_submit()
    
    print("\n" + "="*60)
    print("📝 Next steps:")
    print("1. Keep terminal open")
    print("2. Open http://localhost:3000/contracts/00000000-0000-0000-0000-000000000002/documents")
    print("3. Watch for toast notifications")
    print("4. See documents appear in real-time")
    print("="*60)
