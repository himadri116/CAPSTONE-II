pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    environment {
        COMPOSE_DOCKER_CLI_BUILD = '1'
        DOCKER_BUILDKIT = '1'
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

        stage('Build Docker Images') {
            steps {
                echo 'Building BugSight services via Docker Compose...'
                sh '''
                    if command -v docker-compose > /dev/null 2>&1; then
                        docker-compose build frontend backend auth-server
                    else
                        docker compose build frontend backend auth-server
                    fi
                '''
            }
        }

        stage('Deploy Application Containers') {
            steps {
                echo 'Starting BugSight application services...'
                sh '''
                    if command -v docker-compose > /dev/null 2>&1; then
                        docker-compose up -d mongo backend auth-server frontend
                    else
                        docker compose up -d mongo backend auth-server frontend
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
                        docker-compose ps
                    else
                        docker compose ps
                    fi
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
