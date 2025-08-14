.PHONY: dev test data

dev:
	pip install -r backend/requirements.txt
	uvicorn backend.app:app --host 0.0.0.0 --port ${PORT} --reload

test:
	# Add test command here
	echo "No tests configured yet"

data:
	# Add data prep scripts here
	echo "No data prep scripts configured yet"
