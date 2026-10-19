"""
Single entry point for every ERP router, so server.py (and tests) include the
whole ERP with one import and module load order can never get out of sync.
"""
from erp_routes import router as core_router
from erp_labour import router as labour_router
from erp_inventory import router as inventory_router
from erp_finance import router as finance_router
from erp_dashboard import router as dashboard_router

# Order matters only for path clashes; each module owns a distinct URL space.
routers = [core_router, labour_router, inventory_router, finance_router, dashboard_router]
