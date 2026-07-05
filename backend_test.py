import os
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
            self.test_lead_id = result.get('id')  # Store for admin tests
        
        # Test get leads
        self.run_test("Get Leads", "GET", "leads", 200)
        
        return success

    def run_admin_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run admin API test with authentication"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        auth = ('admin', os.environ.get('ADMIN_PASSWORD', ''))

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, auth=auth, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, auth=auth)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, auth=auth)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, auth=auth)

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

    def test_admin_authentication(self):
        """Test admin authentication and unauthorized access"""
        # Test with correct credentials
        success, result = self.run_admin_test("Admin Login (Valid)", "GET", "admin/leads", 200)
        
        # Test with wrong credentials
        url = f"{self.base_url}/admin/leads"
        headers = {'Content-Type': 'application/json'}
        auth = ('admin', 'wrongpassword')
        
        self.tests_run += 1
        print(f"\n🔍 Testing Admin Login (Invalid Credentials)...")
        try:
            response = requests.get(url, headers=headers, auth=auth)
            if response.status_code == 401:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code} (Unauthorized as expected)")
            else:
                print(f"❌ Failed - Expected 401, got {response.status_code}")
                self.failed_tests.append({
                    'test': 'Admin Login (Invalid Credentials)',
                    'expected': 401,
                    'actual': response.status_code,
                    'endpoint': 'admin/leads'
                })
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'test': 'Admin Login (Invalid Credentials)',
                'expected': 401,
                'actual': f'Exception: {str(e)}',
                'endpoint': 'admin/leads'
            })
        
        return success

    def test_admin_lead_management(self):
        """Test admin lead management operations"""
        # Get admin leads with stats
        success, result = self.run_admin_test("Get Admin Leads with Stats", "GET", "admin/leads", 200)
        if success and result:
            leads = result.get('leads', [])
            stats = result.get('stats', {})
            print(f"   Found {len(leads)} leads")
            print(f"   Stats: Total: {stats.get('total', 0)}, New: {stats.get('new', 0)}, Contacted: {stats.get('contacted', 0)}")
            
            # If we have leads, test update and delete operations
            if leads and hasattr(self, 'test_lead_id'):
                # Test update lead status
                update_data = {"status": "contacted"}
                self.run_admin_test("Update Lead Status", "PATCH", f"admin/leads/{self.test_lead_id}", 200, data=update_data)
                
                # Test delete lead (use the test lead we created)
                self.run_admin_test("Delete Lead", "DELETE", f"admin/leads/{self.test_lead_id}", 200)
        
        return success

    def test_schema_markup_apis(self):
        """Test schema markup APIs for SEO"""
        # Test organization schema
        success1, org_schema = self.run_test("Organization Schema API", "GET", "schema/organization", 200)
        if success1 and org_schema:
            required_fields = ["@context", "@type", "name", "description", "url"]
            missing_fields = [field for field in required_fields if field not in org_schema]
            if not missing_fields:
                print(f"   ✅ Organization schema has all required fields")
            else:
                print(f"   ⚠️ Missing fields: {missing_fields}")

        # Test local business schema
        success2, business_schema = self.run_test("Local Business Schema API", "GET", "schema/local-business", 200)
        if success2 and business_schema:
            required_fields = ["@context", "@type", "name", "address", "telephone"]
            missing_fields = [field for field in required_fields if field not in business_schema]
            if not missing_fields:
                print(f"   ✅ Local Business schema has all required fields")
            else:
                print(f"   ⚠️ Missing fields: {missing_fields}")

        return success1 and success2

    def test_sitemap_xml(self):
        """Test XML sitemap generation"""
        url = f"{self.base_url}/sitemap.xml"
        
        self.tests_run += 1
        print(f"\n🔍 Testing XML Sitemap...")
        print(f"   URL: {url}")
        
        try:
            response = requests.get(url)
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Check if it's valid XML content
                content = response.text
                if '<?xml version="1.0"' in content and '<urlset' in content:
                    print(f"   ✅ Valid XML sitemap format detected")
                    # Count URLs
                    url_count = content.count('<url>')
                    print(f"   Found {url_count} URLs in sitemap")
                else:
                    print(f"   ⚠️ Response may not be valid XML sitemap format")
                
                # Check Content-Type
                content_type = response.headers.get('content-type', '')
                if 'xml' in content_type:
                    print(f"   ✅ Correct Content-Type: {content_type}")
                else:
                    print(f"   ⚠️ Unexpected Content-Type: {content_type}")
                    
            else:
                self.failed_tests.append({
                    'test': 'XML Sitemap',
                    'expected': 200,
                    'actual': response.status_code,
                    'endpoint': 'sitemap.xml'
                })
                print(f"❌ Failed - Expected 200, got {response.status_code}")

            return success

        except Exception as e:
            self.failed_tests.append({
                'test': 'XML Sitemap',
                'expected': 200,
                'actual': f'Exception: {str(e)}',
                'endpoint': 'sitemap.xml'
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False

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
        ("Admin Authentication", tester.test_admin_authentication),
        ("Admin Lead Management", tester.test_admin_lead_management),
        ("Schema Markup APIs", tester.test_schema_markup_apis),
        ("XML Sitemap", tester.test_sitemap_xml),
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