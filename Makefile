.PHONY: dev test data setup

setup:
	pip install -r backend/requirements.txt

dev: setup
	uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload

test: setup
	python -m pytest backend/tests/ -v

test-unit:
	python -m pytest backend/tests/test_tools_unit.py -v

test-smoke:
	python -m pytest backend/tests/test_agent_smoke.py -v

data:
	python backend/scripts/prep_permits.py
	python backend/scripts/prep_pluto.py
	python backend/scripts/prep_sales.py
	python backend/scripts/prep_subway.py

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
