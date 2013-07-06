SITES_PATH = /sites
APP_NAME = touhouchat.tomago.ru
PROJECT_ROOT = $(SITES_PATH)/$(APP_NAME)
NGINX_ROOT = /etc/nginx/
APP_SCRIPT = app.js
APP_USER = node

make_paths:
	mkdir -p $(SITES_PATH)/.config/sites-available/
	mkdir -p $(PROJECT_ROOT)
	mkdir -p $(SITES_PATH)/logs/$(APP_NAME)

stop:
	su -l $(APP_USER) -c 'forever stop --sourceDir $(PROJECT_ROOT) app.js'

start:
	su -l $(APP_USER) -c 'forever start --sourceDir $(PROJECT_ROOT) app.js'

deploy_nginx:
	cp ./nginx.conf $(NGINX_ROOT)/sites-enabled/$(APP_NAME)
	service nginx restart

deploy_app:
	make stop
	echo "su -l www-data -c 'su -l $(APP_USER) -c 'forever start --sourceDir $(PROJECT_ROOT) app.js''" > $(SITES_PATH)/.config/sites-available/$(APP_NAME)
	rm -rf $(PROJECT_ROOT)
	cp -R ./app $(PROJECT_ROOT)
	chown -R node:www-data $(PROJECT_ROOT)
	chmod -R 777 $(PROJECT_ROOT)/public
	make start

deploy:
	make stop
	make deploy_app
	make deploy_nginx
	make start

enable:
	ln -s $(SITES_PATH)/.config/sites-available/$(APP_NAME) $(SITES_PATH)/.config/sites-enabled/$(APP_NAME)

disable:
	rm $(SITES_PATH)/.config/sites-enabled/$(APP_NAME)
