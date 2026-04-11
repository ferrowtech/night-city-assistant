import requests
import sys
import base64
import json
from datetime import datetime
from pathlib import Path

class NightCityAPITester:
    def __init__(self, base_url="https://nc-companion.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"\n🔍 {name}: {status}")
        if details:
            print(f"   Details: {details}")

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_message = "Night City Assistant API"
                if data.get("message") == expected_message:
                    self.log_test("Root API Endpoint", True, f"Status: {response.status_code}, Message: {data.get('message')}")
                else:
                    self.log_test("Root API Endpoint", False, f"Unexpected message: {data.get('message')}")
            else:
                self.log_test("Root API Endpoint", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Error: {str(e)}")

    def create_test_image_base64(self):
        """Create a simple test image in base64 format"""
        try:
            from PIL import Image
            import io
            
            # Create a 100x100 test image with actual visual content
            img = Image.new('RGB', (100, 100), color='red')
            # Add some visual features - a blue square in the center
            for x in range(30, 70):
                for y in range(30, 70):
                    img.putpixel((x, y), (0, 0, 255))
            
            # Save to bytes
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=95)
            img_bytes = buffer.getvalue()
            
            # Convert to base64
            return base64.b64encode(img_bytes).decode('utf-8')
            
        except ImportError:
            # Fallback: read the pre-created test image
            try:
                with open('/tmp/test_image_b64.txt', 'r') as f:
                    return f.read().strip()
            except:
                # Last resort: create a minimal valid JPEG header
                # This is a very small valid JPEG with actual image data
                jpeg_data = base64.b64decode('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==')
                return base64.b64encode(jpeg_data).decode('utf-8')

    def test_analyze_endpoint_invalid_data(self):
        """Test analyze endpoint with invalid data"""
        try:
            # Test with missing image_base64
            response = requests.post(
                f"{self.api_url}/analyze",
                json={"mime_type": "image/jpeg"},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            # Should return 422 for validation error
            if response.status_code == 422:
                self.log_test("Analyze Endpoint - Invalid Data", True, f"Correctly rejected invalid data with status {response.status_code}")
            else:
                self.log_test("Analyze Endpoint - Invalid Data", False, f"Expected 422, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Analyze Endpoint - Invalid Data", False, f"Error: {str(e)}")

    def test_analyze_endpoint_valid_image(self):
        """Test analyze endpoint with valid image data (default Russian)"""
        try:
            test_image_b64 = self.create_test_image_base64()
            
            payload = {
                "image_base64": test_image_b64,
                "mime_type": "image/jpeg"
            }
            
            response = requests.post(
                f"{self.api_url}/analyze",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60  # Longer timeout for AI processing
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "hint", "timestamp"]
                
                if all(field in data for field in required_fields):
                    hint_length = len(data.get("hint", ""))
                    self.log_test("Analyze Endpoint - Valid Image (Default RU)", True, 
                                f"Status: {response.status_code}, Hint length: {hint_length} chars")
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Analyze Endpoint - Valid Image (Default RU)", False, 
                                f"Missing fields: {missing_fields}")
            else:
                try:
                    error_data = response.json()
                    self.log_test("Analyze Endpoint - Valid Image (Default RU)", False, 
                                f"Status: {response.status_code}, Error: {error_data}")
                except:
                    self.log_test("Analyze Endpoint - Valid Image (Default RU)", False, 
                                f"Status: {response.status_code}, Response: {response.text[:200]}")
                
        except Exception as e:
            self.log_test("Analyze Endpoint - Valid Image (Default RU)", False, f"Error: {str(e)}")

    def test_analyze_endpoint_russian_language(self):
        """Test analyze endpoint with explicit Russian language parameter"""
        try:
            test_image_b64 = self.create_test_image_base64()
            
            payload = {
                "image_base64": test_image_b64,
                "mime_type": "image/jpeg",
                "language": "ru"
            }
            
            response = requests.post(
                f"{self.api_url}/analyze",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "hint", "timestamp"]
                
                if all(field in data for field in required_fields):
                    hint = data.get("hint", "")
                    hint_length = len(hint)
                    self.log_test("Analyze Endpoint - Russian Language", True, 
                                f"Status: {response.status_code}, Hint length: {hint_length} chars, Language: RU")
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Analyze Endpoint - Russian Language", False, 
                                f"Missing fields: {missing_fields}")
            else:
                try:
                    error_data = response.json()
                    self.log_test("Analyze Endpoint - Russian Language", False, 
                                f"Status: {response.status_code}, Error: {error_data}")
                except:
                    self.log_test("Analyze Endpoint - Russian Language", False, 
                                f"Status: {response.status_code}, Response: {response.text[:200]}")
                
        except Exception as e:
            self.log_test("Analyze Endpoint - Russian Language", False, f"Error: {str(e)}")

    def test_analyze_endpoint_english_language(self):
        """Test analyze endpoint with English language parameter"""
        try:
            test_image_b64 = self.create_test_image_base64()
            
            payload = {
                "image_base64": test_image_b64,
                "mime_type": "image/jpeg",
                "language": "en"
            }
            
            response = requests.post(
                f"{self.api_url}/analyze",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "hint", "timestamp"]
                
                if all(field in data for field in required_fields):
                    hint = data.get("hint", "")
                    hint_length = len(hint)
                    self.log_test("Analyze Endpoint - English Language", True, 
                                f"Status: {response.status_code}, Hint length: {hint_length} chars, Language: EN")
                else:
                    missing_fields = [f for f in required_fields if f not in data]
                    self.log_test("Analyze Endpoint - English Language", False, 
                                f"Missing fields: {missing_fields}")
            else:
                try:
                    error_data = response.json()
                    self.log_test("Analyze Endpoint - English Language", False, 
                                f"Status: {response.status_code}, Error: {error_data}")
                except:
                    self.log_test("Analyze Endpoint - English Language", False, 
                                f"Status: {response.status_code}, Response: {response.text[:200]}")
                
        except Exception as e:
            self.log_test("Analyze Endpoint - English Language", False, f"Error: {str(e)}")

    def test_history_endpoint(self):
        """Test the history endpoint"""
        try:
            response = requests.get(f"{self.api_url}/history", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("History Endpoint", True, f"Status: {response.status_code}, Items: {len(data)}")
                else:
                    self.log_test("History Endpoint", False, f"Expected list, got {type(data)}")
            else:
                self.log_test("History Endpoint", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("History Endpoint", False, f"Error: {str(e)}")

    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = requests.options(f"{self.api_url}/", timeout=10)
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            if cors_headers['Access-Control-Allow-Origin']:
                self.log_test("CORS Headers", True, f"CORS configured: {cors_headers}")
            else:
                self.log_test("CORS Headers", False, "No CORS headers found")
                
        except Exception as e:
            self.log_test("CORS Headers", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Night City Assistant Backend Tests")
        print(f"🎯 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Run tests in order
        self.test_root_endpoint()
        self.test_analyze_endpoint_invalid_data()
        self.test_analyze_endpoint_valid_image()
        self.test_analyze_endpoint_russian_language()
        self.test_analyze_endpoint_english_language()
        self.test_history_endpoint()
        self.test_cors_headers()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 BACKEND TEST SUMMARY")
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}/{self.tests_run}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = NightCityAPITester()
    success = tester.run_all_tests()
    
    # Save test results
    results_file = "/app/backend_test_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": tester.tests_run - tester.tests_passed,
                "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
            },
            "test_results": tester.test_results,
            "timestamp": datetime.now().isoformat()
        }, f, indent=2)
    
    print(f"\n💾 Test results saved to: {results_file}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())