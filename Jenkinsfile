pipeline {
    agent any
    tools {
        maven 'maven-3.9'        // Use the configured Maven installation
        nodejs 'node-18'         // Use the configured Node.js installation
    }
    environment {
        SONAR_HOME = tool "Sonar"
        SONAR_HOST_URL = 'http://43.205.122.223:9000'  // Replace with your SonarQube server URL
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

stage("Test") {
        parallel {
                stage('Backend Tests') {
    steps {
        dir("emp_backend") {
            sh '''
                mvn clean test
                mvn jacoco:report
            '''
            junit testResults: 'target/surefire-reports/**/*.xml', allowEmptyResults: true
        }
    }
 }
}
            stage("Frontend Tests") {
                    steps {
                        dir('employee frontend final') {
                            sh 'npm test -- --no-watch --code-coverage --browsers=ChromeHeadless'  
                        }
                    }
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
                -Dsonar.tests=emp_backend/src/test,employee\\ frontend\\ final/src \
                -Dsonar.test.inclusions=**/*.test.js,**/*.test.jsx,**/*.test.ts,**/*.test.tsx,**/src/test/**/*.java \
                -Dsonar.exclusions=**/node_modules/**,**/build/**,**/dist/**,**/target/** \
                -Dsonar.coverage.jacoco.xmlReportPaths=emp_backend/target/site/jacoco/jacoco.xml \
                -Dsonar.typescript.lcov.reportPaths=employee\\ frontend\\ final/coverage/lcov.info \
                -Dsonar.java.coveragePlugin=jacoco
            """
        }
    }
}

        stage("Quality Gate Check") {
            steps {
                script {
                    timeout(time: 10, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Quality Gate failed: ${qg.status}"
                        }
                        echo "Quality Gate passed successfully!"
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
