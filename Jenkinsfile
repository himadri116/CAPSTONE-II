// Requires Jenkins plugins: Docker Pipeline, SSH Agent, Credentials Binding.
// Credentials to create in Jenkins:
//   dockerhub-creds  (Username with password)
//   deploy-ssh-key   (SSH Username with private key)
//   deploy-host      (Secret text, e.g. ubuntu@1.2.3.4)
//   bugsight-env     (Secret file, the production .env)
pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds(); timeout(time: 30, unit: 'MINUTES') }
  environment {
    DOCKERHUB   = credentials('dockerhub-creds')
    IMAGE_PREFIX = "${DOCKERHUB_USR}"
    TAG         = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Lint & test') {
      parallel {
        stage('Server') {
          agent { docker { image 'node:20-alpine'; reuseNode true } }
          steps { dir('server') { sh 'npm install && npm run lint && npm test' } }
        }
        stage('Client') {
          agent { docker { image 'node:20-alpine'; reuseNode true } }
          steps { dir('client') { sh 'npm install && npm run lint' } }
        }
        stage('ML service') {
          agent { docker { image 'python:3.11-slim'; args '-u root'; reuseNode true } }
          steps {
            dir('ml-service') {
              sh 'pip install --no-cache-dir -r requirements.txt && python train.py --out model.pkl && pytest -q'
            }
          }
        }
      }
    }

    stage('Build images') {
      steps { sh 'docker compose build' }
    }

    stage('Push images') {
      when { branch 'main' }
      steps {
        sh 'echo "$DOCKERHUB_PSW" | docker login -u "$DOCKERHUB_USR" --password-stdin'
        sh 'docker compose push'
        sh 'TAG=latest docker compose build && TAG=latest docker compose push'
      }
    }

    stage('Deploy') {
      when { branch 'main' }
      steps {
        withCredentials([string(credentialsId: 'deploy-host', variable: 'HOST'),
                         file(credentialsId: 'bugsight-env', variable: 'ENV_FILE')]) {
          sshagent(['deploy-ssh-key']) {
            sh '''
              ssh -o StrictHostKeyChecking=accept-new "$HOST" "mkdir -p ~/bugsight"
              scp docker-compose.yml "$HOST":~/bugsight/docker-compose.yml
              scp "$ENV_FILE" "$HOST":~/bugsight/.env
              ssh "$HOST" "cd ~/bugsight && echo IMAGE_PREFIX=$IMAGE_PREFIX >> .env && echo TAG=$TAG >> .env && docker compose pull && docker compose up -d --remove-orphans && docker image prune -f"
            '''
          }
        }
      }
    }
  }

  post {
    always  { sh 'docker logout || true' }
    failure { echo 'Pipeline failed, check the stage logs above.' }
  }
}
