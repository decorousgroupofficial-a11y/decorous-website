import requests
import sys
from datetime import datetime

class DecorousAPITester:
    def __init__(self, base_url="https://construct-pro-139.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    json_data = response.json()
                    if isinstance(json_data, list):
                        print(f"   Response: List with {len(json_data)} items")
                    elif isinstance(json_data, dict):
                        print(f"   Response keys: {list(json_data.keys())}")
                except:
                    print(f"   Response: Non-JSON content")
            else:
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Error response: {response.text}")
                except:
                    print("   Could not decode error response")

            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.failed_tests.append({
                'test': name,
                'expected': expected_status,
                'actual': f'Exception: {str(e)}',
                'endpoint': endpoint
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_services(self):
        """Test services endpoints"""
        success, services = self.run_test("Get Services", "GET", "services", 200)
        if success and services:
            print(f"   Found {len(services)} services")
            # Test individual service
            if services:
                first_service = services[0]
                if 'slug' in first_service:
                    self.run_test(f"Get Service by slug", "GET", f"services/{first_service['slug']}", 200)
        return success

    def test_projects(self):
        """Test projects endpoints"""
        success, projects = self.run_test("Get All Projects", "GET", "projects", 200)
        if success and projects:
            print(f"   Found {len(projects)} projects")
            
            # Test featured projects
            self.run_test("Get Featured Projects", "GET", "projects", 200, params={'featured': True})
            
            # Test by category if projects exist
            if projects:
                categories = list(set([p.get('category') for p in projects if p.get('category')]))
                if categories:
                    self.run_test(f"Get Projects by Category", "GET", "projects", 200, 
                                params={'category': categories[0]})
                
                # Test individual project
                first_project = projects[0]
                if 'id' in first_project:
                    self.run_test(f"Get Project by ID", "GET", f"projects/{first_project['id']}", 200)
        return success

    def test_blog(self):
        """Test blog endpoints"""
        success, posts = self.run_test("Get Blog Posts", "GET", "blog", 200)
        if success and posts:
            print(f"   Found {len(posts)} blog posts")
            
            # Test with pagination
            self.run_test("Get Blog Posts with Limit", "GET", "blog", 200, params={'limit': 5, 'skip': 0})
            
            # Test individual post
            if posts:
                first_post = posts[0]
                if 'slug' in first_post:
                    self.run_test(f"Get Blog Post by slug", "GET", f"blog/{first_post['slug']}", 200)
        return success

    def test_cities(self):
        """Test cities endpoints"""
        success, cities = self.run_test("Get Cities", "GET", "cities", 200)
        if success and cities:
            print(f"   Found {len(cities)} cities")
            
            # Test individual city
            if cities:
                first_city = cities[0]
                if 'slug' in first_city:
                    self.run_test(f"Get City by slug", "GET", f"cities/{first_city['slug']}", 200)
        return success

    def test_testimonials(self):
        """Test testimonials endpoint"""
        success, testimonials = self.run_test("Get Testimonials", "GET", "testimonials", 200)
        if success and testimonials:
            print(f"   Found {len(testimonials)} testimonials")
        return success

    def test_stats(self):
        """Test stats endpoint"""
        return self.run_test("Get Stats", "GET", "stats", 200)

    def test_cost_calculator(self):
        """Test cost calculator"""
        test_data = {
            "plot_size": 1500,
            "floors": 2,
            "quality": "standard",
            "city": "bhubaneswar"
        }
        success, result = self.run_test("Cost Calculator", "POST", "calculate-cost", 200, data=test_data)
        if success and result:
            print(f"   Estimated cost: ₹{result.get('estimated_cost', 0):,}")
            print(f"   Cost per sqft: ₹{result.get('cost_per_sqft', 0)}")
        return success

    def test_lead_creation(self):
        """Test lead creation"""
        test_lead = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "phone": "9876543210",
            "email": "test@example.com",
            "city": "Bhubaneswar",
            "plot_size": "1500",
            "construction_type": "Residential Construction",
            "message": "Test lead from API testing",
            "source": "api_test"
        }
        success, result = self.run_test("Create Lead", "POST", "leads", 200, data=test_lead)
        if success and result:
            print(f"   Created lead with ID: {result.get('id')}")
        
        # Test get leads
        self.run_test("Get Leads", "GET", "leads", 200)
        
        return success

def main():
    print("🏗️  Starting Decorous Construction API Tests")
    print("=" * 60)
    
    # Setup
    tester = DecorousAPITester()
    
    # Test categories
    test_categories = [
        ("Root API", tester.test_root_endpoint),
        ("Services", tester.test_services),
        ("Projects", tester.test_projects),
        ("Blog", tester.test_blog),
        ("Cities", tester.test_cities),
        ("Testimonials", tester.test_testimonials),
        ("Stats", tester.test_stats),
        ("Cost Calculator", tester.test_cost_calculator),
        ("Lead Management", tester.test_lead_creation),
    ]
    
    # Run all tests
    for category_name, test_func in test_categories:
        print(f"\n🏷️  Testing {category_name}")
        print("-" * 40)
        try:
            test_func()
        except Exception as e:
            print(f"❌ Category {category_name} failed with exception: {str(e)}")
            tester.failed_tests.append({
                'test': f'{category_name} (Exception)',
                'expected': 'Success',
                'actual': f'Exception: {str(e)}',
                'endpoint': category_name
            })
    
    # Print summary
    print(f"\n📊 API Test Summary")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {len(tester.failed_tests)}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests:")
        for failed in tester.failed_tests:
            print(f"   • {failed['test']}: Expected {failed['expected']}, got {failed['actual']}")
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())