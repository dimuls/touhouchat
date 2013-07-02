SITES_PATH = /sites
APP_NAME = touhouchat.tomago.ru
PROJECT_ROOT = /$(SITES_PATH)/$(APP_NAME)
NGINX_ROOT = /etc/nginx/
APP_SCRIPT = script/touhou_chat

deploy:
	make stop
	service nginx restart
	make deploy_app
	make start


stop:
	su -l www-data -c 'cd $(PROJECT_ROOT); hypnotoad -s $(APP_SCRIPT)'

make_paths:
	mkdir -p $(SITES_PATH)/.config/sites-available/
	mkdir -p $(PROJECT_ROOT)
	mkdir -p /sites/logs/$(APP_NAME)

deploy_app:
	echo "su -l www-data -c 'cd $(PROJECT_ROOT); hypnotoad $(APP_SCRIPT)'" > $(SITES_PATH)/.config/sites-available/$(APP_NAME)
	rm -rf $(PROJECT_ROOT)
	cp -R ./app $(PROJECT_ROOT)
	cp ./nginx.conf $(NGINX_ROOT)/sites-enabled/$(APP_NAME)
	chown -R www-data:www-data $(PROJECT_ROOT)
	chmod -R 777 $(PROJECT_ROOT)/public

start:
	su -l www-data -c 'cd $(PROJECT_ROOT); hypnotoad $(APP_SCRIPT)'

enable:
	ln -s $(SITES_PATH)/.config/sites-available/$(APP_NAME) $(SITES_PATH)/.config/sites-enabled/$(APP_NAME)

disable:
	rm $(SITES_PATH)/.config/sites-enabled/$(APP_NAME)
