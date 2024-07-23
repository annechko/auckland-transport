c = npm -h
n:
	docker-compose run  --rm atn $(c)

install:
	docker-compose run  --rm atn npm install
