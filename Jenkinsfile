pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'kisaan-mitr'
        DOCKER_BUILDKIT = '1'
        DATABASE_URL = 'sqlite:///:memory:'
        SECRET_KEY = 'ci-test-secret-key-for-pipeline-only-ok'
        AGMARKNET_API_KEY = ''
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

        stage('Run Tests') {
            steps {
                echo 'Running test suite...'
                sh 'docker build -t kisaan-mitr-tests -f backend/Dockerfile backend/'
                sh """
                    docker run --rm \
                        --entrypoint sh \
                        -e DATABASE_URL="sqlite:///:memory:" \
                        -e SECRET_KEY="ci-test-secret-key-for-pipeline-only-ok" \
                        -e AGMARKNET_API_KEY="" \
                        -e DEBUG="false" \
                        -e BHASHINI_API_KEY="" \
                        -e GOOGLE_MAPS_API_KEY="" \
                        -e RAZORPAY_KEY_ID="" \
                        -e RAZORPAY_KEY_SECRET="" \
                        -e RAZORPAY_WEBHOOK_SECRET="" \
                        -v "\${WORKSPACE}/backend/tests:/app/tests" \
                        -v "\${WORKSPACE}/backend/pytest.ini:/app/pytest.ini" \
                        kisaan-mitr-tests \
                        -c 'pip install -q pytest pytest-asyncio pytest-cov && pytest tests/ -v --cov=app --cov-report=term-missing'
                """
            }
            post {
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
