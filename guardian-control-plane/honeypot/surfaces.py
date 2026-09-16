"""
Multi-Personality Attack Surface Emulation
Emulates the top 5 most scanned web attack vectors with hyper-realistic decoy content
and embedded Canary Honeytokens:
- /.env (Exposed Environment Variables)
- /.git/config (Source Repository Exposure)
- /wp-login.php (WordPress Credential Harvester)
- /phpmyadmin/ (Database Admin Deception)
- /actuator/env (Spring Boot Microservice Configuration)
"""

from honeypot.canary import canary_engine

def get_decoy_env_file() -> str:
    """Generates an exposed .env file filled with trackable Canary Honeytokens."""
    aws_creds = canary_engine.generate_aws_key("Exposed /.env File")
    db_uri = canary_engine.generate_db_uri("Exposed /.env File")
    stripe_key = canary_engine.generate_api_key("Exposed /.env Stripe Token")
    jwt_secret = canary_engine.generate_jwt_token("env_secret")

    return f"""# Production Environment Configuration
APP_NAME="Enterprise Cloud Portal"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.internal-cloud.corp
APP_KEY={jwt_secret}

# Master Database Cluster
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=enterprise_prod
DB_USERNAME=guardian_db_admin
DATABASE_URL="{db_uri}"

# AWS S3 Storage & Backup Vault (Honeytoken Guarded)
AWS_ACCESS_KEY_ID={aws_creds['aws_access_key_id']}
AWS_SECRET_ACCESS_KEY={aws_creds['aws_secret_access_key']}
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=enterprise-production-backup-vault-2026

# Payment Gateway Tokens
STRIPE_SECRET_KEY={stripe_key}
STRIPE_WEBHOOK_SECRET=whsec_canary_88192837192837192837

# Redis Caching Cluster
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
"""

def get_decoy_git_config() -> str:
    """Generates a decoy .git/config file mimicking an exposed git repository."""
    return """[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
	ignorecase = true
[remote "origin"]
	url = https://github.com/internal-corp-security/enterprise-core-backend.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main
[user]
	name = Lead DevOps Engineer
	email = devops-admin@enterprise-cloud.corp
"""

def get_decoy_wordpress_login() -> str:
    """Returns authentic-looking WordPress login HTML with hidden canary fields."""
    return """<!DOCTYPE html>
<html lang="en-US">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
	<title>Log In &lsaquo; Corporate WordPress Portal &#8212; WordPress</title>
	<style type="text/css">
		body { background: #f0f0f1; color: #3c434a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; font-size: 14px; margin: 0; padding: 100px 0 0; text-align: center; }
		#login { width: 320px; margin: auto; padding: 24px; background: #fff; border: 1px solid #c3c4c7; box-shadow: 0 1px 3px rgba(0,0,0,.04); border-radius: 4px; text-align: left; }
		h1 a { background-image: url('https://s.w.org/style/images/about/WordPress-logotype-wmark.png'); background-size: 84px; height: 84px; width: 84px; display: block; margin: 0 auto 24px; text-indent: -9999px; }
		.input { width: 100%; border: 1px solid #8c8f94; padding: 6px 10px; font-size: 18px; margin: 6px 0 16px; box-sizing: border-box; }
		.button-primary { background: #2271b1; border-color: #2271b1; color: #fff; padding: 6px 14px; font-size: 14px; cursor: pointer; border-radius: 3px; font-weight: 600; width: 100%; }
		.button-primary:hover { background: #135e96; }
	</style>
</head>
<body>
<div id="login">
	<h1><a href="https://wordpress.org/">WordPress</a></h1>
	<form name="loginform" id="loginform" action="/wp-login.php" method="post">
		<p>
			<label for="user_login">Username or Email Address</label>
			<input type="text" name="log" id="user_login" class="input" value="" size="20" autofocus="autofocus" autocomplete="username" />
		</p>
		<p>
			<label for="user_pass">Password</label>
			<input type="password" name="pwd" id="user_pass" class="input" value="" size="20" autocomplete="current-password" />
		</p>
		<p class="submit">
			<input type="submit" name="wp-submit" id="wp-submit" class="button button-primary button-large" value="Log In" />
			<input type="hidden" name="canary_crumb" value="wp_auth_honeytoken_998127" />
		</p>
	</form>
</div>
</body>
</html>
"""

def get_decoy_actuator_env() -> dict:
    """Returns decoy Spring Boot Actuator /actuator/env response."""
    aws_creds = canary_engine.generate_aws_key("Spring Boot Actuator Leak")
    db_uri = canary_engine.generate_db_uri("Spring Boot Actuator Leak")

    return {
        "activeProfiles": ["production", "cloud"],
        "propertySources": [
            {
                "name": "systemEnvironment",
                "properties": {
                    "SPRING_DATASOURCE_URL": {"value": db_uri},
                    "AWS_ACCESS_KEY_ID": {"value": aws_creds['aws_access_key_id']},
                    "AWS_SECRET_ACCESS_KEY": {"value": "****** (masked)"},
                    "SERVER_PORT": {"value": "8080"}
                }
            }
        ]
    }
