pipeline {
    agent any
    tools {
        maven 'maven-3.9'        // Use the configured Maven installation
        nodejs 'node-18'         // Use the configured Node.js installation
    }
    environment {
        SONAR_HOME = tool "Sonar"
        SONAR_HOST_URL = 'http://3.109.151.67:9000'  // Replace with your SonarQube server URL
    }
    stages {
        stage("Cloning from github") {
            steps {
                git url: "https://github.com/WHY-SHREYAS/emp_project.git", branch: "main"
            }
        }

        stage("Build") {
            steps {
                sh 'ls -la'  // Debug: List contents of the root workspace

                // Backend build
                dir('emp_backend') {
                    sh 'ls -la'        // Debug: List contents
                    sh 'mvn -version'  // Debug: Check Maven
                    sh 'mvn clean compile'  // Compile Java code
                }

                // Frontend build
                dir('employee frontend final') {
                    sh 'ls -la'
                    sh 'node --version'
                    sh 'npm --version'
                    sh 'npm cache clean --force'                   // Clean npm cache
                    sh 'rm -rf node_modules package-lock.json'    // Remove old dependencies
                    sh 'npm install'                              // Fresh install
                    sh 'npm audit fix || true'
                    sh 'CI=false npm run build'                   // Build frontend
                }
            }
        }

       stage("SonarQube Quality Analysis") {
            steps {
                withSonarQubeEnv("Sonar") {
                    sh """
                        $SONAR_HOME/bin/sonar-scanner \
                        -Dsonar.projectName=Employee-Management-System \
                        -Dsonar.projectKey=Employee-Management-System \
                        -Dsonar.java.binaries=emp_backend/target/classes \
                        -Dsonar.sources=emp_backend/src/main,employee\\ frontend\\ final/src \
                        -Dsonar.tests=employee\\ frontend\\ final/src \
                        -Dsonar.test.inclusions=**/*.test.js,**/*.test.jsx,**/*.test.ts,**/*.test.tsx \
                        -Dsonar.exclusions=**/node_modules/**,**/build/**,**/dist/**,**/target/**
                    """
                }
            }
        }
        
        stage("Quality Gate Check") {
            steps {
                script {
                    timeout(time: 10, unit: 'MINUTES') {
                        // This will automatically look for report-task.txt and wait for Quality Gate
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Quality Gate failed: ${qg.status}"
                        }
                        echo "Quality Gate passed successfully!"
                    }
                }
            }
        }

        stage("Test") {
            parallel {
                stage("Backend Tests") {
                    steps {
                        dir('emp_backend') {
                            sh 'mvn test'  // Runs JUnit tests and generates JaCoCo coverage
                        }
                    }
                }

                stage("Frontend Tests") {
                    steps {
                        dir('employee frontend final') {
                            sh 'npm test -- --coverage'  // Runs Jest tests with coverage
                        }
                    }
                }
            }
        }

        stage("Archive Test Results") {
            steps {
                junit 'springboot-backend/target/surefire-reports/*.xml'  // Archive JUnit reports
                archiveArtifacts artifacts: 'react-frontend/coverage/**', allowEmptyArchive: true  // Archive JS coverage
            }
        }

        stage("Deploy") {
            steps {
                echo "Deploy stage completed"
            }
        }
    }
}
