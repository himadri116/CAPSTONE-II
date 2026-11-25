pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    environment {
        COMPOSE_DOCKER_CLI_BUILD = '1'
        DOCKER_BUILDKIT = '1'
        JWT_SECRET = credentials('bugsight-jwt-secret')
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out latest commit from GitHub repository...'
                checkout scm
            }
        }

        stage('Verify Docker Engine Connection') {
            steps {
                echo 'Checking Docker and Docker Compose inside Jenkins container...'
                sh '''
                    docker --version
                    if command -v docker-compose > /dev/null 2>&1; then
                        docker-compose --version
                    else
                        docker compose version
                    fi
                    docker ps
                '''
            }
        }

        stage('Verify Project Source') {
            steps {
                echo 'Verifying repository structure...'
                sh '''
                    test -f "backend/main.py" && echo "Backend: OK"
                    test -f "frontend/package.json" && echo "Frontend: OK"
                    test -f "server/server.js" && echo "Auth Server: OK"
                    test -f "docker-compose.yml" && echo "Compose Configuration: OK"
                '''
            }
        }

        stage('Prepare Environment & Build Images') {
            steps {
                echo 'Preparing environment and building BugSight services via Docker Compose...'
                withCredentials([
                    file(credentialsId: 'bugsight-localhost-cert', variable: 'TLS_CERT_FILE'),
                    file(credentialsId: 'bugsight-localhost-key', variable: 'TLS_KEY_FILE')
                ]) {
                    sh '''
                        set +x
                        test -s "$TLS_CERT_FILE"
                        test -s "$TLS_KEY_FILE"
                        install -m 0644 "$TLS_CERT_FILE" /tls_certs/localhost.pem
                        install -m 0600 "$TLS_KEY_FILE" /tls_certs/localhost-key.pem

                        if [ ! -f .env ]; then
                            if [ -f .env.example ]; then
                                echo "Generating .env from .env.example for CI build..."
                                cp .env.example .env
                            else
                                touch .env
                            fi
                        fi

                        if command -v docker-compose > /dev/null 2>&1; then
                            docker-compose -p capstone build frontend backend auth-server
                        else
                            docker compose -p capstone build frontend backend auth-server
                        fi
                    '''
                }
            }
        }

        stage('Deploy Application Containers') {
            steps {
                echo 'Starting BugSight application services...'
                sh '''
                    if command -v docker-compose > /dev/null 2>&1; then
                        docker-compose -p capstone up -d --remove-orphans mongo backend auth-server frontend
                    else
                        docker compose -p capstone up -d --remove-orphans mongo backend auth-server frontend
                    fi
                '''
            }
        }

        stage('Smoke Test Services') {
            steps {
                echo 'Checking running BugSight containers...'
                sh '''
                    sleep 5
                    if command -v docker-compose > /dev/null 2>&1; then
                        docker-compose -p capstone exec -T frontend nginx -t
                        docker-compose -p capstone exec -T backend python -c "import ssl, urllib.request; urllib.request.urlopen('https://frontend/', context=ssl._create_unverified_context(), timeout=10).read(1)"
                        docker-compose -p capstone ps
                    else
                        docker compose -p capstone exec -T frontend nginx -t
                        docker compose -p capstone exec -T backend python -c "import ssl, urllib.request; urllib.request.urlopen('https://frontend/', context=ssl._create_unverified_context(), timeout=10).read(1)"
                        docker compose -p capstone ps
                    fi
                '''
            }
        }

        stage('Selenium UI Tests') {
            steps {
                echo 'Running the authentication browser suite against an isolated Docker test stack...'
                sh '''
                    set -eu

                    compose() {
                        if command -v docker-compose > /dev/null 2>&1; then
                            docker-compose "$@"
                        else
                            docker compose "$@"
                        fi
                    }

                    export MONGODB_DATABASE=bugsight_selenium_test
                    export MONGO_HOST_PORT=27028
                    export BACKEND_HOST_PORT=18001
                    export AUTH_HOST_PORT=15000
                    export FRONTEND_HTTP_PORT=13000
                    export FRONTEND_HTTPS_PORT=18443

                    cleanup() {
                        status=$?
                        compose -f docker-compose.yml -f docker-compose.selenium.yml -p capstone-selenium down || echo "WARNING: Selenium test containers could not be fully stopped."
                        exit "$status"
                    }
                    trap cleanup EXIT

                    compose -f docker-compose.yml -f docker-compose.selenium.yml -p capstone-selenium up -d --build mongo backend auth-server frontend selenium-chrome
                    compose -f docker-compose.yml -f docker-compose.selenium.yml -p capstone-selenium run --build --rm selenium-tests
                '''
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution completed.'
        }
        success {
            echo 'CI/CD Pipeline passed successfully! BugSight is running.'
        }
        failure {
            echo 'CI/CD Pipeline encountered an error. Check logs above.'
        }
    }
}
