pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'kisaan-mitr'
        DOCKER_BUILDKIT = '1'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out latest code...'
                checkout scm
                sh 'git log --oneline -5'
            }
        }

        stage('Validate Environment') {
            steps {
                echo 'Validating required environment variables...'
                sh '''
                    test -f .env || { echo ".env file missing — copy from .env.example"; exit 1; }
                    grep -q "SECRET_KEY" .env || { echo "SECRET_KEY missing in .env"; exit 1; }
                    grep -q "AGMARKNET_API_KEY" .env || { echo "AGMARKNET_API_KEY missing in .env"; exit 1; }
                    echo "Environment validation passed"
                '''
            }
        }

        stage('Run Tests') {
            steps {
                echo 'Running test suite...'
                sh '''
                    docker compose --profile testing run --rm tests \
                        pytest tests/ -v \
                        --cov=app \
                        --cov-report=xml:/app/coverage.xml \
                        --cov-report=term-missing \
                        --junit-xml=/app/test-results.xml
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'backend/test-results.xml', allowEmptyArchive: true
                    junit allowEmptyResults: true, testResults: 'backend/test-results.xml'
                }
                failure {
                    echo 'Tests failed — stopping pipeline'
                }
            }
        }

        stage('Build Images') {
            when {
                branch 'main'
            }
            steps {
                echo 'Building Docker images...'
                sh 'docker compose build --no-cache backend frontend'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying services...'
                sh '''
                    docker compose up -d --remove-orphans
                    echo "Waiting for services to initialise..."
                    sleep 20
                '''
            }
        }

        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                echo 'Verifying deployment...'
                sh '''
                    curl -sf http://localhost:8000/health || \
                        { echo "Backend health check failed"; exit 1; }

                    curl -sf http://localhost:3000 > /dev/null || \
                        { echo "Frontend health check failed"; exit 1; }

                    echo "All services healthy"
                '''
            }
        }
    }

    post {
        success {
            echo """
            Pipeline SUCCESS
            Branch:  ${env.BRANCH_NAME}
            Build:   #${env.BUILD_NUMBER}
            Duration: ${currentBuild.durationString}
            """
        }
        failure {
            echo """
            Pipeline FAILED
            Branch:  ${env.BRANCH_NAME}
            Build:   #${env.BUILD_NUMBER}
            Stage:   ${env.STAGE_NAME}
            Logs:    ${env.BUILD_URL}
            """
        }
        always {
            echo 'Pipeline complete.'
        }
    }
}
