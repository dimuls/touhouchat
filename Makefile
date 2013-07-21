SITES_PATH = /sites
APP_NAME = anonchat.pw
PROJECT_PATH = $(SITES_PATH)/$(APP_NAME)
LOG_PATH = $(SITES_PATH)/logs/$(APP_NAME)
NGINX_ROOT = /etc/nginx
APP_SCRIPT = app.js
APP_USER = node

paths:
	mkdir -p $(SITES_PATH)/.config/sites-available/
	mkdir -p $(SITES_PATH)/.config/sites-enabled/
	mkdir -p $(PROJECT_PATH)
	mkdir -p $(SITES_PATH)/logs/$(APP_NAME)

stop:
	su -l $(APP_USER) -c 'NODE_ENV=production forever stop --sourceDir $(PROJECT_PATH) app.js'

start:
	su -l $(APP_USER) -c 'NODE_ENV=production forever start --sourceDir $(PROJECT_PATH) -l $(LOG_PATH)/forever.log -o $(LOG_PATH)/app.log -e $(LOG_PATH)/app-error.log -a app.js'

restart:
	make stop
	make start

deploy_nginx:
	cp ./nginx.conf $(NGINX_ROOT)/sites-enabled/$(APP_NAME)
	service nginx restart

deploy_app_static:
	rm -rf $(PROJECT_PATH)
	cp -R ./app $(PROJECT_PATH)
	chown -R node:www-data $(PROJECT_PATH)
	chmod -R 777 $(PROJECT_PATH)/public

deploy_app:
	-make stop
	make deploy_app_static
	make start

deploy:
	make deploy_app
	make deploy_nginx

enable:
	ln -s $(SITES_PATH)/.config/sites-available/$(APP_NAME) $(SITES_PATH)/.config/sites-enabled/$(APP_NAME)

disable:
	rm $(SITES_PATH)/.config/sites-enabled/$(APP_NAME)
