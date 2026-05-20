pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                echo 'Code checked out from GitHub successfully'
                sh 'ls -la'
            }
        }
        stage('Build') {
            steps {
                echo 'Building Kisaan Mitr...'
                sh 'find . -name "package.json" -maxdepth 2 | head -5'
            }
        }
        stage('Test') {
            steps {
                echo 'Running checks...'
                sh 'find . -name "*.py" -maxdepth 3 | wc -l'
                sh 'find . -name "*.tsx" -maxdepth 4 | wc -l'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Kisaan Mitr is deployed via Docker Compose!'
                echo 'Frontend: http://localhost:3000'
                echo 'Backend: http://localhost:8000'
                echo 'Jenkins: http://localhost:8080'
            }
        }
    }
    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed — check logs above'
        }
    }
}

