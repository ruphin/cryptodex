dev:
	docker run -it --rm -v $$PWD:/app -p 5000:5000 ruphin/webdev gulp serve
.PHONY: dev

shell:
	docker run -it --rm -v $$PWD:/app -p 5000:5000 ruphin/webdev bash
.PHONY: shell

production:
	docker run -it --rm -v $$PWD:/app ruphin/webdev gulp
	docker build -t ruphin/cryptodex .
