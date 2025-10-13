pipeline {
    agent any
    tools {
        maven 'Maven'  // Use the configured Maven installation
        nodejs 'NodeJS'  // Use the configured Node.js installation
    }
    environment {
        SONAR_HOME = tool "Sonar"
        SONAR_HOST_URL = 'http://13.53.172.28:9000'  // Replace with
your SonarQube server URL
    }
    stages {
        stage("Cloning from github") {
            steps {
                git url:
"https://github.com/Jayant0403/ReactJS-Spring-Boot-CRUD-Full-Stack-App",
branch: "master"
            }
        }
        stage("Build") {
            steps {
                sh 'ls -la'  // Debug: List contents of the root workspace
                // Backend build
                dir('springboot-backend') {
                    sh 'ls -la'  // Debug: List contents
                    sh 'mvn -version'  // Debug: Check Maven
                    sh 'mvn clean compile'  // Compile Java code
                }
                // Frontend build
                dir('react-frontend') {
                    sh 'ls -la'
                    sh 'node --version'
                    sh 'npm --version'
                    sh 'npm cache clean --force'   // 🧹 Clean npm cache
                    sh 'rm -rf node_modules package-lock.json'  // 🔄
Remove old deps
                    sh 'npm install'  // Fresh install
                    sh 'npm audit fix || true'
                    sh 'CI=false npm run build'  // Build
                }
            }
        }
        stage("SonarQube quality Analysis") {
            steps {
                withSonarQubeEnv("Sonar") {
                    sh """
                        $SONAR_HOME/bin/sonar-scanner \

-Dsonar.projectName=ReactJS-Spring-Boot-CRUD-Full-Stack-App \

-Dsonar.projectKey=ReactJS-Spring-Boot-CRUD-Full-Stack-App \

-Dsonar.java.binaries=springboot-backend/target/classes \

-Dsonar.sources=springboot-backend/src/main,springboot-backend/src/test,react-frontend/src
\
                        -Dsonar.tests=react-frontend/src \
                        -Dsonar.test.inclusions=**/*.test.js,**/*.test.jsx \

-Dsonar.exclusions=**/node_modules/**,**/build/**,**/dist/**
                    """
                }
            }
        }
        stage("Quality Gate Check") {
            steps {
                script {
                    timeout(time: 10, unit: 'MINUTES') {
                        withCredentials([string(credentialsId:
'Sonar', variable: 'SONAR_TOKEN')]) {
                            def qgStatus = sh(
                                script: """
                                    curl -s -f -u "\$SONAR_TOKEN:" \

'${SONAR_HOST_URL}/api/qualitygates/project_status?projectKey=ReactJS-Spring-Boot-CRUD-Full-Stack-App'
\
                                    | grep -o '"status":"[^"]*"' \
                                    | cut -d'"' -f4 || echo "ERROR"
                                """,
                                returnStdout: true
                            ).trim()
                            def firstStatus = qgStatus.readLines()[0]
                            echo "Quality Gate status: ${firstStatus}"
                            if (firstStatus == 'ERROR' || firstStatus != 'OK') {
                                error "Quality Gate failed: Coverage
or other metrics did not meet requirements"
                            }
                            echo "✅ Quality Gate passed for the project"
                        }
                    }
                }
            }
        }
        stage("Test") {
            parallel {
                stage("Backend Tests") {
                    steps {
                        dir('springboot-backend') {
                            sh 'mvn test'  // Runs JUnit tests and
generates JaCoCo coverage
                        }
                    }
                }
                stage("Frontend Tests") {
                    steps {
                        dir('react-frontend') {
                            sh 'npm test -- --coverage'  // Runs Jest
tests with coverage (if configured)
                        }
                    }
                }
            }
        }
        stage("Archive Test Results") {
            steps {
                junit
'springboot-backend/target/surefire-reports/*.xml'  // Archive JUnit
reports
                archiveArtifacts artifacts:
'react-frontend/coverage/**', allowEmptyArchive: true  // Archive JS
coverage

            }
        }
        stage("Deploy") {
            steps {
                echo "Deploy stage completed"
            }
        }
    }
}
