import httpx

r = httpx.post('http://127.0.0.1:5001/api/auth/login', json={'email': 'admin@lge.com', 'password': 'admin123'})
token = r.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}
r2 = httpx.get('http://127.0.0.1:5001/api/kpis/dashboard', headers=headers)
print('Dashboard status:', r2.status_code)
data = r2.json()
lc = data.get('logistic_cost', [])
print(f'logistic_cost records ({len(lc)}):')
for item in lc:
    print(f"  {item['year']} {item['month']}: target={item['target']}, result={item['result']}, achievement={item['achievement']}")
