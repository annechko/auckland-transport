c = npm -h
n:
	docker-compose run  --rm atn $(c)

up:
	docker-compose run  -p"3000:3000" --rm atn npm run start-local

install:
	docker-compose run  --rm atn npm install

ci-build:
	docker-compose run  --rm atn npm install
	docker-compose run  --rm atn npm run build
